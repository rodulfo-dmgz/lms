/**
 * NotificationModel.js — CRUD notifications utilisateur
 */

import { db } from '../lib/supabaseClient.js';

/** Récupère les N dernières notifications de l'utilisateur connecté. */
export async function getNotifications(limit = 40) {
    const { data, error } = await db
        .from('lms_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
    if (error) throw error;
    return data ?? [];
}

/** Nombre de notifications non lues. */
export async function getUnreadCount() {
    const { count, error } = await db
        .from('lms_notifications')
        .select('*', { count: 'exact', head: true })
        .is('read_at', null);
    if (error) throw error;
    return count ?? 0;
}

/** Marque une notification comme lue. */
export async function markNotificationRead(id) {
    const { error } = await db
        .from('lms_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id)
        .is('read_at', null);
    if (error) throw error;
}

/** Marque toutes les notifications non lues comme lues (via RPC). */
export async function markAllRead() {
    const { error } = await db.rpc('mark_all_notifications_read');
    if (error) throw error;
}

/**
 * Souscrit aux nouvelles notifications en temps réel.
 * Retourne le channel Supabase (appeler .unsubscribe() pour se désabonner).
 */
export function subscribeToNotifications(userId, onNew) {
    return db
        .channel(`lms-notif-${userId}`)
        .on('postgres_changes', {
            event:  'INSERT',
            schema: 'public',
            table:  'lms_notifications',
            filter: `user_id=eq.${userId}`,
        }, (payload) => onNew(payload.new))
        .subscribe();
}
