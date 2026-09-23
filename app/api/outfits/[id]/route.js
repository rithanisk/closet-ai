import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/src/server/auth';
import { assertDatabase, db } from '@/src/server/db';
import { apiError, assertSameOrigin, HttpError, jsonBody } from '@/src/server/http';
import { listOutfits } from '@/src/server/repository';

export async function PATCH(request, context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    const { worn } = await jsonBody(request, z.object({ worn: z.boolean() }));
    const { data: updated, error } = await db().from('outfits').update({ worn }).eq('id', id).eq('user_id', user.id).select('id');
    assertDatabase(error, 'Could not update saved outfit');
    if (!updated.length) throw new HttpError(404, 'Saved outfit not found.');
    return NextResponse.json({ outfits: await listOutfits(user.id) });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request, context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    const { data: deleted, error } = await db().from('outfits').delete().eq('id', id).eq('user_id', user.id).select('id');
    assertDatabase(error, 'Could not delete saved outfit');
    if (!deleted.length) throw new HttpError(404, 'Saved outfit not found.');
    return NextResponse.json({ outfits: await listOutfits(user.id) });
  } catch (error) { return apiError(error); }
}
