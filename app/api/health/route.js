import { NextResponse } from 'next/server';
import { assertDatabase, db } from '@/src/server/db';

export async function GET() {
  const { error } = await db().from('users').select('id', { head: true }).limit(1);
  assertDatabase(error, 'Database health check failed');
  return NextResponse.json({ ok: true });
}
