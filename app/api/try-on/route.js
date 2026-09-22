import fs from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/src/server/auth';
import { db } from '@/src/server/db';
import { apiError, assertSameOrigin, enforceRateLimit, HttpError } from '@/src/server/http';
import { generateTryOn } from '@/src/server/openai';
import { normalizeUpload, saveImage } from '@/src/server/storage';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    enforceRateLimit(user.id, 'try-on', 10, 60 * 60 * 1000, db);
    const formData = await request.formData();
    const photo = formData.get('photo');
    const personBuffer = await normalizeUpload(photo);
    let ids;
    try { ids = z.array(z.string().uuid()).min(2).max(8).parse(JSON.parse(formData.get('itemIds') || '[]')); }
    catch { throw new HttpError(400, 'Choose a valid outfit before creating a preview.'); }
    const placeholders = ids.map(() => '?').join(',');
    const rows = db.prepare(`SELECT wi.id, i.file_path, i.mime_type FROM wardrobe_items wi JOIN images i ON i.id = wi.image_id WHERE wi.user_id = ? AND wi.id IN (${placeholders})`).all(user.id, ...ids);
    if (rows.length !== new Set(ids).size) throw new HttpError(400, 'One or more outfit pieces are no longer available.');
    const byId = new Map(rows.map((row) => [row.id, row]));
    const garments = await Promise.all(ids.map(async (id) => {
      const row = byId.get(id);
      return { buffer: await fs.readFile(row.file_path), mimeType: row.mime_type, extension: path.extname(row.file_path).slice(1) || 'webp' };
    }));
    const output = await generateTryOn({ personBuffer, personMime: 'image/jpeg', garments });
    const image = await saveImage(user.id, output, 'try-on', 'image/png');
    return NextResponse.json({ image: image.image });
  } catch (error) { return apiError(error); }
}
