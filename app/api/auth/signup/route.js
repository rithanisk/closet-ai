import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSession, hashPassword } from '@/src/server/auth';
import { db, userView } from '@/src/server/db';
import { apiError, assertSameOrigin, enforceRateLimit, HttpError, jsonBody } from '@/src/server/http';

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
  city: z.string().trim().max(100).default(''),
  styles: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
});

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const clientAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    enforceRateLimit(`signup:${clientAddress}`, 'signup', 10, 60 * 60 * 1000, db);
    const input = await jsonBody(request, schema);
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(input.email)) throw new HttpError(409, 'An account with that email already exists.');
    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(input.password);
    db.prepare(`INSERT INTO users (id, email, password_hash, name, city, styles_json, precise_location, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?)`)
      .run(id, input.email, passwordHash, input.name, input.city, JSON.stringify(input.styles), Date.now());
    await createSession(id);
    return NextResponse.json({ user: userView(db.prepare('SELECT * FROM users WHERE id = ?').get(id)) }, { status: 201 });
  } catch (error) { return apiError(error); }
}
