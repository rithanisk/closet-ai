import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/src/server/auth';
import { assertDatabase, db, userView } from '@/src/server/db';
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
    const database = db();
    const { data: duplicate, error: duplicateError } = await database.from('users').select('id').eq('email', input.email).neq('id', user.id).maybeSingle();
    assertDatabase(duplicateError, 'Could not check email');
    if (duplicate) throw new HttpError(409, 'That email is already in use.');
    const { data: updated, error } = await database.from('users').update({ name: input.name, email: input.email, city: input.city, styles_json: input.styles, precise_location: input.preciseLocation }).eq('id', user.id).select('*').single();
    assertDatabase(error, 'Could not update profile');
    return NextResponse.json({ user: userView(updated) });
  } catch (error) { return apiError(error); }
}
