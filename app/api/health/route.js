import { NextResponse } from 'next/server';
import { db } from '@/src/server/db';

export function GET() {
  db.prepare('SELECT 1').get();
  return NextResponse.json({ ok: true });
}
