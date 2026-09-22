import 'server-only';

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function assertSameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return;
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = forwardedHost || request.headers.get('host');
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const protocol = forwardedProto || new URL(request.url).protocol.replace(':', '');
  let actual;
  try { actual = new URL(origin); } catch { throw new HttpError(403, 'Invalid request origin.'); }
  if (!host || actual.host !== host || actual.protocol !== `${protocol}:`) throw new HttpError(403, 'Invalid request origin.');
}

export async function jsonBody(request, schema) {
  let value;
  try {
    value = await request.json();
  } catch {
    throw new HttpError(400, 'Expected a valid JSON request body.');
  }
  return schema.parse(value);
}

export function apiError(error) {
  if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError) return NextResponse.json({ error: 'Please check the submitted fields.', details: error.flatten() }, { status: 400 });
  console.error(error);
  const missingKey = error?.message?.includes('OPENAI_API_KEY');
  return NextResponse.json(
    { error: missingKey ? 'OpenAI is not configured yet. Add OPENAI_API_KEY to .env.local and restart the app.' : 'Something went wrong. Please try again.' },
    { status: missingKey ? 503 : 500 },
  );
}

export function enforceRateLimit(userId, action, limit, windowMs, db) {
  const since = Date.now() - windowMs;
  db.prepare('DELETE FROM rate_events WHERE created_at < ?').run(Date.now() - 24 * 60 * 60 * 1000);
  const row = db.prepare('SELECT COUNT(*) AS count FROM rate_events WHERE user_id = ? AND action = ? AND created_at >= ?').get(userId, action, since);
  if (row.count >= limit) throw new HttpError(429, 'You have reached the temporary usage limit. Please wait a little and try again.');
  db.prepare('INSERT INTO rate_events (user_id, action, created_at) VALUES (?, ?, ?)').run(userId, action, Date.now());
}
