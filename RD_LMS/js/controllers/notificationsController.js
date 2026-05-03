/**
 * notificationsController.js — Page complète des notifications
 */

import { safeCall }                                              from '../errorHandler.js';
import { getNotifications, markAllRead, markNotificationRead }  from '../models/NotificationModel.js';
import { renderNotificationsPage }                              from '../views/notificationsView.js';
import { store }                                                from '../store.js';

export async function loadNotifications(container) {
    if (!store.getRole()) { window.location.hash = '#/dashboard'; return; }

    container.innerHTML = `<div class="page-loader"><i data-lucide="loader-2" class="spin"></i></div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });

    await _render(container);
}

async function _render(container) {
    const notifs = await safeCall(() => getNotifications(100), 'notifications') ?? [];

    renderNotificationsPage(container, {
        notifs,
        onMarkAll: async () => {
            await safeCall(markAllRead, 'mark all read');
            await _render(container);
        },
        onMarkOne: async (id) => {
            await safeCall(() => markNotificationRead(id), 'mark read');
        },
    });
}
