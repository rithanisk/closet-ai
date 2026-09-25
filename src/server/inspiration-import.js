import 'server-only';

import sharp from 'sharp';
import { mapLimit } from './concurrency';
import { HttpError } from './http';
import { analyzeInspirationImages } from './inspiration';
import { downloadPinImage, fetchBoardPins } from './pinterest';
import { normalizeUpload, saveImage } from './storage';

/** Download, shrink, and analyze a board's pins. Pins that fail to download are skipped. */
export async function analyzeBoard(rssUrl) {
  const pins = await fetchBoardPins(rssUrl);
  const downloaded = await mapLimit(pins, 6, async (pin) => {
    try { return { ...pin, buffer: await downloadPinImage(pin.imageUrl) }; } catch { return null; }
  });
  const usable = downloaded.filter(Boolean);
  if (!usable.length) throw new HttpError(502, 'The board images could not be downloaded. Try again, or upload the images instead.');
  const signals = await analyzeInspirationImages(usable.map((pin) => pin.buffer));
  return usable.map((pin, index) => ({ remoteImageUrl: pin.imageUrl, link: pin.link, title: pin.title, signals: signals[index] || {} }));
}

/** Normalize uploads, keep a small private thumbnail for review, and analyze them. */
export async function analyzeUploads(userId, files) {
  if (!files.length) throw new HttpError(400, 'Choose at least one inspiration image.');
  if (files.length > 12) throw new HttpError(400, 'Upload up to 12 inspiration images at a time.');
  const buffers = await mapLimit(files, 4, async (file) => {
    const normalized = await normalizeUpload(file);
    return sharp(normalized).resize({ width: 768, height: 768, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
  });
  const signals = await analyzeInspirationImages(buffers);
  const stored = await mapLimit(buffers, 4, async (buffer) => {
    const thumbnail = await sharp(buffer).resize({ width: 600, height: 600, fit: 'inside' }).webp({ quality: 82 }).toBuffer();
    return saveImage(userId, thumbnail, 'inspiration', 'image/webp');
  });
  return stored.map((image, index) => ({ imageId: image.id, title: files[index].name?.slice(0, 200) || '', signals: signals[index] || {} }));
}
