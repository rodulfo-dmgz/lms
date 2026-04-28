/**
 * notificationBell.js — Cloche de notifications dans la topbar
 *
 * Usage (depuis app.js, après renderTopbar) :
 *   import { mountNotificationBell } from './utils/notificationBell.js';
 *   mountNotificationBell(profile.id);
 */

import {
    getNotifications, getUnreadCount,
    markNotificationRead, markAllRead,
    subscribeToNotifications,
} from '../models/NotificationModel.js';
import { safeCall } from '../errorHandler.js';

const TYPE_CFG = {
    devoir_submitted: { icon: 'upload',       color: 'warning' },
    devoir_graded:    { icon: 'star',          color: 'success' },
    quiz_submitted:   { icon: 'help-circle',   color: 'primary' },
    system:           { icon: 'bell',          color: 'neutral' },
};

let _realtimeChannel    = null;
let _docMousedownHandler = null;   // référence unique pour pouvoir la retirer

// ─────────────────────────────────────────────────────────────
//  Point d'entrée
// ─────────────────────────────────────────────────────────────
export async function mountNotificationBell(userId) {
    const slot = document.getElementById('notif-bell-slot');
    if (!slot) return;

    slot.innerHTML = `
    <div class="notif-wrap" id="notif-wrap">
      <button class="topbar-btn notif-bell-btn" id="notif-bell-btn"
              aria-label="Notifications" aria-haspopup="true" aria-expanded="false">
        <i data-lucide="bell" aria-hidden="true"></i>
        <span class="notif-badge notif-badge--hidden" id="notif-badge" aria-live="polite"></span>
      </button>

      <div class="notif-dropdown notif-dropdown--hidden" id="notif-dropdown"
           role="dialog" aria-label="Notifications" style="display:none">
        <div class="notif-dropdown-header">
          <span class="notif-dropdown-title">
            <i data-lucide="bell" aria-hidden="true"></i> Notifications
          </span>
          <button class="btn btn-ghost btn-sm" id="notif-mark-all-btn" title="Tout marquer comme lu">
            <i data-lucide="check-check" aria-hidden="true"></i>
          </button>
        </div>
        <div class="notif-list" id="notif-list">
          <div class="notif-loading">
            <i data-lucide="loader-2" class="spin"></i>
          </div>
        </div>
      </div>
    </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons({ root: slot });

    // Charger les données initiales
    await _refresh(userId);

    // Lier les événements
    _bindEvents(userId);

    // Abonnement temps réel
    _realtimeChannel?.unsubscribe();
    _realtimeChannel = subscribeToNotifications(userId, (notif) => {
        _onNew(notif, userId);
    });
}

// ─────────────────────────────────────────────────────────────
//  Données
// ─────────────────────────────────────────────────────────────
async function _refresh(userId) {
    const [count, notifs] = await Promise.all([
        safeCall(getUnreadCount,   'notif: count'),
        safeCall(getNotifications, 'notif: list'),
    ]);
    _updateBadge(count ?? 0);
    _renderList(notifs ?? [], userId);
}

function _updateBadge(count) {
    const badge = document.getElementById('notif-badge');
    if (!badge) return;
    if (count > 0) {
        badge.textContent = count > 99 ? '99+' : String(count);
        badge.classList.remove('notif-badge--hidden');
    } else {
        badge.textContent = '';
        badge.classList.add('notif-badge--hidden');
    }
}

// ─────────────────────────────────────────────────────────────
//  Rendu liste
// ─────────────────────────────────────────────────────────────
function _renderList(notifs, userId) {
    const list = document.getElementById('notif-list');
    if (!list) return;

    if (!notifs.length) {
        list.innerHTML = `
        <div class="notif-empty">
          <i data-lucide="bell-off" aria-hidden="true"></i>
          <p>Aucune notification</p>
        </div>`;
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: list });
        return;
    }

    list.innerHTML = notifs.map(_renderItem).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: list });

    list.querySelectorAll('.notif-item[data-id]').forEach(item => {
        item.addEventListener('click', () => _onItemClick(item, userId));
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') _onItemClick(item, userId);
        });
    });
}

function _renderItem(n) {
    const cfg    = TYPE_CFG[n.type] || TYPE_CFG.system;
    const isRead = !!n.read_at;
    const time   = _timeAgo(n.created_at);

    return `
    <div class="notif-item ${isRead ? 'notif-item--read' : ''}"
         data-id="${n.id}" data-link="${_esc(n.link || '')}"
         role="button" tabindex="0">
      <div class="notif-item-icon notif-icon--${cfg.color}">
        <i data-lucide="${cfg.icon}" aria-hidden="true"></i>
      </div>
      <div class="notif-item-body">
        <div class="notif-item-title">${_esc(n.title)}</div>
        ${n.message ? `<div class="notif-item-msg">${_esc(n.message)}</div>` : ''}
        <div class="notif-item-time">${time}</div>
      </div>
      ${!isRead ? '<span class="notif-item-dot" aria-hidden="true"></span>' : ''}
    </div>`;
}

// ─────────────────────────────────────────────────────────────
//  Événements
// ─────────────────────────────────────────────────────────────
function _bindEvents(userId) {
    const btn = document.getElementById('notif-bell-btn');

    // Toggle cloche — pas de stopPropagation (le handler capture ci-dessous
    // vérifie lui-même si la cible est dans notif-wrap)
    btn?.addEventListener('click', () => {
        const dropdown = document.getElementById('notif-dropdown');
        const isHidden = dropdown?.style.display === 'none' || !dropdown?.style.display;
        isHidden ? _open(userId) : _close();
    });

    // ── Fermer au clic/toucher extérieur — phase CAPTURE ─────────────
    // La phase capture se déclenche AVANT tout stopPropagation() des enfants.
    if (_docMousedownHandler) {
        document.removeEventListener('mousedown', _docMousedownHandler, true);
    }
    _docMousedownHandler = (e) => {
        const wrap = document.getElementById('notif-wrap');
        if (!wrap?.contains(e.target)) _close();
    };
    document.addEventListener('mousedown', _docMousedownHandler, true);

    // Fermer à la touche Echap
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') _close(); });

    // Tout marquer comme lu
    document.getElementById('notif-mark-all-btn')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        await safeCall(markAllRead, 'notif: mark all');
        await _refresh(userId);
    });
}

function _open(userId) {
    const dropdown = document.getElementById('notif-dropdown');
    const btn      = document.getElementById('notif-bell-btn');
    if (!dropdown || !btn) return;

    // Positionner en fixed sous le bouton, quelle que soit la mise en page
    const rect = btn.getBoundingClientRect();
    Object.assign(dropdown.style, {
        position: 'fixed',
        top:      `${rect.bottom + 6}px`,
        right:    `${window.innerWidth - rect.right}px`,
        left:     'auto',
        display:  'flex',   // inline style — prioritaire sur toute classe CSS
    });

    dropdown.classList.remove('notif-dropdown--hidden');
    btn.setAttribute('aria-expanded', 'true');
    _refresh(userId);
}

function _close() {
    const dropdown = document.getElementById('notif-dropdown');
    const btn      = document.getElementById('notif-bell-btn');
    if (dropdown) {
        dropdown.style.display = 'none';   // inline — garantit la disparition
        dropdown.classList.add('notif-dropdown--hidden');
    }
    btn?.setAttribute('aria-expanded', 'false');
}

async function _onItemClick(item, userId) {
    const id   = item.dataset.id;
    const link = item.dataset.link;

    if (!item.classList.contains('notif-item--read')) {
        item.classList.add('notif-item--read');
        item.querySelector('.notif-item-dot')?.remove();
        await safeCall(() => markNotificationRead(id), 'notif: mark read');
        const count = await safeCall(getUnreadCount, 'notif: count');
        _updateBadge(count ?? 0);
    }

    if (link) {
        _close();
        window.location.hash = `#${link}`;
    }
}

