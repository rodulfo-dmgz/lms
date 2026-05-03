import { getProgressSummary } from '../models/DashboardModel.js';
import { getAdminStats }       from '../models/AdminModel.js';
import { renderDashboard }     from '../views/dashboardView.js';
import { store }               from '../store.js';
import { safeCall }            from '../errorHandler.js';

let messagesCache = null;

export async function loadDashboard(container) {
    container.innerHTML = `<div class="loading">
        <i data-lucide="loader-2" class="spin" aria-hidden="true"></i>
        Chargement…
    </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();

    const role     = store.getRole();
    const isViewAs = !!store.state.viewAs?.profileId;

    // Admin en mode réel (pas de simulation) → charger stats admin
    const isAdminDashboard = role === 'admin' && !isViewAs;

    const profileId = store.getActiveProfileId();
    const [progressSummary, messages, adminStats] = await Promise.all([
        // Toujours charger la progression (utile pour viewAs admin + stagiaire normal)
        safeCall(() => getProgressSummary(profileId), 'dashboard'),
        loadMessages(),
        // Stats admin uniquement si dashboard admin
        isAdminDashboard ? safeCall(getAdminStats, 'admin stats') : Promise.resolve(null),
    ]);

    // Utilise le profil du stagiaire simulé si viewAs actif, sinon le propre profil
    const profile           = store.getActiveProfile();
    const dailyMessage      = getNextMessage(messages || [], profile);
    const contextualMessage = buildContextualMessage(progressSummary || []);

    store.setProgressSummary(progressSummary || []);
    store.setDailyMessage(dailyMessage);

    renderDashboard(container, {
        profile,
        progressSummary:  progressSummary || [],
        dailyMessage,
        contextualMessage,
        role,
        isViewAs,
        adminStats: adminStats || null,
    });
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function loadMessages() {
    if (messagesCache) return messagesCache;
    try {
        const res = await fetch('assets/messages.json');
        messagesCache = await res.json();
        return messagesCache;
    } catch { return []; }
}

// Shuffled queue — never repeats until all messages have been shown
function getNextMessage(messages, profile) {
    if (!messages.length) return null;

    const QUEUE_KEY = 'lms_msg_queue';
    let queue = [];
    try { queue = JSON.parse(localStorage.getItem(QUEUE_KEY)) || []; } catch {}

    if (!queue.length) {
        queue = shuffleArray([...Array(messages.length).keys()]);
    }

    const idx = queue.shift();
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));

    return applyPlaceholders(messages[idx], profile);
}

function applyPlaceholders(msg, profile) {
    if (!msg) return null;
    const titre  = profile?.civilite || '';
    const prenom = profile?.prenom   || '';
    const texte  = msg.texte
        .replace(/\{titre\}/g,        titre)
        .replace(/\{prenom\}/g,       prenom)
        .replace(/\{titre_prenom\}/g, `${titre} ${prenom}`.trim())
        .replace(/\s{2,}/g, ' ')
        .trim();
    return { ...msg, texte };
}

function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function buildContextualMessage(summary) {
    if (!summary.length) return null;
    const inProgress = summary.find(c => c.pourcentage > 0 && c.pourcentage < 100);
    if (inProgress) {
        const left = inProgress.total_seances - inProgress.terminees;
        return `Plus que ${left} séance${left > 1 ? 's' : ''} pour terminer « ${inProgress.cours_titre} » !`;
    }
    if (summary.every(c => c.pourcentage === 100))
        return 'Félicitations, vous avez terminé toutes vos séances ! 🎉';
    return null;
}
