import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { calculateMembershipEndDate, expireMemberships } from '@/lib/membership-dates';
import { validateMembershipAssignment } from '@/lib/membership-validation';
import connectDB from '@/lib/mongodb';
import Member from '@/models/Member';
import Membership, { MEMBERSHIP_STATUSES } from '@/models/Membership';
import MembershipPlan from '@/models/MembershipPlan';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

function memberLookup(value: string) {
  const normalized = value.trim();
  return mongoose.isObjectIdOrHexString(normalized)
    ? { $or: [{ _id: normalized }, { memberId: normalized.toUpperCase() }] }
    : { memberId: normalized.toUpperCase() };
}

export async function GET(request: NextRequest) {
  if (!(await authenticateApiRequest())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const pageValue = Number(request.nextUrl.searchParams.get('page') ?? 1);
    const limitValue = Number(request.nextUrl.searchParams.get('limit') ?? DEFAULT_LIMIT);
    if (
      !Number.isInteger(pageValue) ||
      pageValue < 1 ||
      !Number.isInteger(limitValue) ||
      limitValue < 1
    ) {
      return NextResponse.json(
        { error: 'Page and limit must be positive integers' },
        { status: 400 }
      );
    }

    const page = pageValue;
    const limit = Math.min(limitValue, MAX_LIMIT);
    const status = request.nextUrl.searchParams.get('status')?.trim();
    const memberValue = request.nextUrl.searchParams.get('member')?.trim();
    const planValue = request.nextUrl.searchParams.get('plan')?.trim();
    const search = request.nextUrl.searchParams.get('search')?.trim();

    if (status && !MEMBERSHIP_STATUSES.includes(status as 'active' | 'expired' | 'cancelled')) {
      return NextResponse.json(
        { error: 'Status must be active, expired, or cancelled' },
        { status: 400 }
      );
    }
    if (planValue && !mongoose.isObjectIdOrHexString(planValue)) {
      return NextResponse.json({ error: 'Plan filter must be a valid ID' }, { status: 400 });
    }

    await connectDB();
    await expireMemberships();

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (planValue) filter.plan = planValue;
    if (memberValue) {
      const member = await Member.findOne(memberLookup(memberValue)).select('_id').lean();
      if (!member) {
        return NextResponse.json({ memberships: [], page, limit, total: 0, totalPages: 0 });
      }
      filter.member = member._id;
    }
    if (search) {
      const pattern = new RegExp(escapeRegex(search), 'i');
      const [memberIds, planIds] = await Promise.all([
        Member.find({
          $or: [
            { memberId: pattern },
            { firstName: pattern },
            { lastName: pattern },
          ],
        }).distinct('_id'),
        MembershipPlan.find({
          $or: [{ name: pattern }, { description: pattern }],
        }).distinct('_id'),
      ]);
      filter.$or = [{ member: { $in: memberIds } }, { plan: { $in: planIds } }];
    }

    const [memberships, total] = await Promise.all([
      Membership.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('member', 'memberId firstName lastName')
        .populate('plan', 'name durationMonths')
        .populate('createdBy', 'name role')
        .lean(),
      Membership.countDocuments(filter),
    ]);

    return NextResponse.json({
      memberships,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error(
      'List memberships error:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return NextResponse.json({ error: 'Unable to retrieve memberships' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authenticatedUser = await authenticateApiRequest();
  if (!authenticatedUser) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const validation = validateMembershipAssignment(await request.json());
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    await connectDB();
    const member = await Member.findOne(memberLookup(validation.data.memberId)).select('_id').lean();
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    if (!mongoose.isObjectIdOrHexString(validation.data.planId)) {
      return NextResponse.json({ error: 'Membership plan not found' }, { status: 404 });
    }
    const plan = await MembershipPlan.findById(validation.data.planId)
      .select('durationMonths price status')
      .lean();
    if (!plan) return NextResponse.json({ error: 'Membership plan not found' }, { status: 404 });
    if (plan.status !== 'active') {
      return NextResponse.json(
        { error: 'Inactive membership plans cannot be assigned' },
        { status: 409 }
      );
    }

    await expireMemberships({ member: member._id });
    if (await Membership.exists({ member: member._id, status: 'active' })) {
      return NextResponse.json(
        { error: 'Member already has an active membership' },
        { status: 409 }
      );
    }

    const membership = await Membership.create({
      member: member._id,
      plan: plan._id,
      startDate: validation.data.startDate,
      endDate: calculateMembershipEndDate(validation.data.startDate, plan.durationMonths),
      priceAtPurchase: plan.price,
      status: 'active',
      notes: validation.data.notes,
      createdBy: authenticatedUser.userId,
    });
    await membership.populate([
      { path: 'member', select: 'memberId firstName lastName' },
      { path: 'plan', select: 'name durationMonths' },
      { path: 'createdBy', select: 'name role' },
    ]);

    return NextResponse.json({ success: true, membership }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    if (isDuplicateKeyError(error)) {
      return NextResponse.json(
        { error: 'Member already has an active membership' },
        { status: 409 }
      );
    }
    console.error(
      'Assign membership error:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return NextResponse.json({ error: 'Unable to assign membership' }, { status: 500 });
  }
}
