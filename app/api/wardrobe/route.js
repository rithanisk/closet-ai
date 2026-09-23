import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/src/server/auth';
import { assertDatabase, db } from '@/src/server/db';
import { apiError, assertSameOrigin, HttpError, jsonBody } from '@/src/server/http';
import { listWardrobe } from '@/src/server/repository';
import { deleteImage } from '@/src/server/storage';

const itemSchema = z.object({
  imageId: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
  category: z.enum(['Tops', 'Bottoms', 'Skirts', 'Dresses', 'Shoes', 'Outerwear', 'Accessories', 'Bags']),
  color: z.string().trim().min(1).max(50),
  pattern: z.string().trim().max(50).default(''),
  material: z.string().trim().max(50).default(''),
  formality: z.enum(['Casual', 'Smart casual', 'Dressy']).default('Casual'),
  season: z.string().trim().min(1).max(50).default('All seasons'),
});

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ items: await listWardrobe(user.id) });
  } catch (error) { return apiError(error); }
}

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { items, discardedImageIds } = await jsonBody(request, z.object({
      items: z.array(itemSchema).min(1).max(100),
      discardedImageIds: z.array(z.string().uuid()).max(100).default([]),
    }));
    const database = db();
    const imageIds = items.map((item) => item.imageId);
    const { data: ownedImages, error: imageError } = await database.from('images').select('id').eq('user_id', user.id).in('id', imageIds);
    assertDatabase(imageError, 'Could not verify extracted images');
    if (ownedImages.length !== new Set(imageIds).size) throw new HttpError(400, 'One of the extracted images is no longer available.');
    const rows = items.map((item, index) => ({
      id: crypto.randomUUID(), user_id: user.id, image_id: item.imageId, name: item.name, category: item.category,
      color: item.color, pattern: item.pattern, material: item.material, formality: item.formality,
      season: item.season, notes: '', favorite: false, available: true, worn: 0, added_at: Date.now() + index,
    }));
    const { error: insertError } = await database.from('wardrobe_items').insert(rows);
    assertDatabase(insertError, 'Could not add wardrobe items');
    const { error: updateError } = await database.from('images').update({ kind: 'wardrobe-item' }).eq('user_id', user.id).in('id', imageIds);
    assertDatabase(updateError, 'Could not finalize wardrobe images');
    await Promise.all(discardedImageIds.map((imageId) => deleteImage(user.id, imageId)));
    return NextResponse.json({ items: await listWardrobe(user.id) }, { status: 201 });
  } catch (error) { return apiError(error); }
}
