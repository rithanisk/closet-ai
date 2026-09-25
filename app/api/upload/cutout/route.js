import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { z } from 'zod';
import { requireUser } from '@/src/server/auth';
import { assertDatabase, db } from '@/src/server/db';
import { apiError, assertSameOrigin, enforceRateLimit, HttpError, jsonBody } from '@/src/server/http';
import { isolateGarment } from '@/src/server/openai';
import { deleteImage, getOwnedImage, prepareCutout, readStoredImage, saveImage } from '@/src/server/storage';
import { CATEGORIES } from '@/src/shared/wardrobe';

export const runtime = 'nodejs';
export const maxDuration = 300;

const schema = z.object({
  imageId: z.string().uuid(),
  wardrobeItemId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(80),
  category: z.enum(CATEGORIES),
  subcategory: z.string().trim().max(60).default(''),
  description: z.string().trim().max(1200).default(''),
  details: z.array(z.string().trim().max(60)).max(8).default([]),
});

/** Re-create a transparent cutout from a stored item image (a fallback crop or an older wardrobe photo). */
export async function POST(request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const input = await jsonBody(request, schema);
    await enforceRateLimit(user.id, 'cutout', 60, 60 * 60 * 1000);
    const image = await getOwnedImage(user.id, input.imageId);
    if (!image || !['pending-item', 'wardrobe-item'].includes(image.kind)) throw new HttpError(404, 'That item image is no longer available.');

    const reference = await sharp(await readStoredImage(image.object_path)).png().toBuffer();
    const cutout = await prepareCutout(await isolateGarment(reference, input));
    if (!cutout) throw new HttpError(422, 'A clean cutout could not be produced for this image. Try again or keep the photo crop.');
    const saved = await saveImage(user.id, cutout, image.kind, 'image/webp');

    if (input.wardrobeItemId) {
      const { data: updated, error } = await db().from('wardrobe_items')
        .update({ image_id: saved.id, cutout: true })
        .eq('id', input.wardrobeItemId).eq('user_id', user.id).eq('image_id', image.id)
        .select('id');
      assertDatabase(error, 'Could not update wardrobe image');
      if (!updated.length) {
        await deleteImage(user.id, saved.id);
        throw new HttpError(404, 'Wardrobe item not found.');
      }
    }
    await deleteImage(user.id, image.id);
    return NextResponse.json({ imageId: saved.id, image: saved.image, cutout: true });
  } catch (error) { return apiError(error); }
}
