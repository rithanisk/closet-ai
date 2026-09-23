import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSession, verifyPassword } from '@/src/server/auth';
import { assertDatabase, db, userView } from '@/src/server/db';
import { apiError, assertSameOrigin, enforceRateLimit, HttpError, jsonBody } from '@/src/server/http';

const schema = z.object({ email: z.string().trim().email(), password: z.string().min(1).max(128) });

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const clientAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    await enforceRateLimit(`login:${clientAddress}`, 'login', 20, 15 * 60 * 1000);
    const input = await jsonBody(request, schema);
    const { data: user, error } = await db().from('users').select('*').eq('email', input.email.toLowerCase()).maybeSingle();
    assertDatabase(error, 'Could not read account');
    if (!user || !(await verifyPassword(input.password, user.password_hash))) throw new HttpError(401, 'Email or password is incorrect.');
    await createSession(user.id);
    return NextResponse.json({ user: userView(user) });
  } catch (error) { return apiError(error); }
}
