/**
 * dashboardView.js — Dashboard redesigné (v2)
 * Design source : claude.ai/design — Dashboard.html
 * Pour revenir à l'ancienne version : renommer dashboardView.backup.js → dashboardView.js
 */

const ROLE_LABELS = {
    admin:             'Administrateur',
    formateur_editeur: 'Formateur Éditeur',
    formateur:         'Formateur',
    stagiaire:         'Stagiaire',
    invite:            'Invité',
};

const MODULE_ICONS = [
    'database', 'shield-check', 'users', 'coins', 'messages-square',
    'book-open', 'layers', 'cpu', 'network', 'monitor', 'server', 'code-2',
];

// Icônes Lucide pour le type de message
const TIP_ICON_MAP = { motivation: 'rocket', citation: 'quote', conseil: 'sparkles' };

export function renderDashboard(container, { profile, progressSummary, dailyMessage, contextualMessage, role }) {
    // ── Calculs ───────────────────────────────────────────────
    const totalSeances   = progressSummary.reduce((s, c) => s + (c.total_seances || 0), 0);
    const totalTerminees = progressSummary.reduce((s, c) => s + (c.terminees     || 0), 0);
    const globalPct      = totalSeances ? Math.round(totalTerminees / totalSeances * 100) : 0;
    const inProgress     = progressSummary.filter(c => c.pourcentage > 0 && c.pourcentage < 100).length;
    const completed      = progressSummary.filter(c => c.pourcentage === 100).length;
    const remaining      = progressSummary.length - completed;

    // ── Greeting ──────────────────────────────────────────────
    const hour  = new Date().getHours();
    const salut = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
    const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    const roleLabel = profile?.titre_pro?.intitule || ROLE_LABELS[role] || role || 'Utilisateur';

    // Sous-titre contextuel
    const parts = [];
    if (inProgress > 0) parts.push(`<strong>${inProgress} module${inProgress > 1 ? 's' : ''}</strong> en cours`);
    if (totalSeances > 0) parts.push(`<strong>${totalTerminees} / ${totalSeances}</strong> séances terminées`);
    const greetSub = parts.length ? parts.join(' · ') + '.' : 'Retrouvez ici votre progression et vos modules.';

    // ── Stats sparkline data (basé sur progression) ───────────
    const sparkSteps = 10;
    const sparkData  = Array.from({ length: sparkSteps }, (_, i) =>
        Math.round(globalPct * (i + 1) / sparkSteps)
    );

    container.innerHTML = `
    <div class="page-dashboard">

      <!-- ══ Greeting ══ -->
      <div class="dash-greeting">
        <div>
          <div class="dash-greeting__eyebrow">
            <span class="dash-role-pill">
              <i data-lucide="shield-check" aria-hidden="true"></i>
              ${esc(roleLabel)}
            </span>
            <span class="dash-greeting__date">${today}</span>
          </div>
          <h1 class="dash-greeting__title">
            ${esc(salut)}, <span>${esc(profile?.prenom || '')}${profile?.nom ? '&nbsp;' + esc(profile.nom) : ''}</span>.
          </h1>
          <p class="dash-greeting__sub">${greetSub}</p>
        </div>
        <div class="dash-greeting__actions">
          <a href="#/modules" class="btn btn-secondary">
            <i data-lucide="calendar" aria-hidden="true"></i> Mes modules
          </a>
          ${inProgress > 0 || completed < progressSummary.length ? `
          <a href="#/modules" class="btn btn-cta">
            <i data-lucide="book-open" aria-hidden="true"></i> Reprendre
          </a>` : ''}
        </div>
      </div>

      <!-- ══ Tip strip ══ -->
      ${(dailyMessage || contextualMessage) ? `
      <div class="dash-tip" id="dash-tip">
        <div class="dash-tip__icon">
          <i data-lucide="${dailyMessage ? (TIP_ICON_MAP[dailyMessage.type] || 'sparkles') : 'trending-up'}" aria-hidden="true"></i>
        </div>
        <div class="dash-tip__body">
          <div class="dash-tip__label">${esc(dailyMessage?.type || 'Info')}</div>
          <div class="dash-tip__text">${esc(dailyMessage?.texte || contextualMessage || '')}</div>
        </div>
        <button class="dash-tip__close" id="dash-tip-close" aria-label="Fermer">
          <i data-lucide="x" aria-hidden="true"></i>
        </button>
      </div>` : ''}

      <!-- ══ Section header : Vue d'ensemble ══ -->
      <div class="dash-section-header">
        <h2 class="dash-section-title">Vue d'ensemble <span class="dash-count">4</span></h2>
      </div>

      <!-- ══ Stats bar ══ -->
      <div class="dash-stats">
        ${buildStat({
            icon:     'layers',
            label:    'Séances terminées',
            value:    totalTerminees,
            suffix:   `/ ${totalSeances}`,
            barPct:   totalSeances ? Math.round(totalTerminees / totalSeances * 100) : 0,
            barColor: '',
            meta:     `${totalSeances ? Math.round(totalTerminees / totalSeances * 100) : 0}% du cursus`,
            trend:    totalTerminees > 0 ? 'up' : '',
        })}
        ${buildStat({
            icon:      'trending-up',
            label:     'Progression globale',
            value:     globalPct,
            suffix:    '%',
            sparkData,
            meta:      'formation complète',
            trend:     globalPct > 0 ? 'up' : '',
        })}
        ${buildStat({
            icon:     'play-circle',
            label:    'Modules en cours',
            value:    inProgress,
            suffix:   'actifs',
            barPct:   progressSummary.length ? Math.round(inProgress / progressSummary.length * 100) : 0,
            barColor: 'var(--semantic-warning)',
            meta:     `sur ${progressSummary.length} au total`,
        })}
        ${buildStat({
            icon:     'check-circle-2',
            label:    'Modules terminés',
            value:    completed,
            suffix:   `/ ${progressSummary.length}`,
            barPct:   progressSummary.length ? Math.round(completed / progressSummary.length * 100) : 0,
            barColor: 'var(--semantic-success)',
            meta:     remaining > 0 ? `${remaining} restant${remaining > 1 ? 's' : ''}` : 'Formation complète !',
            trend:    completed > 0 ? 'up' : '',
        })}
      </div>

      <!-- ══ Grille 2 colonnes ══ -->
      <div class="dash-grid-2">

        <!-- Colonne gauche : modules -->
        <div>
          <div class="dash-section-header">
            <h2 class="dash-section-title">
              Modules assignés <span class="dash-count">${progressSummary.length}</span>
            </h2>
            <a href="#/modules" class="dash-section-link">
              Tout voir <i data-lucide="arrow-up-right" aria-hidden="true"></i>
            </a>
          </div>

          <div class="dash-panel">
            <div class="dash-panel__head">
              <h3 class="dash-panel__title">
                <i data-lucide="graduation-cap" aria-hidden="true"></i>
                Mes modules
              </h3>
              <div class="dash-tabs" role="tablist" aria-label="Filtrer les modules">
                <button class="dash-tab active" data-tab="all" role="tab" aria-selected="true">
                  Tous · ${progressSummary.length}
                </button>
                <button class="dash-tab" data-tab="active" role="tab" aria-selected="false">
                  En cours · ${inProgress}
                </button>
                <button class="dash-tab" data-tab="done" role="tab" aria-selected="false">
                  Terminés · ${completed}
                </button>
              </div>
            </div>

            <div id="dash-modules-list">
              ${progressSummary.length
                ? progressSummary.map((c, i) => buildModuleRow(c, i)).join('')
                : `<div class="dash-empty">
                     <div class="dash-empty__icon"><i data-lucide="inbox" aria-hidden="true"></i></div>
                     <span>Aucun module assigné pour le moment.</span>
                   </div>`}
            </div>
          </div>
        </div>

        <!-- Colonne droite : widgets -->
        <div>
          <div class="dash-section-header">
            <h2 class="dash-section-title">Aperçu</h2>
          </div>

          <!-- Ring de progression -->
          <div class="dash-widget">
            <div class="dash-widget__title">
              <i data-lucide="pie-chart" aria-hidden="true"></i>
              Avancement du cursus
            </div>
            <div class="dash-progress-ring">
              <div class="dash-ring" style="--pct:${globalPct}" role="img" aria-label="Progression ${globalPct}%">
                <div class="dash-ring__num">${globalPct}<small>%</small></div>
              </div>
              <div class="dash-ring-meta">
                <div class="dash-ring-row">
                  <span>Séances complétées</span>
                  <strong>${totalTerminees} / ${totalSeances}</strong>
                </div>
                <div class="dash-ring-row">
                  <span>Modules terminés</span>
                  <strong>${completed} / ${progressSummary.length}</strong>
                </div>
                <div class="dash-ring-row">
                  <span>Statut</span>
                  <strong>${globalPct === 100 ? '✓ Complété' : globalPct > 0 ? 'En cours' : 'Non démarré'}</strong>
                </div>
              </div>
            </div>
          </div>

          <!-- Modules récemment actifs -->
          ${buildRecentActivity(progressSummary)}
        </div>

      </div>
    </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });

    // ── Fermer le tip ─────────────────────────────────────────
    container.querySelector('#dash-tip-close')?.addEventListener('click', () => {
        container.querySelector('#dash-tip')?.remove();
    });

    // ── Onglets modules ───────────────────────────────────────
    container.querySelectorAll('.dash-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.dash-tab').forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');

            const tab = btn.dataset.tab;
            container.querySelectorAll('.dash-module-row').forEach(row => {
                const status = row.dataset.status;
                const show = tab === 'all'
                    || (tab === 'active' && status === 'in-progress')
                    || (tab === 'done'   && status === 'done');
                row.style.display = show ? '' : 'none';
            });
        });
    });

    // ── Navigation vers module ────────────────────────────────
    container.querySelectorAll('.dash-module-row[data-cours-id]').forEach(row => {
        row.addEventListener('click', () => {
            window.location.hash = `#/modules/${row.dataset.coursId}`;
        });
        row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') row.click(); });
    });
}

