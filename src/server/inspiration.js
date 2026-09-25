import 'server-only';

import crypto from 'node:crypto';
import { z } from 'zod';
import { mapLimit } from './concurrency';
import { assertDatabase, db, parseJson } from './db';
import { structuredResponse } from './openai';
import { deleteImage } from './storage';

// ---------------------------------------------------------------------------
// AI: per-image style signals and the aggregated profile
// ---------------------------------------------------------------------------

const list = { type: 'array', items: { type: 'string' }, maxItems: 8 };
const strList = z.array(z.string().trim().max(60)).max(8);

const signalsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['images'],
  properties: {
    images: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['index', 'relevant', 'summary', 'aesthetics', 'colors', 'silhouettes', 'patterns', 'materials', 'layering', 'proportions', 'accessories'],
        properties: {
          index: { type: 'integer', minimum: 0 },
          relevant: { type: 'boolean', description: 'False when the image contains no clothing, outfit, or fashion styling signal.' },
          summary: { type: 'string', description: 'One sentence describing the look and its mood.' },
          aesthetics: list,
          colors: list,
          silhouettes: list,
          patterns: list,
          materials: list,
          layering: { type: 'string' },
          proportions: { type: 'string' },
          accessories: list,
        },
      },
    },
  },
};

const signalsResult = z.object({
  images: z.array(z.object({
    index: z.number().int().min(0),
    relevant: z.boolean(),
    summary: z.string().max(400),
    aesthetics: strList, colors: strList, silhouettes: strList, patterns: strList, materials: strList,
    layering: z.string().max(200), proportions: z.string().max(200), accessories: strList,
  })),
});

/** Extract recurring style signals from inspiration images (JPEG buffers), batched to limit calls. */
export async function analyzeInspirationImages(buffers) {
  const batches = [];
  for (let index = 0; index < buffers.length; index += 10) batches.push(buffers.slice(index, index + 10));
  const results = await mapLimit(batches, 3, async (batch) => {
    const parsed = await structuredResponse({
      name: 'inspiration_signals',
      schema: signalsSchema,
      validator: signalsResult,
      content: [
        {
          type: 'input_text',
          text: `You are a fashion editor building a private taste profile. For each of the ${batch.length} images (index 0 to ${batch.length - 1}, in order), describe the styling signals: aesthetic labels, color palette, silhouettes, patterns, materials, layering, proportions, and accessories. Use plain fashion language, short phrases. Mark relevant=false for images with no clothing or styling (quotes, interiors, food). Do not identify or describe people's faces, bodies, or identities, only the clothes and styling. Return one entry per image.`,
        },
        ...batch.map((buffer) => ({ type: 'input_image', image_url: `data:image/jpeg;base64,${buffer.toString('base64')}`, detail: 'low' })),
      ],
    });
    return batch.map((_buffer, index) => parsed.images.find((entry) => entry.index === index) || null);
  });
  return results.flat();
}

const profileFields = ['summary', 'aesthetics', 'palette', 'silhouettes', 'patterns', 'materials', 'layering', 'proportions', 'accessories', 'signatureDetails'];

const profileSchema = {
  type: 'object',
  additionalProperties: false,
  required: profileFields,
  properties: {
    summary: { type: 'string', description: '2-3 warm sentences describing the aesthetic in second person.' },
    aesthetics: list,
    palette: list,
    silhouettes: list,
    patterns: list,
    materials: list,
    layering: { type: 'string' },
    proportions: { type: 'string' },
    accessories: list,
    signatureDetails: list,
  },
};

export const profileInput = z.object({
  summary: z.string().trim().max(800),
  aesthetics: strList, palette: strList, silhouettes: strList, patterns: strList, materials: strList,
  layering: z.string().trim().max(300), proportions: z.string().trim().max(300),
  accessories: strList, signatureDetails: strList,
});

