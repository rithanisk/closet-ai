import { NextResponse } from 'next/server';
import { requireUser } from '@/src/server/auth';
import { avatarState, createAvatar, deleteAvatar } from '@/src/server/avatar';
import { apiError, assertSameOrigin, enforceRateLimit, HttpError } from '@/src/server/http';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json(await avatarState(user.id));
  } catch (error) { return apiError(error); }
}

/** Create (or replace) the photoreal twin from 1-4 photos of the user. */
export async function POST(request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    await enforceRateLimit(user.id, 'avatar', 6, 60 * 60 * 1000);
    const formData = await request.formData();
    if (formData.get('consent') !== 'true') throw new HttpError(400, 'Please confirm these are photos of you and that you consent to AI processing.');
    const files = formData.getAll('photos').filter((file) => file instanceof File);
    const notes = String(formData.get('notes') || '').trim().slice(0, 300);
    return NextResponse.json(await createAvatar(user.id, files, notes), { status: 201 });
  } catch (error) { return apiError(error); }
}

/** Delete the avatar, the stored reference photos, and every try-on render. */
export async function DELETE(request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    await deleteAvatar(user.id);
    return NextResponse.json({ avatar: null, looks: [] });
  } catch (error) { return apiError(error); }
}
