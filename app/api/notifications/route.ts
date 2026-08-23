import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { validateNotificationInput } from '@/lib/notification-validation';
import Notification, { NOTIFICATION_PRIORITIES, NOTIFICATION_TYPES } from '@/models/Notification';
type NotificationFilter = NonNullable<Parameters<typeof Notification.find>[0]>;

const MAX_LIMIT = 100;
function escapeRegex(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function visibility(user: { userId: string; role: string }) {
  return { $or: [
    { recipientUser: user.userId },
    { recipientRole: user.role },
    { recipientUser: { $exists: false }, recipientRole: { $exists: false } },
  ] };
}

export async function GET(request: NextRequest) {
  const user = await authenticateApiRequest();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  try {
    const page = Number(request.nextUrl.searchParams.get('page') ?? 1);
    const requestedLimit = Number(request.nextUrl.searchParams.get('limit') ?? 10);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(requestedLimit) || requestedLimit < 1) {
      return NextResponse.json({ error: 'Page and limit must be positive integers' }, { status: 400 });
    }
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const filter: Record<string, unknown> = visibility(user) as Record<string, unknown>;
    const search = request.nextUrl.searchParams.get('search')?.trim();
    const type = request.nextUrl.searchParams.get('type')?.trim();
    const priority = request.nextUrl.searchParams.get('priority')?.trim();
    const isRead = request.nextUrl.searchParams.get('isRead')?.trim();
    if (type && !NOTIFICATION_TYPES.includes(type as (typeof NOTIFICATION_TYPES)[number])) return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 });
    if (priority && !NOTIFICATION_PRIORITIES.includes(priority as (typeof NOTIFICATION_PRIORITIES)[number])) return NextResponse.json({ error: 'Invalid notification priority' }, { status: 400 });
    if (isRead !== undefined && isRead !== null && isRead !== '') {
      if (isRead !== 'true' && isRead !== 'false') return NextResponse.json({ error: 'isRead must be true or false' }, { status: 400 });
      filter.isRead = isRead === 'true';
    }
    if (type) filter.type = type;
    if (priority) filter.priority = priority;
    if (search) filter.$and = [visibility(user), { $or: [{ title: new RegExp(escapeRegex(search), 'i') }, { message: new RegExp(escapeRegex(search), 'i') }, { category: new RegExp(escapeRegex(search), 'i') }] }];
    await connectDB();
    const [notifications, total] = await Promise.all([
      Notification.find(filter as unknown as NotificationFilter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Notification.countDocuments(filter as unknown as NotificationFilter),
    ]);
    return NextResponse.json({ notifications, page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('List notifications error:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ error: 'Unable to retrieve notifications' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await authenticateApiRequest())) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  try {
    const validation = validateNotificationInput(await request.json());
    if (!validation.success) return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
    await connectDB();
    const notification = await Notification.create(validation.data);
    return NextResponse.json({ success: true, notification }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    console.error('Create notification error:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ error: 'Unable to create notification' }, { status: 500 });
  }
}
