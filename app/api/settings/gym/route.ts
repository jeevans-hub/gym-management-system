import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdminApiRequest } from '@/lib/admin-auth';
import { authenticateApiRequest } from '@/lib/api-auth';
import { validateGymSettingsInput } from '@/lib/gym-settings-validation';
import connectDB from '@/lib/mongodb';
import GymSettings, { GYM_SETTINGS_ID, type IGymSettings } from '@/models/GymSettings';

const DEFAULT_SETTINGS = {
  gymName: 'Gym Management System',
  logo: '',
  address: '',
  phone: '',
  email: '',
  currency: 'INR' as const,
  timezone: 'Asia/Kolkata' as const,
  openingTime: '06:00',
  closingTime: '22:00',
  membershipExpiryWarningDays: 7,
};

function toSafeSettings(settings: IGymSettings) {
  return {
    gymName: settings.gymName,
    logo: settings.logo ?? '',
    address: settings.address ?? '',
    phone: settings.phone ?? '',
    email: settings.email ?? '',
    currency: settings.currency,
    timezone: settings.timezone,
    openingTime: settings.openingTime,
    closingTime: settings.closingTime,
    membershipExpiryWarningDays: settings.membershipExpiryWarningDays,
    createdAt: settings.createdAt,
    updatedAt: settings.updatedAt,
  };
}

export async function GET() {
  if (!(await authenticateApiRequest())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    await connectDB();
    const settings = await GymSettings.findById(GYM_SETTINGS_ID).lean();
    return NextResponse.json({ settings: settings ? toSafeSettings(settings) : DEFAULT_SETTINGS });
  } catch (error: unknown) {
    console.error('Get gym settings error:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ error: 'Unable to retrieve gym settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authorization = await authorizeAdminApiRequest();
  if (!authorization.authorized) return authorization.response;

  try {
    const validation = validateGymSettingsInput(await request.json());
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    await connectDB();
    const settings = await GymSettings.findByIdAndUpdate(
      GYM_SETTINGS_ID,
      {
        $set: { ...validation.data, updatedBy: authorization.user.userId },
        $setOnInsert: { _id: GYM_SETTINGS_ID },
      },
      {
        upsert: true,
        returnDocument: 'after',
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );
    return NextResponse.json({ success: true, settings: toSafeSettings(settings) });
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    console.error('Update gym settings error:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ error: 'Unable to update gym settings' }, { status: 500 });
  }
}
