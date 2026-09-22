import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/src/server/auth';
import { db } from '@/src/server/db';
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
    const item = db.prepare('SELECT * FROM wardrobe_items WHERE id = ? AND user_id = ?').get(id, user.id);
    if (!item) throw new HttpError(404, 'Wardrobe item not found.');
    db.prepare('UPDATE wardrobe_items SET name = ?, color = ?, formality = ?, notes = ?, favorite = ?, available = ? WHERE id = ? AND user_id = ?')
      .run(input.name ?? item.name, input.color ?? item.color, input.formality ?? item.formality, input.notes ?? item.notes, input.favorite === undefined ? item.favorite : Number(input.favorite), input.available === undefined ? item.available : Number(input.available), id, user.id);
    return NextResponse.json({ items: listWardrobe(user.id) });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request, context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    const item = db.prepare('SELECT * FROM wardrobe_items WHERE id = ? AND user_id = ?').get(id, user.id);
    if (!item) throw new HttpError(404, 'Wardrobe item not found.');
    db.prepare('DELETE FROM wardrobe_items WHERE id = ? AND user_id = ?').run(id, user.id);
    if (item.image_id) await deleteImage(user.id, item.image_id);
    return NextResponse.json({ items: listWardrobe(user.id) });
  } catch (error) { return apiError(error); }
}
