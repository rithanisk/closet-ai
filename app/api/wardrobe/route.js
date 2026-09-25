import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/src/server/auth';
import { assertDatabase, db } from '@/src/server/db';
import { apiError, assertSameOrigin, HttpError, jsonBody } from '@/src/server/http';
import { listWardrobe } from '@/src/server/repository';
import { garmentColumns, garmentFields } from '@/src/server/schemas';
import { deleteImage } from '@/src/server/storage';

const itemSchema = z.object({
  imageId: z.string().uuid(),
  cutout: z.boolean().default(false),
  ...garmentFields,
  secondaryColor: garmentFields.secondaryColor.default(''),
  subcategory: garmentFields.subcategory.default(''),
  pattern: garmentFields.pattern.default(''),
  material: garmentFields.material.default(''),
  formality: garmentFields.formality.default('Casual'),
  season: garmentFields.season.default('All seasons'),
  warmth: garmentFields.warmth.default(''),
  fit: garmentFields.fit.default(''),
  brand: garmentFields.brand.default(''),
  description: garmentFields.description.default(''),
  styleTags: garmentFields.styleTags.default([]),
  details: garmentFields.details.default([]),
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
    const rows = items.map(({ imageId, cutout, ...fields }, index) => ({
      ...garmentColumns(fields),
      id: crypto.randomUUID(), user_id: user.id, image_id: imageId, cutout,
      notes: '', favorite: false, available: true, worn: 0, added_at: Date.now() + index,
    }));
    const { error: insertError } = await database.from('wardrobe_items').insert(rows);
    assertDatabase(insertError, 'Could not add wardrobe items');
    const { error: updateError } = await database.from('images').update({ kind: 'wardrobe-item' }).eq('user_id', user.id).in('id', imageIds);
    assertDatabase(updateError, 'Could not finalize wardrobe images');
    await Promise.all(discardedImageIds.map((imageId) => deleteImage(user.id, imageId)));
    return NextResponse.json({ items: await listWardrobe(user.id) }, { status: 201 });
  } catch (error) { return apiError(error); }
}
