import 'server-only';

import crypto from 'node:crypto';
import sharp from 'sharp';
import { assertDatabase, db } from './db';
import { HttpError } from './http';
import { storageBucket, supabaseAdmin } from './supabase';

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
  const objectPath = `${userId}/${kind}/${id}.${extension}`;
  const supabase = supabaseAdmin();
  const bucket = storageBucket();
  const { error: uploadError } = await supabase.storage.from(bucket).upload(objectPath, buffer, {
    contentType: mimeType,
    cacheControl: '3600',
    upsert: false,
  });
  if (uploadError) throw new Error(`Supabase Storage upload failed: ${uploadError.message}`);

  try {
    const { error } = await db().from('images').insert({ id, user_id: userId, kind, mime_type: mimeType, object_path: objectPath, created_at: Date.now() });
    assertDatabase(error, 'Could not save image metadata');
  } catch (error) {
    await supabase.storage.from(bucket).remove([objectPath]);
    throw error;
  }
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
  const output = await sharp(source)
    .extract({ left, top, width: Math.max(1, right - left), height: Math.max(1, bottom - top) })
    .resize({ width: 900, height: 900, fit: 'contain', background: '#f4f1eb', withoutEnlargement: true })
    .webp({ quality: 90 })
    .toBuffer();
  return saveImage(userId, output, 'pending-item', 'image/webp');
}

export async function getOwnedImage(userId, imageId) {
  const { data: image, error } = await db().from('images').select('*').eq('id', imageId).eq('user_id', userId).maybeSingle();
  assertDatabase(error, 'Could not load image metadata');
  return image || null;
}

export async function readStoredImage(objectPath) {
  const { data, error } = await supabaseAdmin().storage.from(storageBucket()).download(objectPath);
  if (error) throw new Error(`Supabase Storage download failed: ${error.message}`);
  return Buffer.from(await data.arrayBuffer());
}

export async function deleteImage(userId, imageId) {
  const image = await getOwnedImage(userId, imageId);
  if (!image) return;
  const { error } = await supabaseAdmin().storage.from(storageBucket()).remove([image.object_path]);
  if (error) throw new Error(`Supabase Storage deletion failed: ${error.message}`);
  const { error: databaseError } = await db().from('images').delete().eq('id', imageId).eq('user_id', userId);
  assertDatabase(databaseError, 'Could not delete image metadata');
}

export async function deleteUserFiles(userId) {
  const { data: rows, error: rowsError } = await db().from('images').select('object_path').eq('user_id', userId);
  assertDatabase(rowsError, 'Could not list account images');
  const paths = rows.map((row) => row.object_path);
  for (let index = 0; index < paths.length; index += 1000) {
    const { error } = await supabaseAdmin().storage.from(storageBucket()).remove(paths.slice(index, index + 1000));
    if (error) throw new Error(`Supabase Storage account cleanup failed: ${error.message}`);
  }
}
