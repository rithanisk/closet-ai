import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/src/server/auth';
import { assertDatabase, db } from '@/src/server/db';
import { listSuggestions } from '@/src/server/gaps';
import { apiError, assertSameOrigin, HttpError, jsonBody } from '@/src/server/http';
import { SUGGESTION_STATUSES } from '@/src/shared/wardrobe';

/** Record feedback: dismissed (with optional reason), already owned, wishlisted, or purchased. */
export async function PATCH(request, context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    const input = await jsonBody(request, z.object({ status: z.enum(SUGGESTION_STATUSES), feedback: z.string().trim().max(300).optional() }));
    const { data, error } = await db().from('shopping_suggestions')
      .update({ status: input.status, ...(input.feedback !== undefined ? { feedback: input.feedback } : {}), updated_at: Date.now() })
      .eq('id', id).eq('user_id', user.id).select('id');
    assertDatabase(error, 'Could not update suggestion');
    if (!data.length) throw new HttpError(404, 'Suggestion not found.');
    return NextResponse.json({ suggestions: await listSuggestions(user.id) });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request, context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    const { data, error } = await db().from('shopping_suggestions').delete().eq('id', id).eq('user_id', user.id).select('id');
    assertDatabase(error, 'Could not delete suggestion');
    if (!data.length) throw new HttpError(404, 'Suggestion not found.');
    return NextResponse.json({ suggestions: await listSuggestions(user.id) });
  } catch (error) { return apiError(error); }
}
