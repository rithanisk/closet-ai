import 'server-only';

import { supabaseAdmin } from './supabase';

export function db() {
  return supabaseAdmin();
}

export function assertDatabase(error, context = 'Database request failed') {
  if (error) throw new Error(`${context}: ${error.message}`);
}

export function parseJson(value, fallback) {
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
    styleProfile: parseJson(row.style_profile_json, null),
    styleProfileUpdatedAt: row.style_profile_updated_at ? Number(row.style_profile_updated_at) : null,
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
    description: row.description || '',
    subcategory: row.subcategory || '',
    secondaryColor: row.secondary_color || '',
    fit: row.fit || '',
    warmth: row.warmth || '',
    brand: row.brand || '',
    styleTags: parseJson(row.style_tags_json, []),
    details: parseJson(row.details_json, []),
    cutout: Boolean(row.cutout),
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
    inspirationNote: row.inspiration_note || '',
    compromiseNote: row.compromise_note,
    shoppingSuggestion: row.shopping_suggestion,
    worn: Boolean(row.worn),
    savedAt: new Date(Number(row.saved_at)).toISOString(),
    items: itemIds.map((id) => itemsById.get(id)).filter(Boolean),
  };
}
