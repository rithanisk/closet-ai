import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/src/server/auth';
import { assertDatabase, db } from '@/src/server/db';
import { apiError, assertSameOrigin, HttpError, jsonBody } from '@/src/server/http';
import { listWardrobe } from '@/src/server/repository';
import { deleteImage } from '@/src/server/storage';

const updateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  color: z.string().trim().min(1).max(50).optional(),
  formality: z.enum(['Casual', 'Smart casual', 'Dressy']).optional(),
  notes: z.string().trim().max(500).optional(),
  favorite: z.boolean().optional(),
  available: z.boolean().optional(),
});

export async function PATCH(request, context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    const input = await jsonBody(request, updateSchema);
    const database = db();
    const { data: item, error: itemError } = await database.from('wardrobe_items').select('*').eq('id', id).eq('user_id', user.id).maybeSingle();
    assertDatabase(itemError, 'Could not load wardrobe item');
    if (!item) throw new HttpError(404, 'Wardrobe item not found.');
    const { error } = await database.from('wardrobe_items').update({
      name: input.name ?? item.name, color: input.color ?? item.color, formality: input.formality ?? item.formality,
      notes: input.notes ?? item.notes, favorite: input.favorite ?? item.favorite, available: input.available ?? item.available,
    }).eq('id', id).eq('user_id', user.id);
    assertDatabase(error, 'Could not update wardrobe item');
    return NextResponse.json({ items: await listWardrobe(user.id) });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request, context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    const database = db();
    const { data: item, error: itemError } = await database.from('wardrobe_items').select('*').eq('id', id).eq('user_id', user.id).maybeSingle();
    assertDatabase(itemError, 'Could not load wardrobe item');
    if (!item) throw new HttpError(404, 'Wardrobe item not found.');
    const { error } = await database.from('wardrobe_items').delete().eq('id', id).eq('user_id', user.id);
    assertDatabase(error, 'Could not delete wardrobe item');
    if (item.image_id) await deleteImage(user.id, item.image_id);
    return NextResponse.json({ items: await listWardrobe(user.id) });
  } catch (error) { return apiError(error); }
}
