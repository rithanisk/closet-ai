import { NextResponse } from 'next/server';
import { requireUser } from '@/src/server/auth';
import { analyzeGaps, listSuggestions, storeSuggestions } from '@/src/server/gaps';
import { apiError, assertSameOrigin, enforceRateLimit, HttpError } from '@/src/server/http';
import { listOutfits, listWardrobe } from '@/src/server/repository';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ suggestions: await listSuggestions(user.id) });
  } catch (error) { return apiError(error); }
}

/** Run a fresh wardrobe-gap analysis. User-initiated only, and rate limited to avoid repetitive prompts. */
export async function POST(request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const wardrobe = await listWardrobe(user.id);
    if (wardrobe.filter((item) => item.available).length < 6) throw new HttpError(422, 'Add at least six available pieces so gap suggestions can be grounded in real outfits.');
    await enforceRateLimit(user.id, 'gaps', 8, 60 * 60 * 1000);
    const saved = await listOutfits(user.id, wardrobe);
    const suggestions = await analyzeGaps({ userId: user.id, wardrobe, styles: user.styles, styleProfile: user.styleProfile, saved });
    await storeSuggestions(user.id, suggestions);
    return NextResponse.json({ suggestions: await listSuggestions(user.id), found: suggestions.length });
  } catch (error) { return apiError(error); }
}
