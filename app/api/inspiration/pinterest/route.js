import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/src/server/auth';
import { assertDatabase, db } from '@/src/server/db';
import { apiError, assertSameOrigin, enforceRateLimit, HttpError, jsonBody } from '@/src/server/http';
import { createSource, insertPins, inspirationState, rebuildProfile } from '@/src/server/inspiration';
import { analyzeBoard } from '@/src/server/inspiration-import';
import { resolveBoard } from '@/src/server/pinterest';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { url } = await jsonBody(request, z.object({ url: z.string().trim().min(8).max(500) }));
    await enforceRateLimit(user.id, 'inspiration', 20, 60 * 60 * 1000);
    const board = await resolveBoard(url);
    const { data: existing, error } = await db().from('inspiration_sources').select('id').eq('user_id', user.id).eq('kind', 'pinterest').eq('url', board.boardUrl).maybeSingle();
    assertDatabase(error, 'Could not check connected boards');
    if (existing) throw new HttpError(409, 'That board is already connected. Use refresh to pull in new pins.');
    const pins = await analyzeBoard(board.rssUrl);
    const source = await createSource(user.id, { kind: 'pinterest', label: board.label, url: board.boardUrl });
    await insertPins(user.id, source.id, pins);
    await rebuildProfile(user.id, user.styles);
    return NextResponse.json(await inspirationState(user.id), { status: 201 });
  } catch (error) { return apiError(error); }
}
