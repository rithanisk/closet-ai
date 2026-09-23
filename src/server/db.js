import 'server-only';

import { supabaseAdmin } from './supabase';

export function db() {
  return supabaseAdmin();
}

export function assertDatabase(error, context = 'Database request failed') {
  if (error) throw new Error(`${context}: ${error.message}`);
}

function parseJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

export function userView(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    city: row.city,
    styles: parseJson(row.styles_json, []),
    preciseLocation: Boolean(row.precise_location),
  };
}

export function wardrobeView(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    color: row.color,
    pattern: row.pattern,
    material: row.material,
    formality: row.formality,
    season: row.season,
    notes: row.notes,
    favorite: Boolean(row.favorite),
    available: Boolean(row.available),
    worn: Number(row.worn),
    addedAt: Number(row.added_at),
    imageId: row.image_id,
    image: row.image_id ? `/api/assets/${row.image_id}` : '',
  };
}

export function outfitView(row, itemsById) {
  const itemIds = parseJson(row.item_ids_json, []);
  return {
    savedId: row.id,
    id: row.source_id,
    title: row.title,
    blurb: row.blurb,
    why: row.why,
    occasionFit: row.occasion_fit,
    weatherFit: row.weather_fit,
    stylingNotes: row.styling_notes,
    compromiseNote: row.compromise_note,
    shoppingSuggestion: row.shopping_suggestion,
    worn: Boolean(row.worn),
    savedAt: new Date(Number(row.saved_at)).toISOString(),
    items: itemIds.map((id) => itemsById.get(id)).filter(Boolean),
  };
}
