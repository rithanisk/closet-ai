import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/src/server/auth';
import { assertDatabase, db } from '@/src/server/db';
import { apiError, assertSameOrigin, enforceRateLimit, HttpError, jsonBody } from '@/src/server/http';
import { deletePins, insertPins, inspirationState, rebuildProfile } from '@/src/server/inspiration';
import { analyzeBoard } from '@/src/server/inspiration-import';
import { resolveBoard } from '@/src/server/pinterest';

export const runtime = 'nodejs';
export const maxDuration = 300;

async function ownedSource(userId, id) {
  const { data, error } = await db().from('inspiration_sources').select('*').eq('id', id).eq('user_id', userId).maybeSingle();
  assertDatabase(error, 'Could not load inspiration source');
  if (!data) throw new HttpError(404, 'Inspiration source not found.');
  return data;
}

/** Refresh a Pinterest board: re-import its current pins, replacing the previous set. */
export async function POST(request, context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    const source = await ownedSource(user.id, id);
    if (source.kind !== 'pinterest') throw new HttpError(400, 'Only Pinterest boards can be refreshed.');
    await enforceRateLimit(user.id, 'inspiration', 20, 60 * 60 * 1000);
    const board = await resolveBoard(source.url);
    const pins = await analyzeBoard(board.rssUrl);
    await deletePins(user.id, { sourceId: source.id });
    await insertPins(user.id, source.id, pins);
    const { error } = await db().from('inspiration_sources').update({ synced_at: Date.now() }).eq('id', source.id).eq('user_id', user.id);
    assertDatabase(error, 'Could not update board');
    await rebuildProfile(user.id, user.styles);
    return NextResponse.json(await inspirationState(user.id));
  } catch (error) { return apiError(error); }
}

/** Pause or resume a source's influence on the profile. */
export async function PATCH(request, context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    const { enabled } = await jsonBody(request, z.object({ enabled: z.boolean() }));
    await ownedSource(user.id, id);
    const { error } = await db().from('inspiration_sources').update({ enabled }).eq('id', id).eq('user_id', user.id);
    assertDatabase(error, 'Could not update inspiration source');
    await rebuildProfile(user.id, user.styles);
    return NextResponse.json(await inspirationState(user.id));
  } catch (error) { return apiError(error); }
}

/** Disconnect a source and delete everything derived from it. */
export async function DELETE(request, context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    await ownedSource(user.id, id);
    await deletePins(user.id, { sourceId: id });
    const { error } = await db().from('inspiration_sources').delete().eq('id', id).eq('user_id', user.id);
    assertDatabase(error, 'Could not delete inspiration source');
    await rebuildProfile(user.id, user.styles);
    return NextResponse.json(await inspirationState(user.id));
  } catch (error) { return apiError(error); }
}
