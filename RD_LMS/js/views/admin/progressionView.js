/**
 * progressionView.js — Tableau de progression des stagiaires (admin/formateur)
 *
 * UI :
 *  • Liste de cartes par stagiaire (search + filtre cohorte + export)
 *  • Modal centré : onglets Modules / Quiz / Devoirs
 *    Modules : arbre cours → séquences → séances avec statut par séance
 *  • Export : CSV · XLSX · JSON · PDF liste · PDF individuel
 */

import { getStagiairesProgress, getStagiaireDetail } from '../../models/ProgressAdminModel.js';
import { safeCall } from '../../errorHandler.js';
import {
    exportCSV,
    exportJSON,
    exportXLSX,
    exportPDF,
    exportStudentPDF,
} from '../../utils/exportProgression.js';

// ─── état module-level pour export ───────────────────────────
let _allRows     = [];   // toutes les lignes chargées
let _exportArea  = null; // référence au conteneur liste pour lire le filtre actif

// ─────────────────────────────────────────────────────────────
//  Point d'entrée
// ─────────────────────────────────────────────────────────────
export async function renderProgression(container) {
    container.innerHTML = `
    <div class="prog-page">
      <div class="prog-page-header">
        <div class="prog-page-header__title">
          <i data-lucide="bar-chart-2" aria-hidden="true"></i>
          <h2>Progression des stagiaires</h2>
        </div>
      </div>
      <div id="prog-content">
        <div class="prog-loading">
          <i data-lucide="loader-2" class="spin"></i>
          <span>Chargement…</span>
        </div>
      </div>
    </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });

    const rows = await safeCall(getStagiairesProgress, 'progression: load');
    _renderList(container.querySelector('#prog-content'), rows || []);
}

// ─────────────────────────────────────────────────────────────
//  Liste de cartes
// ─────────────────────────────────────────────────────────────
function _renderList(area, rows) {
    _allRows    = rows;
    _exportArea = area;

    if (!rows.length) {
        area.innerHTML = `
        <div class="prog-empty">
          <i data-lucide="users" aria-hidden="true"></i>
          <p>Aucun stagiaire trouvé.</p>
        </div>`;
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: area });
        return;
    }

    const cohortes = [...new Set(rows.map(r => r.cohorte_nom).filter(Boolean))].sort();

    area.innerHTML = `
    <div class="prog-controls">
      <div class="prog-search-wrap">
        <i data-lucide="search" aria-hidden="true"></i>
        <input type="search" class="prog-search" id="prog-search"
               placeholder="Rechercher un stagiaire…" autocomplete="off">
      </div>
      <select class="form-input form-input--sm prog-filter" id="prog-filter-cohorte">
        <option value="">Toutes les cohortes</option>
        ${cohortes.map(c => `<option value="${_esc(c)}">${_esc(c)}</option>`).join('')}
      </select>
      <span class="prog-count" id="prog-count">
        ${rows.length} stagiaire${rows.length > 1 ? 's' : ''}
      </span>

      <!-- Export dropdown -->
      <div class="prog-export-wrap" id="prog-export-wrap">
        <button class="prog-export-toggle" id="prog-export-toggle"
                type="button" aria-haspopup="true" aria-expanded="false">
          <i data-lucide="download" aria-hidden="true"></i>
          Exporter
          <i data-lucide="chevron-down" class="prog-export-chevron" aria-hidden="true"></i>
        </button>
        <div class="prog-export-menu" id="prog-export-menu" hidden>
          <button class="prog-export-item" data-format="csv" type="button">
            <i data-lucide="file-text" aria-hidden="true"></i>
            CSV
          </button>
          <button class="prog-export-item" data-format="xlsx" type="button">
            <i data-lucide="table-2" aria-hidden="true"></i>
            Excel (XLSX)
          </button>
          <button class="prog-export-item" data-format="json" type="button">
            <i data-lucide="code-2" aria-hidden="true"></i>
            JSON
          </button>
          <div class="prog-export-sep"></div>
          <button class="prog-export-item prog-export-item--pdf" data-format="pdf" type="button">
            <i data-lucide="printer" aria-hidden="true"></i>
            PDF (rapport)
          </button>
        </div>
      </div>
    </div>

    <div class="prog-list" id="prog-list">
      ${rows.map(r => _renderCard(r)).join('')}
    </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons({ root: area });

    // ── Filtre / recherche ───────────────────────────────────
    area.querySelector('#prog-filter-cohorte')?.addEventListener('change', () => _applyFilters(area, rows));
    area.querySelector('#prog-search')?.addEventListener('input',          () => _applyFilters(area, rows));

    // ── Boutons détail ───────────────────────────────────────
    area.querySelectorAll('.prog-card-btn[data-id]').forEach(btn => {
        btn.addEventListener('click', () => _openDetail(btn.dataset.id, btn.dataset.name));
    });

    // ── Export dropdown ──────────────────────────────────────
    _bindExportDropdown(area, rows);
}

