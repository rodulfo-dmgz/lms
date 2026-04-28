const ROLE_LABELS = {
    admin:             'Administrateur',
    formateur_editeur: 'Formateur Éditeur',
    formateur:         'Formateur',
    stagiaire:         'Stagiaire',
    invite:            'Invité',
};

const MODULE_ICONS = [
    'book-open', 'layers', 'cpu', 'network', 'shield',
    'code-2', 'database', 'settings', 'monitor', 'server',
];

const TYPE_ICONS = { motivation: '🚀', citation: '💡', conseil: '✨' };

export function renderDashboard(container, { profile, progressSummary, dailyMessage, contextualMessage, role }) {
    const totalSeances   = progressSummary.reduce((s, c) => s + (c.total_seances || 0), 0);
    const totalTerminees = progressSummary.reduce((s, c) => s + (c.terminees     || 0), 0);
    const globalPct      = totalSeances ? Math.round(totalTerminees / totalSeances * 100) : 0;
    const inProgress     = progressSummary.filter(c => c.pourcentage > 0 && c.pourcentage < 100).length;
    const completed      = progressSummary.filter(c => c.pourcentage === 100).length;

    container.innerHTML = `
    <div class="page-dashboard">

      <!-- Welcome banner -->
      <div class="dashboard-welcome">
        <div class="dashboard-welcome__tag">
          <i data-lucide="shield-check" aria-hidden="true"></i>
          <span>${profile?.titre_pro?.intitule || ROLE_LABELS[role] || role}</span>
        </div>
        <h1 class="dashboard-welcome__title">
          Bonjour, <span>${escapeText(profile?.prenom || '')}</span> !
        </h1>
        <p class="dashboard-welcome__subtitle">
          Retrouvez ici votre progression et accédez directement à vos modules de formation.
        </p>
        <div class="dashboard-welcome__actions">
          <a href="#/modules" class="btn btn-cta">
            <i data-lucide="book-open" aria-hidden="true"></i>
            Mes modules
          </a>
        </div>
      </div>

      ${contextualMessage ? `
      <div class="dashboard-contextual" role="status">
        <i data-lucide="trending-up" aria-hidden="true" style="width:18px;height:18px;flex-shrink:0"></i>
        ${escapeText(contextualMessage)}
      </div>` : ''}

      ${dailyMessage ? `
      <div class="dashboard-message" role="complementary" aria-label="Message du jour">
        <div class="dashboard-message__icon">${TYPE_ICONS[dailyMessage.type] || '💬'}</div>
        <div class="dashboard-message__content">
          <span class="dashboard-message__label">${dailyMessage.type || 'Message'}</span>
          <p class="dashboard-message__text">${escapeText(dailyMessage.texte)}</p>
        </div>
      </div>` : ''}

      <!-- KPIs -->
      <div class="dashboard-kpis stagger-children">
        <div class="kpi-card">
          <div class="kpi-card__icon">
            <i data-lucide="layers" aria-hidden="true"></i>
          </div>
          <span class="kpi-card__label">Séances terminées</span>
          <div class="kpi-card__value">${totalTerminees}</div>
          <div class="kpi-card__sub">sur ${totalSeances} au total</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card__icon">
            <i data-lucide="trending-up" aria-hidden="true"></i>
          </div>
          <span class="kpi-card__label">Progression globale</span>
          <div class="kpi-card__value" style="color:var(--action-secondary)">${globalPct}%</div>
          <div class="kpi-card__sub">de la formation</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card__icon">
            <i data-lucide="play-circle" aria-hidden="true"></i>
          </div>
          <span class="kpi-card__label">Modules en cours</span>
          <div class="kpi-card__value">${inProgress}</div>
          <div class="kpi-card__sub">modules actifs</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card__icon" style="background:var(--semantic-success-bg);color:var(--semantic-success)">
            <i data-lucide="check-circle-2" aria-hidden="true"></i>
          </div>
          <span class="kpi-card__label">Modules terminés</span>
          <div class="kpi-card__value" style="color:var(--semantic-success)">${completed}</div>
          <div class="kpi-card__sub">sur ${progressSummary.length}</div>
        </div>
      </div>

      <!-- Barre globale -->
      ${totalSeances > 0 ? `
      <div class="dashboard-global-progress">
        <div class="dashboard-global-progress__header">
          <span class="dashboard-global-progress__label">Progression globale du parcours</span>
          <span class="dashboard-global-progress__pct">${globalPct}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-bar__fill" style="width:${globalPct}%"
               role="progressbar" aria-valuenow="${globalPct}"
               aria-valuemin="0" aria-valuemax="100"
               aria-label="Progression globale : ${globalPct}%"></div>
        </div>
      </div>` : ''}

      <!-- Modules -->
      ${progressSummary.length ? `
      <section aria-labelledby="dash-modules-title">
        <h2 class="section-title" id="dash-modules-title">
          <i data-lucide="book-open" aria-hidden="true"></i>
          Mes modules
        </h2>
        <div class="modules-grid stagger-children">
          ${progressSummary.map((c, i) => buildModuleCard(c, i)).join('')}
        </div>
      </section>` : `
      <div class="card">
        <p class="empty-state">
          <i data-lucide="inbox" style="width:32px;height:32px;display:block;margin:0 auto var(--space-3)"></i>
          Aucun module assigné pour le moment.
        </p>
      </div>`}

    </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons();

    container.querySelectorAll('.module-card[data-cours-id]').forEach(el => {
        el.addEventListener('click', () => {
            window.location.hash = `#/modules/${el.dataset.coursId}`;
        });
        el.setAttribute('tabindex', '0');
        el.addEventListener('keydown', e => { if (e.key === 'Enter') el.click(); });
    });
}

function buildModuleCard(c, idx) {
    const pct  = c.pourcentage || 0;
    const icon = MODULE_ICONS[idx % MODULE_ICONS.length];
    const badge = pct === 100
        ? `<span class="badge badge-success">Terminé</span>`
        : pct > 0
        ? `<span class="badge badge-primary">En cours</span>`
        : '';

    return `
    <div class="module-card" data-cours-id="${c.cours_id}"
         role="button" aria-label="Accéder au module ${escapeText(c.cours_titre)}">
      <div class="module-card__top">
        <div class="module-card__icon">
          <i data-lucide="${icon}" aria-hidden="true"></i>
        </div>
        ${badge}
      </div>
      <div class="module-card__body">
        <div class="module-card__index">Module ${idx + 1}</div>
        <div class="module-card__title">${escapeText(c.cours_titre)}</div>
        <div class="module-card__meta">${c.total_seances} séance${c.total_seances > 1 ? 's' : ''}</div>
      </div>
      <div class="module-card__footer">
        <div class="module-card__prog-header">
          <span>Progression</span>
          <span class="module-card__prog-pct">${pct}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-bar__fill" style="width:${pct}%"
               role="progressbar" aria-valuenow="${pct}"
               aria-valuemin="0" aria-valuemax="100"></div>
        </div>
        <div class="module-card__prog-detail">
          ${c.terminees} / ${c.total_seances} séances terminées
        </div>
      </div>
    </div>`;
}

function escapeText(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}
