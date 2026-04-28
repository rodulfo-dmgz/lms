import { db } from '../lib/supabaseClient.js';

export async function signIn(email, password) {
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
}

export async function signOut() {
    const { error } = await db.auth.signOut();
    if (error) throw error;
}

export async function changePassword(newPassword) {
    const { error } = await db.auth.updateUser({ password: newPassword });
    if (error) throw error;
    await db.rpc('mark_first_login_done');
}

export async function getCurrentSession() {
    const { data } = await db.auth.getSession();
    return data.session;
}
