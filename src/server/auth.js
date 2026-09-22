import 'server-only';

import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { cookies } from 'next/headers';
import { db, userView } from './db';
import { HttpError } from './http';

const scrypt = promisify(crypto.scrypt);
const COOKIE_NAME = 'closet_session';
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${Buffer.from(derived).toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  const [algorithm, salt, expectedHex] = String(stored).split(':');
  if (algorithm !== 'scrypt' || !salt || !expectedHex) return false;
  const derived = Buffer.from(await scrypt(password, salt, 64));
  const expected = Buffer.from(expectedHex, 'hex');
  return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
}

export async function createSession(userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const now = Date.now();
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .run(tokenHash(token), userId, now + SESSION_MS, now);
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MS / 1000,
  });
}

export async function clearSession() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash(token));
  store.delete(COOKIE_NAME);
}

export async function currentUser() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const row = db.prepare(`
    SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ?
  `).get(tokenHash(token), Date.now());
  if (!row) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash(token));
    return null;
  }
  return userView(row);
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new HttpError(401, 'Please sign in to continue.');
  return user;
}
