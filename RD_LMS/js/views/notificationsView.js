/**
 * notificationsView.js — Page complète des notifications
 */

const TYPE_CFG = {
    devoir_submitted: { icon: 'upload',      color: 'warning',  label: 'Dépôt devoir'    },
    devoir_graded:    { icon: 'star',         color: 'success',  label: 'Devoir corrigé'  },
    quiz_submitted:   { icon: 'help-circle',  color: 'primary',  label: 'Quiz soumis'     },
    system:           { icon: 'bell',         color: 'neutral',  label: 'Système'         },
};

/**
 * @param {HTMLElement} container
 * @param {{ notifs: Array, onMarkAll: Function, onMarkOne: Function }} opts
 */
export function renderNotificationsPage(container, { notifs, onMarkAll, onMarkOne }) {
    const unreadCount  = notifs.filter(n => !n.read_at).length;
    const todayNotifs  = _groupToday(notifs);
    const olderNotifs  = _groupOlder(notifs);

    container.innerHTML = `
    <div class="notif-page">

      <!-- En-tête page -->
      <div class="notif-page-header">
        <div class="notif-page-title-wrap">
          <i data-lucide="bell" aria-hidden="true"></i>
          <h1 class="notif-page-title">Notifications</h1>
          ${unreadCount > 0 ? `<span class="notif-page-badge">${unreadCount} non lue${unreadCount > 1 ? 's' : ''}</span>` : ''}
        </div>
        ${unreadCount > 0 ? `
        <button class="btn btn-ghost btn-sm notif-page-mark-all" id="np-mark-all">
          <i data-lucide="check-check" aria-hidden="true"></i>
          Tout marquer comme lu
        </button>` : ''}
      </div>

      <!-- Corps -->
      <div class="notif-page-body">
        ${notifs.length === 0 ? _renderEmpty() : `
          ${todayNotifs.length  ? _renderGroup("Aujourd'hui",      todayNotifs)  : ''}
          ${olderNotifs.length  ? _renderGroup('Plus anciennes',   olderNotifs)  : ''}
        `}
      </div>

    </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });

    // Tout marquer comme lu
    document.getElementById('np-mark-all')?.addEventListener('click', () => onMarkAll());

    // Clic sur un item → marquer lu + naviguer
    container.querySelectorAll('.np-item[data-id]').forEach(item => {
        item.addEventListener('click', () => _handleItemClick(item, onMarkOne));
    });
}

// ─────────────────────────────────────────────────────────────
//  Rendu groupes
// ─────────────────────────────────────────────────────────────
function _renderEmpty() {
    return `
    <div class="notif-page-empty">
      <i data-lucide="bell-off" aria-hidden="true"></i>
      <p>Aucune notification pour l'instant</p>
      <span>Vous serez notifié ici de toute activité vous concernant.</span>
    </div>`;
}

function _renderGroup(label, notifs) {
    return `
    <div class="np-group">
      <div class="np-group-label">${label}</div>
      <div class="np-group-list">
        ${notifs.map(_renderItem).join('')}
      </div>
    </div>`;
}

function _renderItem(n) {
    const cfg    = TYPE_CFG[n.type] || TYPE_CFG.system;
    const isRead = !!n.read_at;
    const time   = _timeAgo(n.created_at);

    return `
    <div class="np-item ${isRead ? 'np-item--read' : 'np-item--unread'}"
         data-id="${n.id}" data-link="${_esc(n.link || '')}"
         role="button" tabindex="0" aria-label="${_esc(n.title)}">
      <div class="np-item-icon notif-icon--${cfg.color}">
        <i data-lucide="${cfg.icon}" aria-hidden="true"></i>
      </div>
      <div class="np-item-body">
        <div class="np-item-meta">
          <span class="np-item-type">${cfg.label}</span>
          <span class="np-item-time">${time}</span>
        </div>
        <div class="np-item-title">${_esc(n.title)}</div>
        ${n.message ? `<div class="np-item-msg">${_esc(n.message)}</div>` : ''}
      </div>
      ${!isRead ? '<span class="np-item-dot" aria-label="Non lue"></span>' : ''}
    </div>`;
}

// ─────────────────────────────────────────────────────────────
//  Événements
// ─────────────────────────────────────────────────────────────
async function _handleItemClick(item, onMarkOne) {
    const id   = item.dataset.id;
    const link = item.dataset.link;

    if (item.classList.contains('np-item--unread')) {
        item.classList.remove('np-item--unread');
        item.classList.add('np-item--read');
        item.querySelector('.np-item-dot')?.remove();
        await onMarkOne(id);

        // Mettre à jour le badge global (dans la topbar)
        const badge = document.getElementById('notif-badge');
        if (badge) {
            const current = parseInt(badge.textContent || '0', 10);
            const next    = Math.max(0, current - 1);
            if (next === 0) {
                badge.textContent = '';
                badge.classList.add('notif-badge--hidden');
            } else {
                badge.textContent = String(next);
            }
        }
    }

    if (link) window.location.hash = `#${link}`;
}

// ─────────────────────────────────────────────────────────────
//  Groupement par date
// ─────────────────────────────────────────────────────────────
function _groupToday(notifs) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return notifs.filter(n => new Date(n.created_at) >= today);
}

function _groupOlder(notifs) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return notifs.filter(n => new Date(n.created_at) < today);
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
    if (hrs < 24)   return `Il y a ${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7)   return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function _esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}