function _bindExportDropdown(area, rows) {
    const toggle = area.querySelector('#prog-export-toggle');
    const menu   = area.querySelector('#prog-export-menu');
    if (!toggle || !menu) return;

    const open  = () => { menu.hidden = false; toggle.setAttribute('aria-expanded', 'true'); };
    const close = () => { menu.hidden = true;  toggle.setAttribute('aria-expanded', 'false'); };

    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.hidden ? open() : close();
    });

    document.addEventListener('click', () => close());
    menu.addEventListener('click', e => e.stopPropagation());

    area.querySelectorAll('.prog-export-item[data-format]').forEach(btn => {
        btn.addEventListener('click', async () => {
            close();
            const visibleRows  = _getVisibleRows(area, rows);
            const cohorteName  = area.querySelector('#prog-filter-cohorte')?.value || '';
            const date         = new Date().toISOString().slice(0, 10);
            const base         = `progression_${date}`;

            switch (btn.dataset.format) {
                case 'csv':  exportCSV(visibleRows,  `${base}.csv`);                   break;
                case 'json': exportJSON(visibleRows, `${base}.json`);                  break;
                case 'xlsx': await exportXLSX(visibleRows, `${base}.xlsx`);            break;
                case 'pdf':  exportPDF(visibleRows, 'Rapport de progression', cohorteName); break;
            }
        });
    });
}

function _getVisibleRows(area, rows) {
    const cards   = [...area.querySelectorAll('.prog-card[data-id]')];
    const visible = new Set(
        cards.filter(c => c.style.display !== 'none').map(c => c.dataset.id)
    );
    return rows.filter(r => visible.has(r.id));
}

function _applyFilters(area, rows) {
    const search  = (area.querySelector('#prog-search')?.value || '').toLowerCase().trim();
    const cohorte = area.querySelector('#prog-filter-cohorte')?.value || '';
    const cards   = area.querySelectorAll('.prog-card[data-id]');
    let   visible = 0;

    cards.forEach(card => {
        const name   = (card.dataset.name   || '').toLowerCase();
        const cohNom = (card.dataset.cohorte || '');
        const ok = (!search  || name.includes(search))
                && (!cohorte || cohNom === cohorte);
        card.style.display = ok ? '' : 'none';
        if (ok) visible++;
    });

    const count = area.querySelector('#prog-count');
    if (count) count.textContent = `${visible} stagiaire${visible > 1 ? 's' : ''}`;
}

