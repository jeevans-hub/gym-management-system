import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import {
  escapeReportRegex,
  parseEnumFilter,
  parseReportPagination,
  parseReportSearch,
  reportPaginationResponse,
} from '@/lib/report-query';
import connectDB from '@/lib/mongodb';
import Trainer, { TRAINER_STATUSES, type TrainerStatus } from '@/models/Trainer';

const MAX_SPECIALIZATION_LENGTH = 100;

export async function GET(request: NextRequest) {
  if (!(await authenticateApiRequest())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const pagination = parseReportPagination(params);
  if (!pagination.success) return NextResponse.json({ error: pagination.error }, { status: 400 });
  const search = parseReportSearch(params);
  if (!search.success) return NextResponse.json({ error: search.error }, { status: 400 });
  const status = parseEnumFilter(params, 'status', TRAINER_STATUSES);
  if (!status.success) return NextResponse.json({ error: status.error }, { status: 400 });
  const specialization = params.get('specialization')?.trim();
  if (specialization && specialization.length > MAX_SPECIALIZATION_LENGTH) {
    return NextResponse.json(
      { error: `Specialization cannot exceed ${MAX_SPECIALIZATION_LENGTH} characters` },
      { status: 400 }
    );
  }

  try {
    await connectDB();
    const { page, limit } = pagination.data;
    const match: Record<string, unknown> = {};
    if (status.data) match.status = status.data as TrainerStatus;
    if (specialization) {
      match.specialization = new RegExp(`^${escapeReportRegex(specialization)}$`, 'i');
    }
    if (search.data) {
      const pattern = new RegExp(escapeReportRegex(search.data), 'i');
      match.$or = [
        'trainerId',
        'firstName',
        'lastName',
        'phone',
        'email',
        'specialization',
      ].map((field) => ({ [field]: pattern }));
    }

    const [result] = await Trainer.aggregate([
      { $match: match },
      {
        $facet: {
          rows: [
            { $sort: { joiningDate: -1, _id: -1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit },
            {
              $project: {
                _id: 0,
                trainerId: 1,
                name: { $trim: { input: { $concat: ['$firstName', ' ', '$lastName'] } } },
                phone: 1,
                email: 1,
                specialization: 1,
                experienceYears: 1,
                joiningDate: 1,
                status: 1,
              },
            },
          ],
          metadata: [{ $count: 'total' }],
          summary: [
            {
              $group: {
                _id: null,
                active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
                inactive: { $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] } },
              },
            },
            { $project: { _id: 0 } },
          ],
        },
      },
    ]);

    const total = result?.metadata?.[0]?.total ?? 0;
    return NextResponse.json({
      rows: result?.rows ?? [],
      ...reportPaginationResponse(page, limit, total),
      summary: { total, ...(result?.summary?.[0] ?? { active: 0, inactive: 0 }) },
    });
  } catch (error) {
    console.error('Trainer report error:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ error: 'Unable to generate trainer report' }, { status: 500 });
  }
}
