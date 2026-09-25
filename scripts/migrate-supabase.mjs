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

const migrationsDir = new URL('../supabase/migrations/', import.meta.url);
const migrationFiles = (await fs.readdir(migrationsDir)).filter((name) => name.endsWith('.sql')).sort();
const database = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, ssl: 'require' });
try {
  // Every migration is idempotent, so running the full ordered set is safe on each deploy.
  for (const name of migrationFiles) {
    await database.unsafe(await fs.readFile(new URL(name, migrationsDir), 'utf8'));
    console.log(`Applied ${name}`);
  }
} finally {
  await database.end();
}

console.log('Supabase Postgres schema is ready.');