function _renderCard(r) {
    const name    = `${r.prenom || ''} ${r.nom || ''}`.trim() || r.id;
    const done    = Number(r.seances_terminees ?? 0);
    const total   = Number(r.seances_total ?? 0);
    const pct     = total > 0 ? Math.round(done / total * 100) : 0;
    const pctColor = pct >= 75 ? 'var(--status-success)' : pct >= 30 ? 'var(--status-warning)' : 'var(--action-primary)';

    const quizAvg   = r.quiz_avg_pct != null ? `${r.quiz_avg_pct}%` : null;
    const quizClass = r.quiz_avg_pct != null
        ? (r.quiz_avg_pct >= 70 ? 'prog-chip--success' : 'prog-chip--error')
        : 'prog-chip--neutral';

    const pending  = Number(r.devoirs_pending  ?? 0);
    const graded   = Number(r.devoirs_graded   ?? 0);
    const submitted= Number(r.devoirs_submitted?? 0);
    const lastAct  = r.last_activity ? _timeAgo(r.last_activity) : null;

    return `
    <div class="prog-card" data-id="${r.id}" data-name="${_esc(name)}" data-cohorte="${_esc(r.cohorte_nom || '')}">

      <div class="prog-card__avatar">${_initials(r.prenom, r.nom)}</div>

      <div class="prog-card__main">
        <div class="prog-card__header">
          <div class="prog-card__name">${_esc(name)}</div>
          ${r.cohorte_nom ? `<span class="prog-card__cohorte">${_esc(r.cohorte_nom)}</span>` : ''}
        </div>

        <div class="prog-card__progress">
          <div class="prog-card__bar">
            <div class="prog-card__bar-fill" style="width:${pct}%;background:${pctColor}"></div>
          </div>
          <span class="prog-card__pct" style="color:${pctColor}">${pct}%</span>
          <span class="prog-card__seances">${done} / ${total} séances</span>
        </div>

        <div class="prog-card__chips">
          ${quizAvg
            ? `<span class="prog-chip ${quizClass}">
                 <i data-lucide="help-circle" aria-hidden="true"></i>
                 Quiz : ${quizAvg}
               </span>`
            : `<span class="prog-chip prog-chip--neutral">
                 <i data-lucide="help-circle" aria-hidden="true"></i>
                 Aucun quiz
               </span>`}

          ${submitted > 0
            ? `<span class="prog-chip ${pending > 0 ? 'prog-chip--warning' : 'prog-chip--success'}">
                 <i data-lucide="upload" aria-hidden="true"></i>
                 ${submitted} devoir${submitted > 1 ? 's' : ''}
                 ${pending  > 0 ? `· ${pending} en attente` : ''}
                 ${graded   > 0 ? `· ${graded} noté${graded > 1 ? 's' : ''}` : ''}
               </span>`
            : `<span class="prog-chip prog-chip--neutral">
                 <i data-lucide="upload" aria-hidden="true"></i>
                 Aucun devoir
               </span>`}

          ${lastAct
            ? `<span class="prog-chip prog-chip--neutral">
                 <i data-lucide="clock" aria-hidden="true"></i>
                 ${lastAct}
               </span>`
            : ''}
        </div>
      </div>

      <div class="prog-card__action">
        <div class="prog-card__ring" style="--pct:${pct}">
          <svg viewBox="0 0 36 36" aria-hidden="true">
            <circle class="prog-ring-bg" cx="18" cy="18" r="15.9"/>
            <circle class="prog-ring-fill" cx="18" cy="18" r="15.9"
                    stroke="${pctColor}"
                    stroke-dasharray="${pct} ${100 - pct}"
                    stroke-dashoffset="25"/>
          </svg>
          <span>${pct}%</span>
        </div>
        <button class="btn btn-cta btn-sm prog-card-btn"
                data-id="${r.id}" data-name="${_esc(name)}">
          <i data-lucide="eye" aria-hidden="true"></i>
          Voir
        </button>
      </div>

    </div>`;
}