// ─────────────────────────────────────────────────────────────
//  Temps réel
// ─────────────────────────────────────────────────────────────
function _onNew(notif, userId) {
    // Incrémenter le badge
    const badge   = document.getElementById('notif-badge');
    const current = parseInt(badge?.textContent || '0', 10);
    _updateBadge(isNaN(current) ? 1 : current + 1);

    // Ajouter en tête de liste si le dropdown est ouvert
    const list     = document.getElementById('notif-list');
    const dropdown = document.getElementById('notif-dropdown');
    if (list && !dropdown?.classList.contains('notif-dropdown--hidden')) {
        const tmp = document.createElement('div');
        tmp.innerHTML = _renderItem(notif);
        const el = tmp.firstElementChild;
        el?.addEventListener('click', () => _onItemClick(el, userId));
        list.prepend(el);
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: el });
    }

    // Animation de la cloche
    const btn = document.getElementById('notif-bell-btn');
    btn?.classList.add('notif-bell--ring');
    setTimeout(() => btn?.classList.remove('notif-bell--ring'), 800);
}

// ─────────────────────────────────────────────────────────────
//  Utilitaires
// ─────────────────────────────────────────────────────────────
function _timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1)   return 'À l\'instant';
    if (mins < 60)  return `Il y a ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs  < 24)  return `Il y a ${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7)   return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function _esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}
