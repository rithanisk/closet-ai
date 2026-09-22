import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/src/server/auth';
import { db, userView } from '@/src/server/db';
import { apiError, assertSameOrigin, HttpError, jsonBody } from '@/src/server/http';

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  city: z.string().trim().max(100),
  styles: z.array(z.string().trim().min(1).max(40)).max(12),
  preciseLocation: z.boolean(),
});

export async function PATCH(request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const input = await jsonBody(request, schema);
    const duplicate = db.prepare('SELECT id FROM users WHERE email = ? AND id <> ?').get(input.email, user.id);
    if (duplicate) throw new HttpError(409, 'That email is already in use.');
    db.prepare('UPDATE users SET name = ?, email = ?, city = ?, styles_json = ?, precise_location = ? WHERE id = ?')
      .run(input.name, input.email, input.city, JSON.stringify(input.styles), input.preciseLocation ? 1 : 0, user.id);
    return NextResponse.json({ user: userView(db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)) });
  } catch (error) { return apiError(error); }
}
