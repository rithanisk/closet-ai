import { NextResponse } from 'next/server';
import { currentUser } from '@/src/server/auth';
import { apiError } from '@/src/server/http';

export async function GET() {
  try {
    const user = await currentUser();
    return user ? NextResponse.json({ user }) : NextResponse.json({ user: null }, { status: 401 });
  } catch (error) { return apiError(error); }
}
