import 'server-only';

import crypto from 'node:crypto';
import { db, outfitView, wardrobeView } from './db';

export function listWardrobe(userId) {
  return db.prepare('SELECT * FROM wardrobe_items WHERE user_id = ? ORDER BY added_at DESC').all(userId).map(wardrobeView);
}

export function listOutfits(userId, wardrobe = listWardrobe(userId)) {
  const itemsById = new Map(wardrobe.map((item) => [item.id, item]));
  return db.prepare('SELECT * FROM outfits WHERE user_id = ? ORDER BY saved_at DESC').all(userId).map((row) => outfitView(row, itemsById));
}

export function saveOutfit(userId, outfit) {
  const existing = db.prepare('SELECT id FROM outfits WHERE user_id = ? AND source_id = ?').get(userId, outfit.id);
  if (existing) return listOutfits(userId).find((saved) => saved.savedId === existing.id);
  const owned = new Set(db.prepare('SELECT id FROM wardrobe_items WHERE user_id = ?').all(userId).map((row) => row.id));
  const itemIds = outfit.items.map((item) => item.id).filter((id) => owned.has(id));
  const id = crypto.randomUUID();
  db.prepare(`INSERT INTO outfits
    (id, source_id, user_id, item_ids_json, title, blurb, why, occasion_fit, weather_fit, styling_notes, compromise_note, shopping_suggestion, worn, saved_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`)
    .run(id, outfit.id, userId, JSON.stringify(itemIds), outfit.title, outfit.blurb, outfit.why, outfit.occasionFit, outfit.weatherFit, outfit.stylingNotes, outfit.compromiseNote || '', outfit.shoppingSuggestion || '', Date.now());
  return listOutfits(userId).find((saved) => saved.savedId === id);
}
