import { NextResponse } from 'next/server';
import { requireUser } from '@/src/server/auth';
import { apiError, assertSameOrigin, enforceRateLimit } from '@/src/server/http';
import { createSource, deletePins, insertPins, inspirationState, rebuildProfile } from '@/src/server/inspiration';
import { analyzeUploads } from '@/src/server/inspiration-import';
import { deleteImage } from '@/src/server/storage';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    await enforceRateLimit(user.id, 'inspiration', 20, 60 * 60 * 1000);
    const formData = await request.formData();
    const files = formData.getAll('files').filter((file) => file instanceof File);
    const pins = await analyzeUploads(user.id, files);
    let source;
    try {
      source = await createSource(user.id, { kind: 'upload', label: `Uploaded images · ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` });
      await insertPins(user.id, source.id, pins);
    } catch (error) {
      if (source) await deletePins(user.id, { sourceId: source.id }).catch(() => {});
      await Promise.all(pins.map((pin) => deleteImage(user.id, pin.imageId).catch(() => {})));
      throw error;
    }
    await rebuildProfile(user.id, user.styles);
    return NextResponse.json(await inspirationState(user.id), { status: 201 });
  } catch (error) { return apiError(error); }
}
