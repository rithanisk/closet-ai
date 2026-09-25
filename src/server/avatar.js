import 'server-only';

import crypto from 'node:crypto';
import sharp from 'sharp';
import { mapLimit } from './concurrency';
import { assertDatabase, db, parseJson } from './db';
import { HttpError } from './http';
import { generateAvatarView, generateTryOnLook } from './openai';
import { deleteImage, normalizeUpload, readStoredImage, saveImage } from './storage';

export const VIEWS = ['front', 'side', 'back'];
const url = (id) => (id ? `/api/assets/${id}` : '');

async function avatarRow(userId) {
  const { data, error } = await db().from('avatars').select('*').eq('user_id', userId).maybeSingle();
  assertDatabase(error, 'Could not load your avatar');
  return data;
}

export async function recentLooks(userId, version, limit = 12) {
  if (!version) return [];
  const { data, error } = await db().from('try_ons').select('id, view, item_ids_json, image_id, created_at')
    .eq('user_id', userId).eq('avatar_version', version).order('created_at', { ascending: false }).limit(limit);
  assertDatabase(error, 'Could not load recent looks');
  return data.map((row) => ({ id: row.id, view: row.view, itemIds: parseJson(row.item_ids_json, []), image: url(row.image_id), createdAt: Number(row.created_at) }));
}

export async function avatarState(userId) {
  const row = await avatarRow(userId);
  if (!row) return { avatar: null, looks: [] };
  return {
    avatar: {
      status: row.status,
      version: Number(row.version),
      notes: row.notes,
      views: { front: url(row.front_image_id), side: url(row.side_image_id), back: url(row.back_image_id) },
      sources: parseJson(row.source_image_ids_json, []).map(url),
      updatedAt: Number(row.updated_at),
    },
    looks: await recentLooks(userId, Number(row.version)),
  };
}

