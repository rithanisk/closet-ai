import { NextResponse } from 'next/server';
import { requireUser } from '@/src/server/auth';
import { apiError } from '@/src/server/http';
import { inspirationState } from '@/src/server/inspiration';

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json(await inspirationState(user.id));
  } catch (error) { return apiError(error); }
}
