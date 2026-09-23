import { NextResponse } from 'next/server';
import { clearSession, requireUser } from '@/src/server/auth';
import { assertDatabase, db } from '@/src/server/db';
import { apiError, assertSameOrigin } from '@/src/server/http';
import { deleteUserFiles } from '@/src/server/storage';

export async function DELETE(request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    await deleteUserFiles(user.id);
    const database = db();
    const { error: rateError } = await database.from('rate_events').delete().eq('user_id', user.id);
    assertDatabase(rateError, 'Could not delete account rate history');
    const { error: userError } = await database.from('users').delete().eq('id', user.id);
    assertDatabase(userError, 'Could not delete account');
    await clearSession();
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
