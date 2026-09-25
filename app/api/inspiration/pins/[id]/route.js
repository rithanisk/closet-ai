import { NextResponse } from 'next/server';
import { requireUser } from '@/src/server/auth';
import { apiError, assertSameOrigin, HttpError } from '@/src/server/http';
import { deletePins, inspirationState, rebuildProfile } from '@/src/server/inspiration';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function DELETE(request, context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    const removed = await deletePins(user.id, { pinId: id });
    if (!removed) throw new HttpError(404, 'Inspiration image not found.');
    await rebuildProfile(user.id, user.styles);
    return NextResponse.json(await inspirationState(user.id));
  } catch (error) { return apiError(error); }
}
