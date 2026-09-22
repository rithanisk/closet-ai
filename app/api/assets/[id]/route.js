import fs from 'node:fs/promises';
import { requireUser } from '@/src/server/auth';
import { apiError, HttpError } from '@/src/server/http';
import { getOwnedImage } from '@/src/server/storage';

export const runtime = 'nodejs';

export async function GET(_request, context) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const image = getOwnedImage(user.id, id);
    if (!image) throw new HttpError(404, 'Image not found.');
    const bytes = await fs.readFile(image.file_path);
    return new Response(bytes, { headers: { 'Content-Type': image.mime_type, 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff' } });
  } catch (error) { return apiError(error); }
}