// ─────────────────────────────────────────────────────────────
//  Modal détail
// ─────────────────────────────────────────────────────────────
async function _openDetail(profileId, name) {
    // Fermer un éventuel modal déjà ouvert
    document.getElementById('prog-modal')?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'prog-modal-overlay';
    overlay.id        = 'prog-modal';
    overlay.innerHTML = `
    <div class="prog-modal" role="dialog" aria-label="Progression de ${_esc(name)}" aria-modal="true">

      <div class="prog-modal-head">
        <div class="prog-modal-head__left">
          <div class="prog-modal-avatar">${name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}</div>
          <div>
            <div class="prog-modal-name">${_esc(name)}</div>
            <div class="prog-modal-subtitle" id="prog-modal-sub">Chargement…</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:var(--space-2)">
          <button class="prog-modal-dl-btn" id="prog-modal-pdf" aria-label="Télécharger PDF" title="Rapport PDF individuel" disabled>
            <i data-lucide="printer" aria-hidden="true"></i>
            PDF
          </button>
          <button class="prog-modal-close" aria-label="Fermer" id="prog-modal-close">
            <i data-lucide="x" aria-hidden="true"></i>
          </button>
        </div>
      </div>

      <!-- Barre de progression globale -->
      <div class="prog-modal-global" id="prog-modal-global"></div>

      <!-- Onglets -->
      <div class="prog-modal-tabs" role="tablist">
        <button class="prog-tab prog-tab--active" role="tab" data-tab="modules" aria-selected="true">
          <i data-lucide="book-open" aria-hidden="true"></i> Modules
        </button>
        <button class="prog-tab" role="tab" data-tab="quiz" aria-selected="false">
          <i data-lucide="help-circle" aria-hidden="true"></i> Quiz
        </button>
        <button class="prog-tab" role="tab" data-tab="devoirs" aria-selected="false">
          <i data-lucide="upload" aria-hidden="true"></i> Devoirs
        </button>
      </div>

      <!-- Corps -->
      <div class="prog-modal-body" id="prog-modal-body">
        <div class="prog-loading">
          <i data-lucide="loader-2" class="spin"></i>
          <span>Chargement des données…</span>
        </div>
      </div>

    </div>`;

    document.body.appendChild(overlay);
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: overlay });

    // Fermeture
    const close = () => overlay.remove();
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('#prog-modal-close')?.addEventListener('click', close);
    document.addEventListener('keydown', function onKey(e) {
        if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
    });

    // Onglets
    overlay.querySelectorAll('.prog-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            overlay.querySelectorAll('.prog-tab').forEach(t => {
                t.classList.toggle('prog-tab--active', t === tab);
                t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
            });
            const active = tab.dataset.tab;
            overlay.querySelectorAll('.prog-panel').forEach(p => {
                p.style.display = p.dataset.panel === active ? '' : 'none';
            });
        });
    });

    // Charger les données
    const detail = await safeCall(() => getStagiaireDetail(profileId), 'prog: detail');
    if (!detail) {
        overlay.querySelector('#prog-modal-body').innerHTML =
            `<p class="text-muted" style="padding:var(--space-6)">Impossible de charger les données.</p>`;
        return;
    }

    _fillModal(overlay, detail);

    // Activer le bouton PDF individuel
    const pdfBtn = overlay.querySelector('#prog-modal-pdf');
    if (pdfBtn) {
        pdfBtn.disabled = false;
        pdfBtn.addEventListener('click', () => exportStudentPDF(name, detail));
    }

    if (typeof lucide !== 'undefined') lucide.createIcons({ root: overlay });
}

