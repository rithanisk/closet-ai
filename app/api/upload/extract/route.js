import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { requireUser } from '@/src/server/auth';
import { mapLimit } from '@/src/server/concurrency';
import { assertDatabase, db } from '@/src/server/db';
import { apiError, assertSameOrigin, enforceRateLimit, HttpError } from '@/src/server/http';
import { extractGarments, isolateGarment } from '@/src/server/openai';
import { cropAndSave, cropForIsolation, deleteImage, normalizeUpload, prepareCutout, saveCutout } from '@/src/server/storage';

export const runtime = 'nodejs';
export const maxDuration = 300;

const concurrency = () => Math.max(1, Math.min(8, Number(process.env.CUTOUT_CONCURRENCY) || 4));

async function storeItemImage(userId, normalized, item) {
  if (process.env.OPENAI_CUTOUTS !== 'false') {
    try {
      const reference = await cropForIsolation(normalized, item.bbox);
      const cutout = await prepareCutout(await isolateGarment(reference, item));
      if (cutout) return { ...(await saveCutout(userId, cutout)), cutout: true };
    } catch (error) {
      console.error(`Cutout failed for "${item.name}"`, error?.message || error);
    }
  }
  // Fall back to a framed crop so the item is never lost; the user can retry the cutout later.
  return { ...(await cropAndSave(userId, normalized, item.bbox)), cutout: false };
}

const norm = (value) => String(value || '').trim().toLowerCase();

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    await enforceRateLimit(user.id, 'extract', 40, 60 * 60 * 1000);
    const formData = await request.formData();
    const file = formData.get('file');
    const normalized = await normalizeUpload(file);
    const extracted = await extractGarments(normalized);
    if (!extracted.length) throw new HttpError(422, 'No clear garments or accessories were found in this photo.');
    const { data: existing, error: existingError } = await db().from('wardrobe_items').select('name, category, subcategory, color').eq('user_id', user.id);
    assertDatabase(existingError, 'Could not check wardrobe duplicates');

    const stored = [];
    try {
      await mapLimit(extracted, concurrency(), async (item, index) => {
        stored[index] = await storeItemImage(user.id, normalized, item);
      });
    } catch (error) {
      await Promise.all(stored.filter(Boolean).map((image) => deleteImage(user.id, image.id).catch(() => {})));
      throw error;
    }

    const items = extracted.map((item, index) => {
      const duplicate = existing.some((entry) => entry.category === item.category
        && norm(entry.color) === norm(item.color)
        && (norm(entry.name) === norm(item.name) || (item.subcategory && norm(entry.subcategory) === norm(item.subcategory))));
      const { bbox: _bbox, confidence, ...fields } = item;
      return {
        ...fields,
        id: crypto.randomUUID(),
        imageId: stored[index].id,
        image: stored[index].image,
        cutout: stored[index].cutout,
        confidence: confidence >= 0.72 ? 'high' : 'low',
        duplicate,
        selected: !duplicate,
      };
    });
    return NextResponse.json({ items });
  } catch (error) { return apiError(error); }
}
