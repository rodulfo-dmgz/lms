/* ═══════════════════════════════════════════════════════════
   DASHBOA_RD — Service Worker
   Gère les Web Push Notifications (background)
═══════════════════════════════════════════════════════════ */

const CACHE_NAME = 'dashboard-v1';

// ── Réception d'un push (navigateur fermé ou app en arrière-plan) ──
self.addEventListener('push', (event) => {
    if (!event.data) return;

    let payload;
    try { payload = event.data.json(); }
    catch { payload = { title: 'DASHBOA_RD', body: event.data.text() }; }

    const title   = payload.title   || 'DASHBOA_RD';
    const options = {
        body:    payload.body    || '',
        icon:    payload.icon    || '/lms/RD_LMS/assets/icons/icon-192.png',
        badge:   payload.badge   || '/lms/RD_LMS/assets/icons/badge-72.png',
        tag:     payload.tag     || 'dashboard-notif',
        data:    { url: payload.url || '/lms/RD_LMS/' },
        actions: payload.actions || [],
        vibrate: [100, 50, 100],
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

// ── Clic sur la notification ────────────────────────────────
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = event.notification.data?.url || '/lms/RD_LMS/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Si l'app est déjà ouverte, focus sur cet onglet
            for (const client of clientList) {
                if (client.url.includes('dashboa') && 'focus' in client) {
                    client.focus();
                    client.navigate(targetUrl);
                    return;
                }
            }
            // Sinon ouvrir un nouvel onglet
            if (clients.openWindow) return clients.openWindow(targetUrl);
        })
    );
});

// ── Activation — nettoyage des anciens caches ───────────────
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((names) =>
            Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
        )
    );
    self.clients.claim();
});
