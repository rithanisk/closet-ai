import 'server-only';

import crypto from 'node:crypto';
import { assertDatabase, db, outfitView, wardrobeView } from './db';

export async function listWardrobe(userId) {
  const { data, error } = await db().from('wardrobe_items').select('*').eq('user_id', userId).order('added_at', { ascending: false });
  assertDatabase(error, 'Could not load wardrobe');
  return data.map(wardrobeView);
}

export async function listOutfits(userId, suppliedWardrobe) {
  const wardrobe = suppliedWardrobe || await listWardrobe(userId);
  const itemsById = new Map(wardrobe.map((item) => [item.id, item]));
  const { data, error } = await db().from('outfits').select('*').eq('user_id', userId).order('saved_at', { ascending: false });
  assertDatabase(error, 'Could not load saved outfits');
  return data.map((row) => outfitView(row, itemsById));
}

export async function saveOutfit(userId, outfit) {
  const database = db();
  const { data: existing, error: existingError } = await database.from('outfits').select('id').eq('user_id', userId).eq('source_id', outfit.id).maybeSingle();
  assertDatabase(existingError, 'Could not check saved outfit');
  if (existing) return (await listOutfits(userId)).find((saved) => saved.savedId === existing.id);

  const { data: ownedRows, error: ownedError } = await database.from('wardrobe_items').select('id').eq('user_id', userId);
  assertDatabase(ownedError, 'Could not verify outfit items');
  const owned = new Set(ownedRows.map((row) => row.id));
  const itemIds = outfit.items.map((item) => item.id).filter((id) => owned.has(id));
  const id = crypto.randomUUID();
  const { error } = await database.from('outfits').insert({
    id,
    source_id: outfit.id,
    user_id: userId,
    item_ids_json: itemIds,
    title: outfit.title,
    blurb: outfit.blurb,
    why: outfit.why,
    occasion_fit: outfit.occasionFit,
    weather_fit: outfit.weatherFit,
    styling_notes: outfit.stylingNotes,
    compromise_note: outfit.compromiseNote || '',
    shopping_suggestion: outfit.shoppingSuggestion || '',
    worn: false,
    saved_at: Date.now(),
  });
  assertDatabase(error, 'Could not save outfit');
  return (await listOutfits(userId)).find((saved) => saved.savedId === id);
}
