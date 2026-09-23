import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/src/server/auth';
import { assertDatabase, db } from '@/src/server/db';
import { apiError, assertSameOrigin, enforceRateLimit, HttpError } from '@/src/server/http';
import { generateTryOn } from '@/src/server/openai';
import { normalizeUpload, readStoredImage, saveImage } from '@/src/server/storage';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    await enforceRateLimit(user.id, 'try-on', 10, 60 * 60 * 1000);
    const formData = await request.formData();
    const photo = formData.get('photo');
    const personBuffer = await normalizeUpload(photo);
    let ids;
    try { ids = z.array(z.string().uuid()).min(2).max(8).parse(JSON.parse(formData.get('itemIds') || '[]')); }
    catch { throw new HttpError(400, 'Choose a valid outfit before creating a preview.'); }
    const { data: wardrobeRows, error: wardrobeError } = await db().from('wardrobe_items').select('id, image_id').eq('user_id', user.id).in('id', ids);
    assertDatabase(wardrobeError, 'Could not load outfit pieces');
    const imageIds = wardrobeRows.map((row) => row.image_id).filter(Boolean);
    const { data: imageRows, error: imageError } = await db().from('images').select('id, object_path, mime_type').eq('user_id', user.id).in('id', imageIds);
    assertDatabase(imageError, 'Could not load outfit images');
    const imagesById = new Map(imageRows.map((row) => [row.id, row]));
    const byId = new Map(wardrobeRows.map((row) => [row.id, imagesById.get(row.image_id)]).filter(([, image]) => image));
    if (byId.size !== new Set(ids).size) throw new HttpError(400, 'One or more outfit pieces are no longer available.');
    const garments = await Promise.all(ids.map(async (id) => {
      const row = byId.get(id);
      const extension = row.mime_type === 'image/png' ? 'png' : row.mime_type === 'image/jpeg' ? 'jpg' : 'webp';
      return { buffer: await readStoredImage(row.object_path), mimeType: row.mime_type, extension };
    }));
    const output = await generateTryOn({ personBuffer, personMime: 'image/jpeg', garments });
    const image = await saveImage(user.id, output, 'try-on', 'image/png');
    return NextResponse.json({ image: image.image });
  } catch (error) { return apiError(error); }
}
