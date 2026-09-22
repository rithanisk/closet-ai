import { NextResponse } from 'next/server';
import { clearSession, requireUser } from '@/src/server/auth';
import { db } from '@/src/server/db';
import { apiError, assertSameOrigin } from '@/src/server/http';
import { deleteUserFiles } from '@/src/server/storage';

export async function DELETE(request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    db.prepare('DELETE FROM rate_events WHERE user_id = ?').run(user.id);
    db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
    await deleteUserFiles(user.id);
    await clearSession();
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
