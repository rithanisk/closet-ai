import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/src/server/auth';
import { assertDatabase, db } from '@/src/server/db';
import { apiError, assertSameOrigin, HttpError, jsonBody } from '@/src/server/http';
import { listWardrobe } from '@/src/server/repository';
import { garmentColumns, garmentFields } from '@/src/server/schemas';
import { deleteImage } from '@/src/server/storage';

const updateSchema = z.object({
  ...garmentFields,
  notes: z.string().trim().max(500),
  favorite: z.boolean(),
  available: z.boolean(),
}).partial();

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
    const changes = garmentColumns(input);
    if (!Object.keys(changes).length) return NextResponse.json({ items: await listWardrobe(user.id) });
    const { error } = await database.from('wardrobe_items').update(changes).eq('id', id).eq('user_id', user.id);
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