export async function synthesizeStyleProfile({ signals, statedStyles, corrections }) {
  return structuredResponse({
    name: 'style_profile',
    schema: profileSchema,
    validator: profileInput,
    content: [{
      type: 'input_text',
      text: `Aggregate these per-image style signals into one concise, editable style profile. Keep only signals that RECUR across several images; ignore one-offs. Order each list from strongest to weakest. Use short phrases. This profile is a soft preference for recommending outfits from clothes the user already owns, so describe tendencies, not specific garments to buy.
${corrections ? '\nThe user has manually corrected their previous profile. Treat their corrections as authoritative: keep what they added and do not reintroduce what they removed.\nUser-corrected profile JSON: ' + JSON.stringify(corrections) + '\n' : ''}
Aesthetics the user selected themselves: ${statedStyles.join(', ') || 'none'}
Signals JSON (${signals.length} images): ${JSON.stringify(signals)}`,
    }],
  });
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

function pinView(row) {
  return {
    id: row.id,
    sourceId: row.source_id,
    image: row.image_id ? `/api/assets/${row.image_id}` : row.remote_image_url,
    link: row.link,
    title: row.title,
    signals: parseJson(row.signals_json, {}),
  };
}

export async function inspirationState(userId) {
  const database = db();
  const [{ data: sources, error: sourceError }, { data: pins, error: pinError }, { data: user, error: userError }] = await Promise.all([
    database.from('inspiration_sources').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    database.from('inspiration_pins').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    database.from('users').select('style_profile_json, style_profile_updated_at').eq('id', userId).single(),
  ]);
  assertDatabase(sourceError, 'Could not load inspiration sources');
  assertDatabase(pinError, 'Could not load inspiration images');
  assertDatabase(userError, 'Could not load style profile');
  const counts = pins.reduce((map, pin) => map.set(pin.source_id, (map.get(pin.source_id) || 0) + 1), new Map());
  return {
    sources: sources.map((row) => ({ id: row.id, kind: row.kind, label: row.label, url: row.url, enabled: row.enabled, syncedAt: row.synced_at ? Number(row.synced_at) : null, createdAt: Number(row.created_at), pinCount: counts.get(row.id) || 0 })),
    pins: pins.map(pinView),
    profile: parseJson(user.style_profile_json, null),
    profileUpdatedAt: user.style_profile_updated_at ? Number(user.style_profile_updated_at) : null,
  };
}

export async function createSource(userId, { kind, label, url = '' }) {
  const now = Date.now();
  const row = { id: crypto.randomUUID(), user_id: userId, kind, label, url, enabled: true, synced_at: now, created_at: now };
  const { error } = await db().from('inspiration_sources').insert(row);
  assertDatabase(error, 'Could not save inspiration source');
  return row;
}

export async function insertPins(userId, sourceId, pins) {
  if (!pins.length) return;
  const now = Date.now();
  const { error } = await db().from('inspiration_pins').insert(pins.map((pin, index) => ({
    id: crypto.randomUUID(), user_id: userId, source_id: sourceId, image_id: pin.imageId || null,
    remote_image_url: pin.remoteImageUrl || '', link: pin.link || '', title: pin.title || '',
    signals_json: pin.signals || {}, created_at: now - index,
  })));
  assertDatabase(error, 'Could not save inspiration images');
}

/** Delete pins (and any privately stored copies) for a source or a single pin. */
export async function deletePins(userId, { sourceId, pinId }) {
  let query = db().from('inspiration_pins').select('id, image_id').eq('user_id', userId);
  query = pinId ? query.eq('id', pinId) : query.eq('source_id', sourceId);
  const { data: rows, error } = await query;
  assertDatabase(error, 'Could not load inspiration images');
  if (!rows.length) return 0;
  const { error: deleteError } = await db().from('inspiration_pins').delete().eq('user_id', userId).in('id', rows.map((row) => row.id));
  assertDatabase(deleteError, 'Could not delete inspiration images');
  await Promise.all(rows.filter((row) => row.image_id).map((row) => deleteImage(userId, row.image_id)));
  return rows.length;
}

export async function saveProfile(userId, profile) {
  const now = Date.now();
  const { error } = await db().from('users').update({ style_profile_json: profile, style_profile_updated_at: profile ? now : null }).eq('id', userId);
  assertDatabase(error, 'Could not save style profile');
}

/** Rebuild the aggregated profile from every enabled source, respecting any manual corrections. */
export async function rebuildProfile(userId, statedStyles = []) {
  const database = db();
  const [{ data: pins, error }, { data: sources, error: sourceError }, { data: user, error: userError }] = await Promise.all([
    database.from('inspiration_pins').select('source_id, signals_json').eq('user_id', userId),
    database.from('inspiration_sources').select('id, enabled').eq('user_id', userId),
    database.from('users').select('style_profile_json').eq('id', userId).single(),
  ]);
  assertDatabase(error, 'Could not load inspiration signals');
  assertDatabase(sourceError, 'Could not load inspiration sources');
  assertDatabase(userError, 'Could not load style profile');
  const enabled = new Set(sources.filter((source) => source.enabled).map((source) => source.id));
  const signals = pins
    .filter((pin) => enabled.has(pin.source_id))
    .map((pin) => parseJson(pin.signals_json, {}))
    .filter((signal) => signal && signal.relevant !== false && signal.summary);
  if (!signals.length) {
    await saveProfile(userId, null);
    return null;
  }
  const current = parseJson(user.style_profile_json, null);
  const synthesized = await synthesizeStyleProfile({
    signals: signals.slice(0, 80).map(({ relevant: _relevant, ...rest }) => rest),
    statedStyles,
    corrections: current?.edited ? Object.fromEntries(profileFields.map((key) => [key, current[key]])) : null,
  });
  const profile = { ...synthesized, edited: Boolean(current?.edited), imageCount: signals.length, sourceCount: enabled.size };
  await saveProfile(userId, profile);
  return profile;
}