async function loadImage(userId, imageId, maxSize = 1024) {
  const { data, error } = await db().from('images').select('object_path').eq('id', imageId).eq('user_id', userId).maybeSingle();
  assertDatabase(error, 'Could not load image');
  if (!data) throw new HttpError(404, 'An image needed for this look is no longer available.');
  const buffer = await sharp(await readStoredImage(data.object_path))
    .resize({ width: maxSize, height: maxSize, fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();
  return { buffer, mimeType: 'image/png', extension: 'png' };
}

async function clearAvatarData(userId, row) {
  if (!row) return;
  const { data: looks, error } = await db().from('try_ons').select('image_id').eq('user_id', userId);
  assertDatabase(error, 'Could not load previous looks');
  const { error: deleteLooksError } = await db().from('try_ons').delete().eq('user_id', userId);
  assertDatabase(deleteLooksError, 'Could not delete previous looks');
  const { error: deleteRowError } = await db().from('avatars').delete().eq('user_id', userId);
  assertDatabase(deleteRowError, 'Could not delete avatar');
  const imageIds = [
    ...parseJson(row.source_image_ids_json, []),
    row.front_image_id, row.side_image_id, row.back_image_id,
    ...looks.map((look) => look.image_id),
  ].filter(Boolean);
  await mapLimit(imageIds, 6, (imageId) => deleteImage(userId, imageId).catch(() => {}));
}

/** Store the user's reference photos, render the front view, and replace any previous avatar. */
export async function createAvatar(userId, files, notes = '') {
  if (!files.length) throw new HttpError(400, 'Add at least one photo of yourself.');
  if (files.length > 4) throw new HttpError(400, 'Use up to four photos.');
  const normalized = await mapLimit(files, 4, async (file) => sharp(await normalizeUpload(file))
    .resize({ width: 1536, height: 1536, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 88 })
    .toBuffer());
  const sources = normalized.map((buffer) => ({ buffer, mimeType: 'image/jpeg', extension: 'jpg' }));
  const front = await generateAvatarView({ view: 'front', sources, notes });

  const saved = [];
  try {
    for (const buffer of normalized) saved.push(await saveImage(userId, buffer, 'avatar-source', 'image/jpeg'));
    const frontImage = await saveImage(userId, front, 'avatar-view', 'image/png');
    saved.push(frontImage);
    const previous = await avatarRow(userId);
    await clearAvatarData(userId, previous);
    const now = Date.now();
    const { error } = await db().from('avatars').insert({
      user_id: userId,
      status: 'ready',
      source_image_ids_json: saved.slice(0, normalized.length).map((image) => image.id),
      front_image_id: frontImage.id,
      notes,
      version: now,
      created_at: now,
      updated_at: now,
    });
    assertDatabase(error, 'Could not save avatar');
  } catch (error) {
    await mapLimit(saved, 4, (image) => deleteImage(userId, image.id).catch(() => {}));
    throw error;
  }
  return avatarState(userId);
}

/** Render any missing side/back views so the twin can be turned around. */
export async function completeAvatarViews(userId) {
  const row = await avatarRow(userId);
  if (!row?.front_image_id) throw new HttpError(404, 'Create your avatar first.');
  const missing = ['side', 'back'].filter((view) => !row[`${view}_image_id`]);
  if (!missing.length) return avatarState(userId);
  const sourceIds = parseJson(row.source_image_ids_json, []);
  const [front, ...sources] = await Promise.all([loadImage(userId, row.front_image_id, 1024), ...sourceIds.slice(0, 2).map((id) => loadImage(userId, id, 1024))]);
  const rendered = await Promise.all(missing.map(async (view) => {
    const buffer = await generateAvatarView({ view, sources, front, notes: row.notes });
    return [view, await saveImage(userId, buffer, 'avatar-view', 'image/png')];
  }));
  const changes = Object.fromEntries(rendered.map(([view, image]) => [`${view}_image_id`, image.id]));
  const { error } = await db().from('avatars').update({ ...changes, updated_at: Date.now() }).eq('user_id', userId);
  assertDatabase(error, 'Could not save avatar views');
  return avatarState(userId);
}

export async function deleteAvatar(userId) {
  await clearAvatarData(userId, await avatarRow(userId));
}

/** Dress the twin in 1-8 owned items for one view. Results are cached per avatar version, view, and item set. */
export async function tryOn(userId, itemIds, view, beforeGenerate) {
  const row = await avatarRow(userId);
  if (!row?.front_image_id) throw new HttpError(409, 'Create your avatar in the fitting room first.');
  const viewImageId = row[`${view}_image_id`];
  if (!viewImageId) throw new HttpError(409, 'That angle is still being prepared. Try the front view for now.');
  const ids = [...new Set(itemIds)];
  const itemsKey = [...ids].sort().join(',');
  const version = Number(row.version);

  const { data: cached, error: cacheError } = await db().from('try_ons').select('id, image_id').eq('user_id', userId)
    .eq('avatar_version', version).eq('view', view).eq('items_key', itemsKey).maybeSingle();
  assertDatabase(cacheError, 'Could not check saved looks');
  if (cached?.image_id) return { image: url(cached.image_id), cached: true };

  // Only uncached renders count toward the rate limit.
  if (beforeGenerate) await beforeGenerate();
  const { data: items, error } = await db().from('wardrobe_items').select('id, name, category, subcategory, description, image_id').eq('user_id', userId).in('id', ids);
  assertDatabase(error, 'Could not load wardrobe pieces');
  if (items.length !== ids.length || items.some((item) => !item.image_id)) throw new HttpError(400, 'One of those pieces is no longer in your wardrobe.');
  const ordered = ids.map((id) => items.find((item) => item.id === id));
  const sourceIds = parseJson(row.source_image_ids_json, []);
  const [avatar, identity, ...garments] = await Promise.all([
    loadImage(userId, viewImageId, 1024),
    loadImage(userId, sourceIds[0] || row.front_image_id, 1024),
    ...ordered.map((item) => loadImage(userId, item.image_id, 1024)),
  ]);
  const output = await generateTryOnLook({
    avatar,
    identity,
    view,
    garments: ordered.map((item, index) => ({ ...garments[index], name: item.name, category: item.category, subcategory: item.subcategory, description: item.description })),
  });
  const image = await saveImage(userId, output, 'try-on', 'image/png');
  const { error: insertError } = await db().from('try_ons').upsert({
    id: crypto.randomUUID(), user_id: userId, avatar_version: version, view, items_key: itemsKey,
    item_ids_json: ids, image_id: image.id, created_at: Date.now(),
  }, { onConflict: 'user_id,avatar_version,view,items_key' });
  assertDatabase(insertError, 'Could not save this look');
  return { image: image.image, cached: false };
}