function _fillModal(overlay, { coursTree, quizSubs, devoirSubs }) {
    // ── Stats globales ───────────────────────────────────────
    let totalSeances = 0, doneSeances = 0;
    coursTree.forEach(c => {
        c.sequences.forEach(seq => {
            seq.seances.forEach(s => {
                totalSeances++;
                if (s.statut === 'termine') doneSeances++;
            });
        });
    });
    const globalPct = totalSeances > 0 ? Math.round(doneSeances / totalSeances * 100) : 0;
    const pctColor  = globalPct >= 75 ? 'var(--status-success)' : globalPct >= 30 ? 'var(--status-warning)' : 'var(--action-primary)';

    overlay.querySelector('#prog-modal-sub').textContent =
        `${doneSeances} / ${totalSeances} séances · ${quizSubs.length} quiz · ${devoirSubs.length} devoir${devoirSubs.length > 1 ? 's' : ''}`;

    overlay.querySelector('#prog-modal-global').innerHTML = `
    <div class="prog-modal-global-bar">
      <div class="prog-modal-global-bar__fill" style="width:${globalPct}%;background:${pctColor}"></div>
    </div>
    <div class="prog-modal-global-stats">
      <span style="color:${pctColor};font-weight:var(--font-weight-bold);font-size:var(--font-h4-size)">${globalPct}%</span>
      <span class="text-muted text-sm">${doneSeances} séance${doneSeances > 1 ? 's' : ''} terminée${doneSeances > 1 ? 's' : ''}</span>
      <span class="text-muted text-sm">sur ${totalSeances} au total</span>
    </div>`;

    // ── Corps avec onglets ───────────────────────────────────
    const body = overlay.querySelector('#prog-modal-body');
    body.innerHTML = `
    <div class="prog-panel" data-panel="modules">
      ${_renderModulesPanel(coursTree)}
    </div>
    <div class="prog-panel" data-panel="quiz" style="display:none">
      ${_renderQuizPanel(quizSubs)}
    </div>
    <div class="prog-panel" data-panel="devoirs" style="display:none">
      ${_renderDevoirsPanel(devoirSubs)}
    </div>`;

    // Accordéon cours
    body.querySelectorAll('.prog-cours-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const detail = btn.closest('.prog-cours-item').querySelector('.prog-cours-detail');
            const isOpen = btn.getAttribute('aria-expanded') === 'true';
            btn.setAttribute('aria-expanded', String(!isOpen));
            detail.style.display = isOpen ? 'none' : '';
            btn.querySelector('.prog-toggle-icon').style.transform = isOpen ? '' : 'rotate(90deg)';
        });
    });
}

// ── Panel Modules ────────────────────────────────────────────
function _renderModulesPanel(coursTree) {
    if (!coursTree.length) return `<p class="text-muted text-sm" style="padding:var(--space-4)">Aucun cours assigné.</p>`;

    return coursTree.map((cours, ci) => {
        let cTotal = 0, cDone = 0;
        cours.sequences.forEach(seq => seq.seances.forEach(s => {
            cTotal++;
            if (s.statut === 'termine') cDone++;
        }));
        const cPct   = cTotal > 0 ? Math.round(cDone / cTotal * 100) : 0;
        const pColor = cPct >= 75 ? 'var(--status-success)' : cPct >= 30 ? 'var(--status-warning)' : 'var(--action-primary)';
        const expanded = ci === 0;   // Premier cours ouvert par défaut

        return `
        <div class="prog-cours-item">
          <button class="prog-cours-toggle" aria-expanded="${expanded}">
            <i data-lucide="chevron-right" class="prog-toggle-icon"
               aria-hidden="true" style="${expanded ? 'transform:rotate(90deg)' : ''}"></i>
            <div class="prog-cours-toggle__info">
              <span class="prog-cours-title">${_esc(cours.cours_titre)}</span>
              <span class="prog-cours-meta">${cDone}/${cTotal} séances</span>
            </div>
            <div class="prog-cours-bar-wrap">
              <div class="prog-cours-bar-fill" style="width:${cPct}%;background:${pColor}"></div>
            </div>
            <span class="prog-cours-pct" style="color:${pColor}">${cPct}%</span>
          </button>

          <div class="prog-cours-detail" style="${expanded ? '' : 'display:none'}">
            ${cours.sequences.map(seq => `
            <div class="prog-seq-block">
              <div class="prog-seq-title">
                <i data-lucide="layers" aria-hidden="true"></i>
                ${_esc(seq.sequence_titre)}
              </div>
              <div class="prog-seances-list">
                ${seq.seances.map(s => {
                    const isDone  = s.statut === 'termine';
                    const isInProg= s.statut === 'en_cours';
                    const icon    = isDone ? 'circle-check' : isInProg ? 'play-circle' : 'circle';
                    const cls     = isDone ? 'prog-seance--done' : isInProg ? 'prog-seance--inprog' : '';
                    const typeIcon= s.seance_type === 'quiz'   ? 'help-circle'
                                  : s.seance_type === 'devoir' ? 'upload'
                                  : 'play';
                    return `
                    <div class="prog-seance-row ${cls}">
                      <i data-lucide="${icon}" class="prog-seance-status" aria-hidden="true"></i>
                      <i data-lucide="${typeIcon}" class="prog-seance-type" aria-hidden="true"></i>
                      <span class="prog-seance-name">${_esc(s.seance_titre)}</span>
                    </div>`;
                }).join('')}
              </div>
            </div>`).join('')}
          </div>
        </div>`;
    }).join('');
}

