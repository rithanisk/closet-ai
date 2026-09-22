import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/src/server/auth';
import { db } from '@/src/server/db';
import { apiError, assertSameOrigin, HttpError, jsonBody } from '@/src/server/http';
import { listOutfits } from '@/src/server/repository';

export async function PATCH(request, context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    const { worn } = await jsonBody(request, z.object({ worn: z.boolean() }));
    const result = db.prepare('UPDATE outfits SET worn = ? WHERE id = ? AND user_id = ?').run(Number(worn), id, user.id);
    if (!result.changes) throw new HttpError(404, 'Saved outfit not found.');
    return NextResponse.json({ outfits: listOutfits(user.id) });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request, context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    const result = db.prepare('DELETE FROM outfits WHERE id = ? AND user_id = ?').run(id, user.id);
    if (!result.changes) throw new HttpError(404, 'Saved outfit not found.');
    return NextResponse.json({ outfits: listOutfits(user.id) });
  } catch (error) { return apiError(error); }
}
