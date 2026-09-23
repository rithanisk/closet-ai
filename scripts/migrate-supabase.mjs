import fs from 'node:fs/promises';
import postgres from 'postgres';
import { createClient } from '@supabase/supabase-js';

const required = ['DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'SUPABASE_STORAGE_BUCKET'];
for (const name of required) {
  if (!process.env[name]) throw new Error(`${name} is not configured`);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const bucket = process.env.SUPABASE_STORAGE_BUCKET;
const { data: existing, error: readError } = await supabase.storage.getBucket(bucket);
if (readError && !String(readError.message).toLowerCase().includes('not found')) throw readError;
if (!existing) {
  const { error } = await supabase.storage.createBucket(bucket, {
    public: false,
    fileSizeLimit: 20 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  });
  if (error) throw error;
}
console.log('Private Supabase Storage bucket is ready.');

const migration = await fs.readFile(new URL('../supabase/migrations/0001_closet_ai.sql', import.meta.url), 'utf8');
const database = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, ssl: 'require' });
try {
  await database.unsafe(migration);
} finally {
  await database.end();
}

console.log('Supabase Postgres schema is ready.');
