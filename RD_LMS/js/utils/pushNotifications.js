/**
 * pushNotifications.js — Gestion des Web Push Notifications
 *
 * Usage (dans app.js, après login) :
 *   import { initPushNotifications } from './utils/pushNotifications.js';
 *   initPushNotifications(profile.id);
 */

import { db } from '../lib/supabaseClient.js';

// !! Remplacer par votre clé VAPID publique (voir README_PUSH.md)
const VAPID_PUBLIC_KEY = 'VOTRE_CLE_VAPID_PUBLIQUE_ICI';

// ── Point d'entrée ──────────────────────────────────────────
export async function initPushNotifications(userId) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.info('[Push] Non supporté par ce navigateur.');
        return;
    }

    try {
        const reg = await navigator.serviceWorker.register('/lms/RD_LMS/service-worker.js', {
            scope: '/lms/RD_LMS/',
        });
        await navigator.serviceWorker.ready;

        // Ne pas redemander la permission si déjà accordée/refusée
        if (Notification.permission === 'denied') return;

        // Vérifier si une subscription existe déjà
        const existing = await reg.pushManager.getSubscription();
        if (existing) {
            await _saveSubscription(userId, existing);
            return;
        }

        // Demander la permission + créer la subscription
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const subscription = await reg.pushManager.subscribe({
            userVisibleOnly:      true,
            applicationServerKey: _urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        await _saveSubscription(userId, subscription);
        console.info('[Push] Subscription enregistrée.');
    } catch (err) {
        console.warn('[Push] Erreur lors de l\'initialisation :', err);
    }
}

// ── Sauvegarder la subscription en base ────────────────────
async function _saveSubscription(userId, subscription) {
    const json  = subscription.toJSON();
    const { error } = await db
        .from('lms_push_subscriptions')
        .upsert({
            user_id:  userId,
            endpoint: json.endpoint,
            p256dh:   json.keys?.p256dh,
            auth:     json.keys?.auth,
        }, { onConflict: 'user_id,endpoint' });

    if (error) console.warn('[Push] Impossible de sauvegarder la subscription :', error);
}

// ── Désabonner (appeler à la déconnexion) ──────────────────
export async function unsubscribePush(userId) {
    try {
        const reg = await navigator.serviceWorker.getRegistration('/lms/RD_LMS/');
        if (!reg) return;
        const sub = await reg.pushManager.getSubscription();
        if (!sub) return;

        const endpoint = sub.endpoint;
        await sub.unsubscribe();

        await db
            .from('lms_push_subscriptions')
            .delete()
            .eq('user_id',  userId)
            .eq('endpoint', endpoint);
    } catch (err) {
        console.warn('[Push] Erreur désabonnement :', err);
    }
}

// ── Utilitaire VAPID ────────────────────────────────────────
function _urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw     = atob(base64);
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}
