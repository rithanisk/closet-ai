import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/src/server/auth';
import { apiError, assertSameOrigin, enforceRateLimit, HttpError, jsonBody } from '@/src/server/http';
import { generateOutfits } from '@/src/server/openai';
import { listOutfits, listWardrobe } from '@/src/server/repository';
import { getWeather, weatherLabel } from '@/src/server/weather';

export const runtime = 'nodejs';
export const maxDuration = 300;

const schema = z.object({
  prompt: z.string().trim().min(2).max(1200),
  city: z.string().trim().max(100).default(''),
  refinement: z.string().trim().max(500).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const input = await jsonBody(request, schema);
    await enforceRateLimit(user.id, 'outfits', 30, 60 * 60 * 1000);
    const wardrobe = await listWardrobe(user.id);
    if (wardrobe.filter((item) => item.available).length < 2) throw new HttpError(422, 'Add at least two available wardrobe pieces before asking the stylist.');
    const saved = await listOutfits(user.id, wardrobe);
    const weather = await getWeather(input.city || user.city, input.latitude != null && input.longitude != null ? { latitude: input.latitude, longitude: input.longitude } : null);
    const result = await generateOutfits({
      prompt: input.prompt,
      city: input.city || user.city,
      styles: user.styles,
      styleProfile: user.styleProfile,
      weather: weatherLabel(weather),
      wardrobe,
      saved,
      refinement: input.refinement,
    });
    const owned = new Map(wardrobe.filter((item) => item.available).map((item) => [item.id, item]));
    const outfits = result.outfits.map((outfit, index) => {
      const uniqueIds = [...new Set(outfit.itemIds)];
      const items = uniqueIds.map((id) => owned.get(id)).filter(Boolean);
      if (items.length < 2) throw new Error('The stylist returned an invalid wardrobe selection.');
      return { ...outfit, id: crypto.randomUUID(), rank: index + 1, items, itemIds: undefined };
    });
    return NextResponse.json({ ...result, outfits, weather });
  } catch (error) { return apiError(error); }
}
