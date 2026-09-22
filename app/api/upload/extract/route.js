import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { requireUser } from '@/src/server/auth';
import { db } from '@/src/server/db';
import { apiError, assertSameOrigin, enforceRateLimit, HttpError } from '@/src/server/http';
import { extractGarments } from '@/src/server/openai';
import { cropAndSave, deleteImage, normalizeUpload } from '@/src/server/storage';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    enforceRateLimit(user.id, 'extract', 40, 60 * 60 * 1000, db);
    const formData = await request.formData();
    const file = formData.get('file');
    const normalized = await normalizeUpload(file);
    const extracted = await extractGarments(normalized);
    if (!extracted.length) throw new HttpError(422, 'No clear garments or accessories were found in this photo.');
    const existing = db.prepare('SELECT name, category, color FROM wardrobe_items WHERE user_id = ?').all(user.id);
    const items = [];
    try {
      for (const item of extracted) {
        const stored = await cropAndSave(user.id, normalized, item.bbox);
        const duplicate = existing.some((entry) => entry.category === item.category && entry.color.toLowerCase() === item.color.toLowerCase() && entry.name.toLowerCase() === item.name.toLowerCase());
        items.push({
          id: crypto.randomUUID(), imageId: stored.id, image: stored.image,
          name: item.name, category: item.category, color: item.color, pattern: item.pattern,
          material: item.material, formality: item.formality, season: item.season,
          confidence: item.confidence >= 0.72 ? 'high' : 'low', duplicate, selected: !duplicate,
        });
      }
    } catch (error) {
      await Promise.all(items.map((item) => deleteImage(user.id, item.imageId)));
      throw error;
    }
    return NextResponse.json({ items });
  } catch (error) { return apiError(error); }
}