// ─────────────────────────────────────────────────────────
//  Helpers HTML
// ─────────────────────────────────────────────────────────

function buildStat({ icon, label, value, suffix, barPct = 0, barColor = '', sparkData = null, meta = '', trend = '' }) {
    const bar = sparkData
        ? `<div class="dash-sparkline" aria-hidden="true">
             ${sparkData.map((h, i) =>
               `<span class="dash-spark-bar${i >= sparkData.length - 4 ? ' lit' : ''}" style="height:${Math.max(h, 4)}%"></span>`
             ).join('')}
           </div>`
        : `<div class="dash-stat__bar">
             <div class="dash-stat__bar-fill" style="width:${barPct}%;${barColor ? `background:${barColor}` : ''}"></div>
           </div>`;

    const trendHtml = trend === 'up'
        ? `<span class="dash-stat__trend"><i data-lucide="arrow-up" aria-hidden="true"></i></span>`
        : '';

    return `
    <div class="dash-stat">
      <div class="dash-stat__head">
        <span class="dash-stat__icon"><i data-lucide="${icon}" aria-hidden="true"></i></span>
        <span class="dash-stat__label">${label}</span>
      </div>
      <div class="dash-stat__value">
        <span class="dash-stat__num">${value}</span>
        <span class="dash-stat__suffix">${suffix}</span>
      </div>
      ${bar}
      <div class="dash-stat__meta">
        <span>${meta}</span>
        ${trendHtml}
      </div>
    </div>`;
}

