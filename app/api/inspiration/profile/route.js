import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/src/server/auth';
import { apiError, assertSameOrigin, enforceRateLimit, HttpError, jsonBody } from '@/src/server/http';
import { assertDatabase, db } from '@/src/server/db';
import { deletePins, inspirationState, profileInput, rebuildProfile, saveProfile } from '@/src/server/inspiration';

export const runtime = 'nodejs';
export const maxDuration = 120;

/** Save the user's manual corrections. Corrections are respected by later rebuilds. */
export async function PUT(request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { profile } = await jsonBody(request, z.object({ profile: profileInput }));
    const current = (await inspirationState(user.id)).profile || {};
    await saveProfile(user.id, { ...current, ...profile, edited: true });
    return NextResponse.json(await inspirationState(user.id));
  } catch (error) { return apiError(error); }
}

/** Re-run synthesis from the current inspiration sources. `reset` discards manual corrections first. */
export async function POST(request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { reset } = await jsonBody(request, z.object({ reset: z.boolean().default(false) }));
    await enforceRateLimit(user.id, 'inspiration', 20, 60 * 60 * 1000);
    const state = await inspirationState(user.id);
    if (!state.pins.length) throw new HttpError(422, 'Add inspiration images or a Pinterest board first.');
    if (reset && state.profile) await saveProfile(user.id, { ...state.profile, edited: false });
    await rebuildProfile(user.id, user.styles);
    return NextResponse.json(await inspirationState(user.id));
  } catch (error) { return apiError(error); }
}

/** Delete all inspiration data: every source, stored image, extracted signal, and the profile itself. */
export async function DELETE(request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { data: sources, error } = await db().from('inspiration_sources').select('id').eq('user_id', user.id);
    assertDatabase(error, 'Could not load inspiration sources');
    for (const source of sources) await deletePins(user.id, { sourceId: source.id });
    const { error: deleteError } = await db().from('inspiration_sources').delete().eq('user_id', user.id);
    assertDatabase(deleteError, 'Could not delete inspiration sources');
    await saveProfile(user.id, null);
    return NextResponse.json(await inspirationState(user.id));
  } catch (error) { return apiError(error); }
}