// ── Panel Quiz ───────────────────────────────────────────────
function _renderQuizPanel(quizSubs) {
    if (!quizSubs.length) return `
    <div class="prog-panel-empty">
      <i data-lucide="help-circle" aria-hidden="true"></i>
      <span>Aucun quiz soumis.</span>
    </div>`;

    return `
    <div class="prog-quiz-list">
      ${quizSubs.map(q => {
          const pct = q.max_score > 0 ? Math.round(q.score / q.max_score * 100) : null;
          const cls = pct === null ? 'prog-chip--neutral' : pct >= 70 ? 'prog-chip--success' : 'prog-chip--error';
          const label = pct !== null ? `${pct}%` : 'En attente';
          return `
          <div class="prog-quiz-row">
            <div class="prog-quiz-row__title">${_esc(q.lms_seances?.titre || '—')}</div>
            <div class="prog-quiz-row__meta">
              <span class="prog-chip ${cls}">${label}</span>
              ${pct !== null ? `<span class="text-muted text-sm">${q.score} / ${q.max_score} pts</span>` : ''}
              <span class="text-muted text-sm">${_formatDate(q.submitted_at)}</span>
            </div>
          </div>`;
      }).join('')}
    </div>`;
}

// ── Panel Devoirs ────────────────────────────────────────────
function _renderDevoirsPanel(devoirSubs) {
    if (!devoirSubs.length) return `
    <div class="prog-panel-empty">
      <i data-lucide="upload" aria-hidden="true"></i>
      <span>Aucun devoir déposé.</span>
    </div>`;

    return `
    <div class="prog-devoir-list">
      ${devoirSubs.map(d => {
          const isGraded = d.note !== null && d.note !== undefined;
          return `
          <div class="prog-devoir-row">
            <div class="prog-devoir-row__icon ${isGraded ? 'prog-devoir-row__icon--graded' : ''}">
              <i data-lucide="${isGraded ? 'check-circle-2' : 'clock'}" aria-hidden="true"></i>
            </div>
            <div class="prog-devoir-row__body">
              <div class="prog-devoir-row__title">${_esc(d.lms_seances?.titre || '—')}</div>
              <div class="prog-devoir-row__meta">
                <span class="prog-chip ${isGraded ? 'prog-chip--success' : 'prog-chip--warning'}">
                  ${isGraded ? `Note : ${d.note} / ${d.note_max ?? 20}` : 'En attente de correction'}
                </span>
                <span class="text-muted text-sm">Déposé le ${_formatDate(d.submitted_at)}</span>
              </div>
              ${isGraded && d.feedback ? `
              <div class="prog-devoir-row__feedback">
                <i data-lucide="message-square" aria-hidden="true"></i>
                <span>${_esc(d.feedback)}</span>
              </div>` : ''}
            </div>
          </div>`;
      }).join('')}
    </div>`;
}

// ─────────────────────────────────────────────────────────────
//  Utilitaires
// ─────────────────────────────────────────────────────────────
function _timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1)  return 'À l\'instant';
    if (mins < 60) return `Il y a ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `Il y a ${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function _formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function _initials(prenom, nom) {
    return `${(prenom || '')[0] || ''}${(nom || '')[0] || ''}`.toUpperCase() || '?';
}

function _esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}
