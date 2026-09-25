import { NextResponse } from 'next/server';
import { requireUser } from '@/src/server/auth';
import { completeAvatarViews } from '@/src/server/avatar';
import { apiError, assertSameOrigin, enforceRateLimit } from '@/src/server/http';

export const runtime = 'nodejs';
export const maxDuration = 300;

/** Render the side and back views after the front view is ready. */
export async function POST(request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    await enforceRateLimit(user.id, 'avatar-views', 6, 60 * 60 * 1000);
    return NextResponse.json(await completeAvatarViews(user.id));
  } catch (error) { return apiError(error); }
}