function buildModuleRow(c, idx) {
    const pct    = c.pourcentage || 0;
    const status = pct === 100 ? 'done' : pct > 0 ? 'in-progress' : 'pending';
    const statusLabel = status === 'done' ? 'Terminé' : status === 'in-progress' ? 'En cours' : 'À démarrer';
    const icon   = MODULE_ICONS[idx % MODULE_ICONS.length];

    return `
    <div class="dash-module-row dash-module-row--${status}"
         data-cours-id="${c.cours_id}"
         data-status="${status}"
         role="button"
         tabindex="0"
         aria-label="Accéder au module ${esc(c.cours_titre)}">
      <div class="dash-module-row__icon">
        <i data-lucide="${icon}" aria-hidden="true"></i>
      </div>
      <div class="dash-module-row__meta">
        <div class="dash-module-row__name">
          ${esc(c.cours_titre)}
          <span class="dash-badge dash-badge--${status}">
            <span class="dash-badge-dot"></span>${statusLabel}
          </span>
        </div>
        <div class="dash-module-row__sub">
          Module ${idx + 1}
          <span class="dot">·</span>
          ${c.total_seances} séance${c.total_seances > 1 ? 's' : ''}
          <span class="dot">·</span>
          ${c.terminees} terminée${c.terminees > 1 ? 's' : ''}
        </div>
      </div>
      <div class="dash-module-progress">
        <div class="dash-module-progress__label">${pct}%</div>
        <div class="dash-module-progress__bar">
          <div class="dash-module-progress__fill" style="width:${pct}%"></div>
        </div>
      </div>
      <div class="dash-module-action" aria-hidden="true">
        <i data-lucide="chevron-right"></i>
      </div>
    </div>`;
}

function buildRecentActivity(progressSummary) {
    // Modules récemment actifs (en cours ou terminés, triés par % desc)
    const active = progressSummary
        .filter(c => c.pourcentage > 0)
        .sort((a, b) => b.pourcentage - a.pourcentage)
        .slice(0, 3);

    if (!active.length) return '';

    return `
    <div class="dash-widget">
      <div class="dash-widget__title">
        <i data-lucide="activity" aria-hidden="true"></i>
        Modules actifs
      </div>
      ${active.map(c => {
          const pct    = c.pourcentage || 0;
          const done   = pct === 100;
          return `
          <div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-2) 0;border-bottom:1px dashed var(--border-light)">
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:500;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                ${esc(c.cours_titre)}
              </div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:2px">
                ${c.terminees} / ${c.total_seances} séances
              </div>
            </div>
            <span style="font-family:'Geist Mono',monospace;font-size:12px;font-weight:500;color:${done ? 'var(--semantic-success)' : 'var(--text-secondary)'}">
              ${pct}%
            </span>
          </div>`;
      }).join('')}
      <div style="border-bottom:none!important"></div>
    </div>`;
}

function esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}
