import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { expireMemberships } from '@/lib/membership-dates';
import connectDB from '@/lib/mongodb';
import Member from '@/models/Member';
import Membership from '@/models/Membership';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

function memberLookup(id: string) {
  const value = id.trim();
  return mongoose.isObjectIdOrHexString(value)
    ? { $or: [{ _id: value }, { memberId: value.toUpperCase() }] }
    : { memberId: value.toUpperCase() };
}

function historyQuery(memberId: mongoose.Types.ObjectId) {
  return Membership.find({ member: memberId })
    .sort({ createdAt: -1 })
    .populate('member', 'memberId firstName lastName')
    .populate('plan', 'name durationMonths')
    .populate('createdBy', 'name role');
}

function currentMembershipQuery(memberId: mongoose.Types.ObjectId) {
  return Membership.findOne({ member: memberId, status: 'active' })
    .populate('member', 'memberId firstName lastName')
    .populate('plan', 'name durationMonths')
    .populate('createdBy', 'name role');
}

export async function GET(
  request: NextRequest,
  context: RouteContext<'/api/members/[id]/memberships'>
) {
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
    const { id } = await context.params;

    await connectDB();
    const member = await Member.findOne(memberLookup(id))
      .select('memberId firstName lastName')
      .lean();
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    await expireMemberships({ member: member._id });
    const [memberships, currentMembership, total] = await Promise.all([
      historyQuery(member._id)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      currentMembershipQuery(member._id).lean(),
      Membership.countDocuments({ member: member._id }),
    ]);

    return NextResponse.json({
      member,
      currentMembership,
      memberships,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error(
      'Get member memberships error:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return NextResponse.json({ error: 'Unable to retrieve member memberships' }, { status: 500 });
  }
}
