import 'server-only';

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { dataDir, db } from './db';
import { HttpError } from './http';

const filesRoot = path.join(dataDir, 'files');
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function normalizeUpload(file) {
  if (!(file instanceof File)) throw new HttpError(400, 'An image file is required.');
  if (!allowedTypes.has(file.type)) throw new HttpError(415, 'Use a JPG, PNG, or WEBP image.');
  if (file.size > 20 * 1024 * 1024) throw new HttpError(413, 'Images must be 20MB or smaller.');
  const input = Buffer.from(await file.arrayBuffer());
  try {
    return await sharp(input, { failOn: 'error', limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: 2200, height: 2200, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer();
  } catch {
    throw new HttpError(415, 'That image could not be read. Try exporting it as JPG or PNG.');
  }
}

export async function saveImage(userId, buffer, kind, mimeType = 'image/webp') {
  const id = crypto.randomUUID();
  const extension = mimeType === 'image/png' ? 'png' : mimeType === 'image/jpeg' ? 'jpg' : 'webp';
  const userDir = path.join(filesRoot, userId);
  await fs.mkdir(userDir, { recursive: true, mode: 0o700 });
  const filePath = path.join(userDir, `${id}.${extension}`);
  await fs.writeFile(filePath, buffer, { mode: 0o600 });
  db.prepare('INSERT INTO images (id, user_id, kind, mime_type, file_path, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, userId, kind, mimeType, filePath, Date.now());
  return { id, image: `/api/assets/${id}` };
}

export async function cropAndSave(userId, source, bbox) {
  const metadata = await sharp(source).metadata();
  const width = metadata.width || 1;
  const height = metadata.height || 1;
  const [x, y, w, h] = bbox;
  const padding = 0.04;
  const left = Math.max(0, Math.floor((x / 1000 - padding) * width));
  const top = Math.max(0, Math.floor((y / 1000 - padding) * height));
  const right = Math.min(width, Math.ceil(((x + w) / 1000 + padding) * width));
  const bottom = Math.min(height, Math.ceil(((y + h) / 1000 + padding) * height));
  const cropWidth = Math.max(1, right - left);
  const cropHeight = Math.max(1, bottom - top);
  const output = await sharp(source)
    .extract({ left, top, width: cropWidth, height: cropHeight })
    .resize({ width: 900, height: 900, fit: 'contain', background: '#f4f1eb', withoutEnlargement: true })
    .webp({ quality: 90 })
    .toBuffer();
  return saveImage(userId, output, 'pending-item', 'image/webp');
}

export function getOwnedImage(userId, imageId) {
  return db.prepare('SELECT * FROM images WHERE id = ? AND user_id = ?').get(imageId, userId);
}

export async function deleteImage(userId, imageId) {
  const image = getOwnedImage(userId, imageId);
  if (!image) return;
  db.prepare('DELETE FROM images WHERE id = ? AND user_id = ?').run(imageId, userId);
  await fs.unlink(image.file_path).catch(() => {});
}

export async function deleteUserFiles(userId) {
  await fs.rm(path.join(filesRoot, userId), { recursive: true, force: true });
}
