import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/src/server/auth';
import { apiError, assertSameOrigin, jsonBody } from '@/src/server/http';
import { listOutfits, saveOutfit } from '@/src/server/repository';

const schema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().trim().min(1).max(100),
  blurb: z.string().trim().max(500),
  why: z.string().trim().max(1200),
  occasionFit: z.string().trim().max(1200),
  weatherFit: z.string().trim().max(1200),
  stylingNotes: z.string().trim().max(1200),
  compromiseNote: z.string().trim().max(1200).default(''),
  shoppingSuggestion: z.string().trim().max(1200).default(''),
  items: z.array(z.object({ id: z.string().uuid() })).min(2).max(8),
});

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ outfits: listOutfits(user.id) });
  } catch (error) { return apiError(error); }
}

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const input = await jsonBody(request, schema);
    const outfit = saveOutfit(user.id, input);
    return NextResponse.json({ outfit, outfits: listOutfits(user.id) }, { status: 201 });
  } catch (error) { return apiError(error); }
}
