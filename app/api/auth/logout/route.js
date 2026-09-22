import { NextResponse } from 'next/server';
import { clearSession } from '@/src/server/auth';
import { apiError, assertSameOrigin } from '@/src/server/http';

export async function POST(request) {
  try {
    assertSameOrigin(request);
    await clearSession();
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
