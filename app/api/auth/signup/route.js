import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSession, hashPassword } from '@/src/server/auth';
import { assertDatabase, db, userView } from '@/src/server/db';
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
    await enforceRateLimit(`signup:${clientAddress}`, 'signup', 10, 60 * 60 * 1000);
    const input = await jsonBody(request, schema);
    const database = db();
    const { data: existing, error: existingError } = await database.from('users').select('id').eq('email', input.email).maybeSingle();
    assertDatabase(existingError, 'Could not check account');
    if (existing) throw new HttpError(409, 'An account with that email already exists.');
    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(input.password);
    const { error: insertError } = await database.from('users').insert({ id, email: input.email, password_hash: passwordHash, name: input.name, city: input.city, styles_json: input.styles, precise_location: false, created_at: Date.now() });
    assertDatabase(insertError, 'Could not create account');
    await createSession(id);
    const { data: user, error: userError } = await database.from('users').select('*').eq('id', id).single();
    assertDatabase(userError, 'Could not load new account');
    return NextResponse.json({ user: userView(user) }, { status: 201 });
  } catch (error) { return apiError(error); }
}
