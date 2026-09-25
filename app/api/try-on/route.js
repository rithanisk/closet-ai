import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/src/server/auth';
import { recentLooks, tryOn, VIEWS } from '@/src/server/avatar';
import { assertDatabase, db } from '@/src/server/db';
import { apiError, assertSameOrigin, enforceRateLimit, jsonBody } from '@/src/server/http';

export const runtime = 'nodejs';
export const maxDuration = 300;

const schema = z.object({
  itemIds: z.array(z.string().uuid()).min(1).max(8),
  view: z.enum(VIEWS).default('front'),
});

/** Dress the user's avatar in one piece or a whole outfit. Repeated combinations come from cache. */
export async function POST(request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { itemIds, view } = await jsonBody(request, schema);
    const result = await tryOn(user.id, itemIds, view, async () => enforceRateLimit(user.id, 'try-on', 40, 60 * 60 * 1000));
    const { data: avatar, error } = await db().from('avatars').select('version').eq('user_id', user.id).maybeSingle();
    assertDatabase(error, 'Could not load avatar');
    return NextResponse.json({ ...result, looks: await recentLooks(user.id, Number(avatar?.version)) });
  } catch (error) { return apiError(error); }
}
