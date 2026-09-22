import 'server-only';

import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const dataDir = process.env.CLOSET_DATA_DIR
  ? path.resolve(/* turbopackIgnore: true */ process.env.CLOSET_DATA_DIR)
  : path.join(process.cwd(), 'data');
fs.mkdirSync(dataDir, { recursive: true });

const globalForDb = globalThis;
const db = globalForDb.__closetDb || new Database(path.join(dataDir, 'closet.db'));

db.pragma('busy_timeout = 5000');
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT '',
    styles_json TEXT NOT NULL DEFAULT '[]',
    precise_location INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);

  CREATE TABLE IF NOT EXISTS images (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_path TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS images_user_idx ON images(user_id);

  CREATE TABLE IF NOT EXISTS wardrobe_items (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_id TEXT REFERENCES images(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    color TEXT NOT NULL,
    pattern TEXT NOT NULL DEFAULT '',
    material TEXT NOT NULL DEFAULT '',
    formality TEXT NOT NULL DEFAULT 'Casual',
    season TEXT NOT NULL DEFAULT 'All seasons',
    notes TEXT NOT NULL DEFAULT '',
    favorite INTEGER NOT NULL DEFAULT 0,
    available INTEGER NOT NULL DEFAULT 1,
    worn INTEGER NOT NULL DEFAULT 0,
    added_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS wardrobe_user_idx ON wardrobe_items(user_id, added_at DESC);

  CREATE TABLE IF NOT EXISTS outfits (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_ids_json TEXT NOT NULL,
    title TEXT NOT NULL,
    blurb TEXT NOT NULL,
    why TEXT NOT NULL,
    occasion_fit TEXT NOT NULL,
    weather_fit TEXT NOT NULL,
    styling_notes TEXT NOT NULL,
    compromise_note TEXT NOT NULL DEFAULT '',
    shopping_suggestion TEXT NOT NULL DEFAULT '',
    worn INTEGER NOT NULL DEFAULT 0,
    saved_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS outfits_user_idx ON outfits(user_id, saved_at DESC);

  CREATE TABLE IF NOT EXISTS rate_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS rate_events_lookup_idx ON rate_events(user_id, action, created_at);
`);

if (process.env.NODE_ENV !== 'production') globalForDb.__closetDb = db;

export { dataDir, db };

export function userView(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    city: row.city,
    styles: JSON.parse(row.styles_json || '[]'),
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
    worn: row.worn,
    addedAt: row.added_at,
    imageId: row.image_id,
    image: row.image_id ? `/api/assets/${row.image_id}` : '',
  };
}

export function outfitView(row, itemsById) {
  const itemIds = JSON.parse(row.item_ids_json || '[]');
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
    savedAt: new Date(row.saved_at).toISOString(),
    items: itemIds.map((id) => itemsById.get(id)).filter(Boolean),
  };
}
