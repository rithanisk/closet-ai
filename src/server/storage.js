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

function paddedRegion(metadata, bbox, padding) {
  const width = metadata.width || 1;
  const height = metadata.height || 1;
  const [x, y, w, h] = bbox;
  const left = Math.max(0, Math.floor((x / 1000 - padding) * width));
  const top = Math.max(0, Math.floor((y / 1000 - padding) * height));
  const right = Math.min(width, Math.ceil(((x + w) / 1000 + padding) * width));
  const bottom = Math.min(height, Math.ceil(((y + h) / 1000 + padding) * height));
  return { left, top, width: Math.max(1, right - left), height: Math.max(1, bottom - top) };
}

/** A generous PNG crop around one detection, used as the reference image for cutout generation. */
export async function cropForIsolation(source, bbox) {
  const metadata = await sharp(source).metadata();
  return sharp(source)
    .extract(paddedRegion(metadata, bbox, 0.06))
    .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();
}

/** Legacy-style framed crop, kept as a fallback when a transparent cutout cannot be produced. */
export async function cropAndSave(userId, source, bbox) {
  const metadata = await sharp(source).metadata();
  const output = await sharp(source)
    .extract(paddedRegion(metadata, bbox, 0.04))
    .resize({ width: 900, height: 900, fit: 'contain', background: '#f4f1eb', withoutEnlargement: true })
    .webp({ quality: 90 })
    .toBuffer();
  return saveImage(userId, output, 'pending-item', 'image/webp');
}

/**
 * Normalize a generated cutout: trim empty transparent margins, center it on a square
 * transparent canvas with breathing room, and store it as an alpha WEBP.
 * Returns null when the image has no usable transparency so the caller can fall back.
 */
export async function prepareCutout(pngBuffer) {
  const image = sharp(pngBuffer, { failOn: 'error' }).ensureAlpha();
  const { data, info } = await image.clone().raw().toBuffer({ resolveWithObject: true });
  let transparent = 0;
  for (let index = 3; index < data.length; index += info.channels) if (data[index] < 16) transparent += 1;
  const transparentShare = transparent / (info.width * info.height);
  // A real cutout has a meaningful transparent area but is not empty.
  if (transparentShare < 0.05 || transparentShare > 0.985) return null;
  const trimmed = await image.trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 8 }).png().toBuffer();
  const { data: fitted, info: size } = await sharp(trimmed)
    .resize({ width: 820, height: 820, fit: 'inside' })
    .png()
    .toBuffer({ resolveWithObject: true });
  const horizontal = 900 - size.width;
  const vertical = 900 - size.height;
  return sharp(fitted)
    .extend({
      left: Math.floor(horizontal / 2), right: Math.ceil(horizontal / 2),
      top: Math.floor(vertical / 2), bottom: Math.ceil(vertical / 2),
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({ quality: 92, alphaQuality: 100 })
    .toBuffer();
}

export async function saveCutout(userId, cutout) {
  return saveImage(userId, cutout, 'pending-item', 'image/webp');
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
