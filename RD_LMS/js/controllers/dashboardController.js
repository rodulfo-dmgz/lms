import { getProgressSummary } from '../models/DashboardModel.js';
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

    const profileId = store.state.viewAs?.profileId ?? store.getUser().id;
    const [progressSummary, messages] = await Promise.all([
        safeCall(() => getProgressSummary(profileId), 'dashboard'),
        loadMessages()
    ]);

    const profile           = store.getProfile();
    const dailyMessage      = getNextMessage(messages || [], profile);
    const contextualMessage = buildContextualMessage(progressSummary || []);

    store.setProgressSummary(progressSummary || []);
    store.setDailyMessage(dailyMessage);

    renderDashboard(container, {
        profile,
        progressSummary:  progressSummary || [],
        dailyMessage,
        contextualMessage,
        role: store.getRole(),
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
