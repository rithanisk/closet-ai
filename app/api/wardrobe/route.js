import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/src/server/auth';
import { db } from '@/src/server/db';
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
    return NextResponse.json({ items: listWardrobe(user.id) });
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
    const insert = db.prepare(`INSERT INTO wardrobe_items
      (id, user_id, image_id, name, category, color, pattern, material, formality, season, notes, favorite, available, worn, added_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', 0, 1, 0, ?)`);
    const commit = db.transaction(() => {
      items.forEach((item, index) => {
        const image = db.prepare('SELECT id FROM images WHERE id = ? AND user_id = ?').get(item.imageId, user.id);
        if (!image) throw new HttpError(400, 'One of the extracted images is no longer available.');
        insert.run(crypto.randomUUID(), user.id, item.imageId, item.name, item.category, item.color, item.pattern, item.material, item.formality, item.season, Date.now() + index);
        db.prepare("UPDATE images SET kind = 'wardrobe-item' WHERE id = ? AND user_id = ?").run(item.imageId, user.id);
      });
    });
    commit();
    await Promise.all(discardedImageIds.map((imageId) => deleteImage(user.id, imageId)));
    return NextResponse.json({ items: listWardrobe(user.id) }, { status: 201 });
  } catch (error) { return apiError(error); }
}
