/**
 * devoirGradeView.js — Navigation hiérarchique des devoirs
 * Parcours → Cohorte → Module → Séquence → Séance → Corrections
 */

import {
    getDevoirsNavigation,
    getSeanceAllStudents,
    gradeDevoirSubmission,
    gradeDirectly,
    deleteSubmission,
} from '../../models/DevoirModel.js';
import { safeCall } from '../../errorHandler.js';
import { store }    from '../../store.js';

// ── État module ─────────────────────────────────────────────
let _tree        = [];   // flat rows du RPC
let _path        = [];   // [{id, label, depth}]  — fil d'Ariane
let _pendingOnly = true;
let _tableView   = true;  // toggle carte / tableau (défaut : tableau style Moodle)
let _bodyEl      = null;
let _crumbEl     = null;
let _subEl       = null; // sous-titre global
let _currentSeanceId  = null; // ID séance active (pour _bindGradeForms)
let _currentCohorteId = null; // ID cohorte active (idem)
let _deleteHandler    = null; // handler de délégation delete (retiré à chaque re-render)

// Labels des niveaux
const LEVEL_META = [
    { label: 'Parcours',  plural: 'Parcours',   icon: 'map',       next: 'Cohortes'  },
    { label: 'Cohorte',   plural: 'Cohortes',   icon: 'users',     next: 'Modules'   },
    { label: 'Module',    plural: 'Modules',    icon: 'book-open', next: 'Séquences' },
    { label: 'Séquence',  plural: 'Séquences',  icon: 'list',      next: 'Séances'   },
    { label: 'Séance',    plural: 'Séances',    icon: 'file-text', next: null        },
];

// ── Point d'entrée ──────────────────────────────────────────
export async function renderDevoirGrade(container) {
    _path        = [];
    _pendingOnly = true;

    container.innerHTML = `
    <div class="page-admin">
      <div class="admin-page-header">
        <div>
          <h1 class="admin-page-title">Devoirs à corriger</h1>
          <p class="admin-page-sub" id="dv-sub">Chargement…</p>
        </div>
        <label class="dv-toggle">
          <input type="checkbox" id="dv-pending-only" checked>
          <span>En attente uniquement</span>
        </label>
      </div>
      <nav class="dv-breadcrumb" id="dv-breadcrumb" aria-label="Navigation devoirs"></nav>
      <div id="dv-body" class="dv-body">
        <div class="loading">
          <i data-lucide="loader-2" class="spin" aria-hidden="true"></i> Chargement…
        </div>
      </div>
    </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });

    _bodyEl  = container.querySelector('#dv-body');
    _crumbEl = container.querySelector('#dv-breadcrumb');
    _subEl   = container.querySelector('#dv-sub');

    container.querySelector('#dv-pending-only')?.addEventListener('change', e => {
        _pendingOnly = e.target.checked;
        if (_path.length === 5) {
            _renderSubmissions(_path[4].id, _path[1].id);
        } else {
            _renderCards();
        }
    });

    const data = await safeCall(getDevoirsNavigation, 'devoirs navigation');
    _tree = data || [];

    // Compte global unique de soumissions en attente
    const totalPending = _countGlobalPending();
    if (_subEl) {
        _subEl.textContent = totalPending > 0
            ? `${totalPending} dépôt${totalPending > 1 ? 's' : ''} en attente de correction`
            : 'Tous les devoirs sont corrigés ✓';
    }

    _renderBreadcrumb();
    _renderCards();
}

// ── Compteurs ───────────────────────────────────────────────
function _countGlobalPending() {
    // Chaque ligne est unique par (cohorte, séance) — on somme
    return _tree.reduce((acc, r) => acc + Number(r.pending_count || 0), 0);
}

// ── Filtrage du tree selon le chemin ───────────────────────
function _filterTree() {
    let rows = _tree;
    if (_path[0]) rows = rows.filter(r => r.pathway_id  === _path[0].id);
    if (_path[1]) rows = rows.filter(r => r.cohorte_id  === _path[1].id);
    if (_path[2]) rows = rows.filter(r => r.cours_id    === _path[2].id);
    if (_path[3]) rows = rows.filter(r => r.sequence_id === _path[3].id);
    return rows;
}

// ── Items uniques au niveau courant ────────────────────────
function _getItems(depth) {
    const rows = _filterTree();
    const map  = new Map();

    rows.forEach(row => {
        let id, label, sub;
        switch (depth) {
            case 0: id = row.pathway_id;  label = row.pathway_titre;   sub = row.titre_pro_sigle; break;
            case 1: id = row.cohorte_id;  label = row.cohorte_nom;     sub = null; break;
            case 2: id = row.cours_id;    label = row.cours_titre;     sub = null; break;
            case 3: id = row.sequence_id; label = row.sequence_titre;  sub = null; break;
            case 4: id = row.seance_id;   label = row.seance_titre;    sub = null; break;
            default: return;
        }
        if (!id) return;
        if (!map.has(id)) {
            map.set(id, { id, label, sub: sub || null, pending: 0, total: 0 });
        }
        const item = map.get(id);
        item.pending += Number(row.pending_count || 0);
        item.total   += Number(row.total_count   || 0);
    });

    return Array.from(map.values());
}

// ── Fil d'Ariane ────────────────────────────────────────────
function _renderBreadcrumb() {
    if (!_crumbEl) return;

    const crumbs = [{ label: 'Tous les parcours', depth: -1 }, ..._path.map((p, i) => ({ label: p.label, depth: i }))];

    _crumbEl.innerHTML = crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1;
        if (isLast) {
            return `<span class="dv-crumb dv-crumb--active" aria-current="page">${_esc(c.label)}</span>`;
        }
        return `
        <button class="dv-crumb dv-crumb--link" data-depth="${c.depth}">
          ${_esc(c.label)}
        </button>
        <span class="dv-crumb-sep" aria-hidden="true">›</span>`;
    }).join('');

    _crumbEl.querySelectorAll('.dv-crumb--link').forEach(btn => {
        btn.addEventListener('click', () => {
            const d = parseInt(btn.dataset.depth);
            _path = d === -1 ? [] : _path.slice(0, d + 1);
            _renderBreadcrumb();
            _renderCards();
        });
    });
}

// ── Grille de cartes ───────────────────────────────────────
function _renderCards() {
    const depth = _path.length; // 0=parcours … 4=séances
    if (depth >= 5 || !_bodyEl) return;

    const items    = _getItems(depth);
    const filtered = _pendingOnly ? items.filter(i => i.pending > 0) : items;
    const meta     = LEVEL_META[depth];

    if (!_tree.length) {
        _bodyEl.innerHTML = `
        <div class="admin-empty">
          <i data-lucide="inbox" aria-hidden="true"></i>
          <p>Aucun dépôt de devoir enregistré pour le moment.</p>
        </div>`;
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: _bodyEl });
        return;
    }

    if (!filtered.length) {
        _bodyEl.innerHTML = `
        <div class="admin-empty">
          <i data-lucide="check-circle" aria-hidden="true"></i>
          <p>${_pendingOnly ? 'Aucun devoir en attente à ce niveau.' : 'Aucun élément disponible.'}</p>
        </div>`;
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: _bodyEl });
        return;
    }

    _bodyEl.innerHTML = `
    <p class="dv-level-hint">
      <i data-lucide="${meta.icon}" aria-hidden="true"></i>
      ${filtered.length} ${filtered.length > 1 ? meta.plural : meta.label}
      ${meta.next ? `— cliquez pour voir les ${meta.next}` : ''}
    </p>
    <div class="dv-cards">
      ${filtered.map(item => `
      <button class="dv-card" data-id="${item.id}" data-label="${_esc(item.label)}">
        <div class="dv-card__icon">
          <i data-lucide="${meta.icon}" aria-hidden="true"></i>
        </div>
        <div class="dv-card__body">
          <div class="dv-card__title">${_esc(item.label)}</div>
          ${item.sub ? `<span class="badge badge-primary" style="margin-top:var(--space-1)">${_esc(item.sub)}</span>` : ''}
          <div class="dv-card__footer">
            ${item.pending > 0
              ? `<span class="dv-badge dv-badge--pending">
                   <i data-lucide="clock" aria-hidden="true"></i>
                   ${item.pending} en attente
                 </span>`
              : `<span class="dv-badge dv-badge--done">
                   <i data-lucide="check" aria-hidden="true"></i>
                   Tout corrigé
                 </span>`
            }
            ${!_pendingOnly
              ? `<span class="dv-badge dv-badge--total">${item.total} dépôt${item.total > 1 ? 's' : ''}</span>`
              : ''
            }
          </div>
        </div>
        <i data-lucide="chevron-right" class="dv-card__chevron" aria-hidden="true"></i>
      </button>`).join('')}
    </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons({ root: _bodyEl });

    _bodyEl.querySelectorAll('.dv-card').forEach(card => {
        card.addEventListener('click', () => {
            const newDepth = _path.length;
            _path.push({ id: card.dataset.id, label: card.dataset.label, depth: newDepth });
            _renderBreadcrumb();
            if (_path.length === 5) {
                _renderSubmissions(_path[4].id, _path[1].id);
            } else {
                _renderCards();
            }
        });
    });
}

// ── Soumissions d'une séance (TOUS les stagiaires — style Moodle) ────────────
async function _renderSubmissions(seanceId, cohorteId) {
    if (!_bodyEl) return;

    _currentSeanceId  = seanceId;
    _currentCohorteId = cohorteId;

    _bodyEl.innerHTML = `<div class="loading">
      <i data-lucide="loader-2" class="spin" aria-hidden="true"></i> Chargement des stagiaires…
    </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: _bodyEl });

    const rows = await safeCall(
        () => getSeanceAllStudents(seanceId, cohorteId),
        'devoirs all students'
    );

    const all       = rows || [];
    const submitted = all.filter(s => s.has_submitted);
    const pending   = all.filter(s => s.note === null || s.note === undefined);   // pas encore noté
    const graded    = all.filter(s => s.note !== null  && s.note !== undefined);
    const shown     = _pendingOnly ? pending : all;

    // Récupérer un block_id de référence (pour noter les élèves sans dépôt)
    const sampleBlockId = all.find(s => s.block_id)?.block_id || 'direct';

    if (!all.length) {
        _bodyEl.innerHTML = `
        <div class="admin-empty">
          <i data-lucide="users" aria-hidden="true"></i>
          <p>Aucun stagiaire inscrit dans cette cohorte.</p>
        </div>`;
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: _bodyEl });
        return;
    }

    if (!shown.length) {
        _bodyEl.innerHTML = `
        <div class="admin-empty">
          <i data-lucide="check-circle" aria-hidden="true"></i>
          <p>${_pendingOnly ? 'Tous les stagiaires ont été notés ✓' : 'Aucun stagiaire à afficher.'}</p>
        </div>`;
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: _bodyEl });
        return;
    }

    _bodyEl.innerHTML = `
    <div class="dv-subs-header">
      <div class="dv-subs-stats">
        <div class="dv-stat">
          <span class="dv-stat__num">${all.length}</span>
          <span class="dv-stat__label">inscrit${all.length > 1 ? 's' : ''}</span>
        </div>
        <div class="dv-stat dv-stat--submitted">
          <span class="dv-stat__num">${submitted.length}</span>
          <span class="dv-stat__label">dépôt${submitted.length > 1 ? 's' : ''}</span>
        </div>
        <div class="dv-stat dv-stat--pending">
          <span class="dv-stat__num">${pending.length}</span>
          <span class="dv-stat__label">à noter</span>
        </div>
        <div class="dv-stat dv-stat--done">
          <span class="dv-stat__num">${graded.length}</span>
          <span class="dv-stat__label">noté${graded.length > 1 ? 's' : ''}</span>
        </div>
      </div>
      <div class="dv-view-toggle">
        <button class="btn btn-ghost btn-sm ${!_tableView ? 'btn-active' : ''}" id="dv-view-cards"
                title="Vue détaillée" aria-pressed="${!_tableView}">
          <i data-lucide="layout-grid" aria-hidden="true"></i>
        </button>
        <button class="btn btn-ghost btn-sm ${_tableView ? 'btn-active' : ''}" id="dv-view-table"
                title="Vue tableau" aria-pressed="${_tableView}">
          <i data-lucide="table-2" aria-hidden="true"></i>
        </button>
      </div>
    </div>
    <div id="dv-subs-list">
      ${_tableView
        ? _renderMoodleTable(shown, sampleBlockId, graded.length, all.length)
        : `<div class="dv-submissions">${shown.map(s => _subCard(s, sampleBlockId)).join('')}</div>`}
    </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons({ root: _bodyEl });

    // Toggle vue
    _bodyEl.querySelector('#dv-view-cards')?.addEventListener('click', () => {
        _tableView = false; _renderSubmissions(seanceId, cohorteId);
    });
    _bodyEl.querySelector('#dv-view-table')?.addEventListener('click', () => {
        _tableView = true; _renderSubmissions(seanceId, cohorteId);
    });

    if (_tableView) {
        _bindTableActions(seanceId, cohorteId, sampleBlockId);
    } else {
        _bindGradeForms(seanceId, cohorteId, sampleBlockId);
    }
}

// ── Formulaires de notation ─────────────────────────────────
function _bindGradeForms(seanceId, cohorteId, sampleBlockId) {
    _bodyEl?.querySelectorAll('.dv-grade-form').forEach(form => {
        if (form.dataset.bound === 'true') return; // éviter double-binding
        form.dataset.bound = 'true';

        const noteEl      = form.querySelector('.dv-note-input');
        const noteMax     = parseFloat(form.dataset.noteMax || '20');
        const subId       = form.dataset.subId;       // null/'' si pas de soumission
        const stagiaireId = form.dataset.stagiaireId;
        const blockId     = form.dataset.blockId || sampleBlockId || 'direct';
        // Identifiant pour les barres visuelles (submission_id ou stagiaire_id)
        const vizId       = subId || stagiaireId;

        // ── Indicateur visuel live ───────────────────────────
        noteEl?.addEventListener('input', () => {
            const v   = parseFloat(noteEl.value);
            const bar = _bodyEl?.querySelector(`#dv-sbar-${vizId}`);
            const pct = _bodyEl?.querySelector(`#dv-spct-${vizId}`);
            if (!isNaN(v) && v >= 0 && v <= noteMax) {
                const p = Math.round(v / noteMax * 100);
                if (bar) {
                    bar.style.width      = `${p}%`;
                    bar.style.background = p >= 80 ? 'var(--status-success)'
                                         : p >= 50 ? 'var(--status-warning)'
                                         : 'var(--status-error)';
                }
                if (pct) pct.textContent = `${p}%`;
            } else {
                if (bar) { bar.style.width = '0%'; bar.style.background = 'var(--border-medium)'; }
                if (pct) pct.textContent = '—';
            }
        });

        form.addEventListener('submit', async e => {
            e.preventDefault();
            const note = parseFloat(noteEl?.value);
            if (isNaN(note) || note < 0 || note > noteMax) {
                noteEl?.classList.add('input-error');
                noteEl?.focus();
                return;
            }
            noteEl.classList.remove('input-error');

            // Combiner feedback structuré
            const pos  = form.querySelector('.dv-feedback-pos')?.value?.trim()  || '';
            const impr = form.querySelector('.dv-feedback-impr')?.value?.trim() || '';
            const parts = [];
            if (pos)  parts.push(`✅ Points positifs :\n${pos}`);
            if (impr) parts.push(`🔧 Axes d'amélioration :\n${impr}`);
            const feedback = parts.join('\n\n');

            const btn = form.querySelector('.dv-grade-submit');
            if (btn) {
                btn.disabled  = true;
                btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Enregistrement…';
                if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });
            }

            let saved;
            if (subId) {
                // Soumission existante → mise à jour directe
                saved = await safeCall(
                    () => gradeDevoirSubmission({
                        submissionId: subId,
                        note, noteMax, feedback,
                        gradedBy: store.getProfile()?.id,
                    }),
                    'grade devoir'
                );
            } else {
                // Pas de soumission → créer + noter en une opération
                saved = await safeCall(
                    () => gradeDirectly({
                        seanceId, blockId, stagiaireId,
                        note, noteMax, feedback,
                        gradedBy: store.getProfile()?.id,
                    }),
                    'grade devoir direct'
                );
            }

            if (saved) {
                _renderSubmissions(seanceId, cohorteId);
            } else {
                if (btn) {
                    btn.disabled  = false;
                    btn.innerHTML = '<i data-lucide="check" aria-hidden="true"></i> Valider la note';
                    if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });
                }
            }
        });
    });
}

// ── Carte d'une soumission (ou stagiaire sans dépôt) ────────
function _subCard(s, sampleBlockId = 'direct') {
    const name     = [s.prenom, s.nom].filter(Boolean).join(' ') || '?';
    const initials = ((s.prenom?.[0] || '') + (s.nom?.[0] || '')).toUpperCase() || '?';
    const files    = Array.isArray(s.file_urls) ? s.file_urls : [];
    const isGraded     = s.note !== null && s.note !== undefined;
    const hasSubmitted = s.has_submitted === true || (s.submitted_at && files.length > 0);
    const noteMax  = s.note_max ?? 20;
    // vizId = identifiant unique pour les éléments DOM (barre de score, etc.)
    const vizId    = s.submission_id || s.stagiaire_id;
    const blockId  = s.block_id || sampleBlockId;

    const dateStr = s.submitted_at
        ? new Date(s.submitted_at).toLocaleDateString('fr-FR', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })
        : null;

    return `
    <div class="dv-submission ${isGraded ? 'dv-submission--graded' : hasSubmitted ? 'dv-submission--pending' : 'dv-submission--no-submission'}">

      <div class="dv-submission__header">
        <div class="dv-avatar">${_esc(initials)}</div>
        <div class="dv-sub-meta">
          <div class="dv-sub-name">${_esc(name)}</div>
          <div class="dv-sub-date">
            ${dateStr
              ? `Déposé le ${dateStr}`
              : `<span class="dv-no-submit-hint"><i data-lucide="alert-circle" style="width:13px;height:13px"></i> Aucun dépôt</span>`
            }
          </div>
        </div>
        <div class="dv-sub-status">
          ${isGraded
            ? `<div class="dv-grade-badge-result">
                 <span class="dv-grade-score-display">${s.note}<span class="dv-grade-score-max">/${noteMax}</span></span>
                 <span class="dv-grade-pct-display ${_scoreClass(s.note, noteMax)}">${Math.round(s.note / noteMax * 100)}%</span>
               </div>`
            : hasSubmitted
              ? `<span class="badge badge-warning">En attente</span>`
              : `<span class="badge badge-neutral">Non soumis</span>`
          }
        </div>
      </div>

      ${s.message ? `
      <div class="dv-sub-message">
        <i data-lucide="message-square" aria-hidden="true"></i>
        <p>${_esc(s.message)}</p>
      </div>` : ''}

      ${hasSubmitted ? `
      <div class="dv-sub-files">
        ${files.length
          ? files.map(f => `
            <a href="${_esc(f.url)}" target="_blank" rel="noopener noreferrer" class="dv-sub-file">
              <i data-lucide="paperclip" aria-hidden="true"></i>
              <span>${_esc(f.name)}</span>
            </a>`).join('')
          : `<span class="dv-no-files">Aucun fichier joint</span>`
        }
      </div>` : ''}

      ${isGraded ? `
      <div class="dv-sub-graded-info">
        ${s.feedback ? `<div class="dv-sub-feedback">${_renderFeedback(s.feedback)}</div>` : ''}
        <p class="dv-sub-graded-date">
          <i data-lucide="calendar-check" aria-hidden="true"></i>
          Noté le ${new Date(s.graded_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' })}
        </p>
      </div>` : `
      <form class="dv-grade-form"
            data-sub-id="${s.submission_id || ''}"
            data-stagiaire-id="${s.stagiaire_id || ''}"
            data-block-id="${_esc(blockId)}"
            data-note-max="${noteMax}"
            novalidate>

        ${!hasSubmitted ? `
        <div class="dv-no-submit-notice">
          <i data-lucide="file-x" aria-hidden="true"></i>
          Ce stagiaire n'a pas déposé de travail. Vous pouvez lui attribuer une note directement.
        </div>` : ''}

        <div class="dv-grade-note-row">
          <div class="dv-grade-note-wrap">
            <label class="form-label form-label--required">Note</label>
            <div class="dv-note-field">
              <input type="number" class="form-input form-input--sm dv-note-input"
                     min="0" max="${noteMax}" step="0.5" placeholder="0" required>
              <span class="dv-note-max">/ ${noteMax}</span>
            </div>
          </div>
          <div class="dv-score-bar-wrap">
            <div class="dv-score-bar">
              <div class="dv-score-bar__fill" id="dv-sbar-${vizId}"
                   style="width:0%;background:var(--border-medium)"></div>
            </div>
            <span class="dv-score-pct" id="dv-spct-${vizId}">—</span>
          </div>
        </div>

        <div class="dv-feedback-grid">
          <div class="dv-feedback-col">
            <label class="form-label dv-feedback-label--pos">
              <i data-lucide="thumbs-up" aria-hidden="true"></i> Points positifs
            </label>
            <textarea class="form-input form-textarea dv-feedback-pos" rows="3"
                      placeholder="Ce qui a été bien réalisé, les points forts…"></textarea>
          </div>
          <div class="dv-feedback-col">
            <label class="form-label dv-feedback-label--impr">
              <i data-lucide="target" aria-hidden="true"></i> Axes d'amélioration
            </label>
            <textarea class="form-input form-textarea dv-feedback-impr" rows="3"
                      placeholder="Points à travailler, suggestions concrètes…"></textarea>
          </div>
        </div>

        <div class="dv-grade-actions">
          <button type="submit" class="btn btn-cta btn-sm dv-grade-submit">
            <i data-lucide="check" aria-hidden="true"></i> Valider la note
          </button>
        </div>
      </form>`}

    </div>`;
}

// ── Table Moodle (vue principale) ────────────────────────────
function _renderMoodleTable(students, sampleBlockId = 'direct', gradedCount = 0, totalCount = 0) {
    if (!students.length) return `<div class="admin-empty"><p>Aucun stagiaire à afficher.</p></div>`;
    const pct = totalCount ? Math.round(gradedCount / totalCount * 100) : 0;
    return `
    <div class="dv-mt-wrap">
      <!-- Barre d'outils -->
      <div class="dv-mt-toolbar">
        <div class="dv-mt-search">
          <i data-lucide="search" aria-hidden="true"></i>
          <input type="text" id="dv-mt-search" class="form-input form-input--sm"
                 placeholder="Chercher un stagiaire…">
        </div>
        <div class="dv-mt-toolbar-right">
          <div class="dv-mt-progress">
            <span class="dv-mt-progress-label">${gradedCount}/${totalCount} notés</span>
            <div class="dv-mt-progress-bar">
              <div class="dv-mt-progress-fill" style="width:${pct}%"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tableau -->
      <div class="dv-mt-scroll">
        <table class="dv-mt" id="dv-mt-table">
          <thead>
            <tr>
              <th class="col-check">
                <input type="checkbox" id="dv-mt-select-all" aria-label="Tout sélectionner">
              </th>
              <th class="col-student">Stagiaire</th>
              <th class="col-status">Statut</th>
              <th class="col-note">Note</th>
              <th class="col-date">Déposé le</th>
              <th class="col-files">Fichiers remis</th>
              <th class="col-feedback">Feedback</th>
              <th class="col-actions"></th>
            </tr>
          </thead>
          <tbody>
            ${students.map(s => _tableRow(s, sampleBlockId)).join('')}
          </tbody>
        </table>
      </div>

      <!-- Pied de tableau -->
      <div class="dv-mt-footer">
        <label class="dv-notify-label">
          <input type="checkbox" id="dv-notify-students" checked>
          <i data-lucide="bell" aria-hidden="true"></i>
          Notifier les stagiaires
        </label>
        <button type="button" class="btn btn-cta" id="dv-save-all">
          <i data-lucide="save" aria-hidden="true"></i>
          Enregistrer les notes
        </button>
      </div>
    </div>`;
}

function _tableRow(s, sampleBlockId) {
    const name         = [s.prenom, s.nom].filter(Boolean).join(' ') || '?';
    const initials     = ((s.prenom?.[0] || '') + (s.nom?.[0] || '')).toUpperCase() || '?';
    const files        = Array.isArray(s.file_urls) ? s.file_urls : [];
    const isGraded     = s.note !== null && s.note !== undefined;
    const hasSubmitted = s.has_submitted === true || !!s.submitted_at;
    const noteMax      = s.note_max ?? 20;
    const vizId        = s.submission_id || s.stagiaire_id;
    const blockId      = s.block_id || sampleBlockId;
    const date         = s.submitted_at
        ? new Date(s.submitted_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' })
        : '—';

    const statusBadge = isGraded
        ? `<span class="badge badge-success">${s.note}/${noteMax} · ${Math.round(s.note/noteMax*100)}%</span>`
        : hasSubmitted
            ? `<span class="badge badge-warning">En attente</span>`
            : `<span class="badge badge-neutral">Non soumis</span>`;

    const existingFeedback = s.feedback || '';
    const filePathsJson    = JSON.stringify(files.map(f => ({ path: f.path || '', url: f.url || '', name: f.name || '' })));

    return `
    <tr class="dv-mt-row ${isGraded ? 'dv-mt-row--graded' : hasSubmitted ? '' : 'dv-mt-row--no-sub'}"
        data-viz-id="${vizId}"
        data-sub-id="${s.submission_id || ''}"
        data-stagiaire-id="${s.stagiaire_id || ''}"
        data-block-id="${_esc(blockId)}"
        data-note-max="${noteMax}"
        data-file-paths="${_esc(filePathsJson)}">
      <td class="col-check">
        <input type="checkbox" class="dv-mt-check" aria-label="Sélectionner ${_esc(name)}">
      </td>
      <td class="col-student">
        <div class="dv-mt-student">
          <div class="dv-avatar dv-avatar--sm">${_esc(initials)}</div>
          <span class="dv-mt-name">${_esc(name)}</span>
        </div>
      </td>
      <td class="col-status" id="dv-mts-${vizId}">${statusBadge}</td>
      <td class="col-note">
        <div class="dv-inline-note">
          <input type="number" class="form-input form-input--xs dv-note-input"
                 min="0" max="${noteMax}" step="0.5"
                 placeholder="—"
                 value="${isGraded ? s.note : ''}"
                 aria-label="Note de ${_esc(name)}">
          <span class="dv-inline-note-sep">/${noteMax}</span>
        </div>
      </td>
      <td class="col-date">${date}</td>
      <td class="col-files">
        ${files.length
          ? files.map(f => `
            <a href="${_esc(f.url)}" target="_blank" rel="noopener noreferrer" class="dv-mt-file">
              <i data-lucide="paperclip" aria-hidden="true"></i>
              <span>${_esc(f.name)}</span>
            </a>`).join('')
          : `<span class="dv-mt-no-file">—</span>`
        }
      </td>
      <td class="col-feedback">
        <div class="dv-mt-fb">
          ${existingFeedback
            ? `<p class="dv-mt-fb-preview" id="dv-fbprev-${vizId}">${_esc(existingFeedback.slice(0,55))}${existingFeedback.length > 55 ? '…' : ''}</p>`
            : ''}
          <button type="button" class="btn btn-ghost btn-xs dv-mt-fb-toggle" data-viz-id="${vizId}">
            <i data-lucide="message-square" aria-hidden="true"></i>
            ${existingFeedback ? 'Modifier' : 'Ajouter'}
          </button>
          <div class="dv-mt-fb-expand" id="dv-fbe-${vizId}" style="display:none">
            <textarea class="form-input form-textarea dv-feedback-input" rows="3"
                      placeholder="Feedback pour le stagiaire…">${_esc(existingFeedback)}</textarea>
          </div>
        </div>
      </td>
      <td class="col-actions">
        <button type="button" class="btn btn-ghost btn-xs dv-mt-save" data-viz-id="${vizId}"
                title="Enregistrer cette note">
          <i data-lucide="save" aria-hidden="true"></i>
        </button>
        ${s.submission_id ? `
        <button type="button" class="btn btn-ghost btn-xs dv-mt-delete text-danger"
                data-sub-id="${s.submission_id}" data-name="${_esc(name)}"
                title="Supprimer ce dépôt">
          <i data-lucide="trash-2" aria-hidden="true"></i>
        </button>` : ''}
      </td>
    </tr>`;
}

// ── Bindings de la table Moodle ──────────────────────────────
function _bindTableActions(seanceId, cohorteId, sampleBlockId) {
    // ── Recherche live ───────────────────────────────────────
    _bodyEl?.querySelector('#dv-mt-search')?.addEventListener('input', e => {
        const q = e.target.value.toLowerCase();
        _bodyEl?.querySelectorAll('.dv-mt-row').forEach(row => {
            const name = row.querySelector('.dv-mt-name')?.textContent?.toLowerCase() || '';
            row.style.display = name.includes(q) ? '' : 'none';
        });
    });

    // ── Sélectionner tout ────────────────────────────────────
    _bodyEl?.querySelector('#dv-mt-select-all')?.addEventListener('change', e => {
        _bodyEl?.querySelectorAll('.dv-mt-check').forEach(cb => {
            cb.checked = e.target.checked;
        });
    });

    // ── Toggle feedback textarea ─────────────────────────────
    _bodyEl?.querySelectorAll('.dv-mt-fb-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const id  = btn.dataset.vizId;
            const box = _bodyEl?.querySelector(`#dv-fbe-${id}`);
            if (!box) return;
            const open = box.style.display !== 'none';
            box.style.display = open ? 'none' : '';
            btn.innerHTML = open
                ? `<i data-lucide="message-square" aria-hidden="true"></i> Ajouter`
                : `<i data-lucide="chevron-up" aria-hidden="true"></i> Réduire`;
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });
        });
    });

    // ── Enregistrer une ligne ────────────────────────────────
    _bodyEl?.querySelectorAll('.dv-mt-save').forEach(btn => {
        btn.addEventListener('click', async () => {
            const row = btn.closest('.dv-mt-row');
            if (row) await _saveRow(row, btn, seanceId, cohorteId, sampleBlockId);
        });
    });

    // ── Suppression — délégation d'événements sur _bodyEl ───────
    // (évite tous les problèmes de re-binding + insertion de <tr> dans le tableau)
    if (_deleteHandler) {
        _bodyEl?.removeEventListener('click', _deleteHandler);
    }
    _deleteHandler = async (e) => {
        // 1. Clic initial sur le bouton poubelle → mode confirmation dans la cellule
        const delBtn = e.target.closest('.dv-mt-delete');
        if (delBtn) {
            const row = delBtn.closest('.dv-mt-row');
            if (!row || row.classList.contains('dv-mt-row--confirming')) return;

            const actCell = row.querySelector('.col-actions');
            if (!actCell) return;

            // Sauvegarder le HTML original dans un data-attr pour restauration
            actCell.dataset.origHtml = actCell.innerHTML;

            // Afficher les boutons Supprimer / Annuler à la place des icônes
            row.classList.add('dv-mt-row--confirming');
            actCell.innerHTML = `
              <button type="button" class="dv-btn-del-yes" data-sub-id="${delBtn.dataset.subId}">
                Supprimer
              </button>
              <button type="button" class="dv-btn-del-no">Annuler</button>`;
            return;
        }

        // 2. Annuler → restaurer la cellule
        const noBtn = e.target.closest('.dv-btn-del-no');
        if (noBtn) {
            const row = noBtn.closest('.dv-mt-row');
            const actCell = row?.querySelector('.col-actions');
            if (!row || !actCell) return;
            row.classList.remove('dv-mt-row--confirming');
            actCell.innerHTML = actCell.dataset.origHtml || '';
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: actCell });
            return;
        }

        // 3. Confirmer → supprimer
        const yesBtn = e.target.closest('.dv-btn-del-yes');
        if (yesBtn) {
            const row     = yesBtn.closest('.dv-mt-row');
            const actCell = row?.querySelector('.col-actions');
            const subId   = yesBtn.dataset.subId;

            // Feedback visuel immédiat
            if (row)     { row.style.opacity = '0.35'; row.style.pointerEvents = 'none'; }
            if (actCell) actCell.innerHTML = '<span style="font-size:11px;color:var(--text-muted)">Suppression…</span>';

            let fileUrls = [];
            try { fileUrls = JSON.parse(row?.dataset.filePaths || '[]'); } catch {}

            try {
                await deleteSubmission({ submissionId: subId, fileUrls });
                row?.remove(); // retirer la ligne du DOM directement
            } catch (err) {
                // Restaurer en cas d'erreur
                if (row)     { row.style.opacity = ''; row.style.pointerEvents = ''; }
                if (row)       row.classList.remove('dv-mt-row--confirming');
                if (actCell)   actCell.innerHTML = actCell.dataset.origHtml || '';
                if (typeof lucide !== 'undefined' && actCell) lucide.createIcons({ root: actCell });

                const toast = document.getElementById('toast-error');
                if (toast) {
                    toast.textContent = `Erreur : ${err.message || 'impossible de supprimer'}`;
                    toast.classList.add('visible');
                    setTimeout(() => toast.classList.remove('visible'), 4500);
                }
            }
        }
    };
    _bodyEl?.addEventListener('click', _deleteHandler);

    // ── Enregistrer toutes les lignes modifiées ──────────────
    _bodyEl?.querySelector('#dv-save-all')?.addEventListener('click', async () => {
        const saveAllBtn = _bodyEl?.querySelector('#dv-save-all');
        if (saveAllBtn) {
            saveAllBtn.disabled = true;
            saveAllBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Enregistrement…';
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: saveAllBtn });
        }

        const rows = Array.from(_bodyEl?.querySelectorAll('.dv-mt-row') || []);
        let saved = 0;
        for (const row of rows) {
            const noteEl = row.querySelector('.dv-note-input');
            if (!noteEl?.value) continue;            // Ignorer les lignes sans note saisie
            const isGraded = row.dataset.graded === 'true';
            // On re-note même les déjà notés si la valeur a changé
            const saveBtn = row.querySelector('.dv-mt-save');
            const ok = await _saveRow(row, saveBtn, seanceId, cohorteId, sampleBlockId, true);
            if (ok) saved++;
        }

        if (saveAllBtn) {
            saveAllBtn.disabled = false;
            saveAllBtn.innerHTML = saved > 0
                ? `<i data-lucide="check" aria-hidden="true"></i> ${saved} note${saved > 1 ? 's' : ''} enregistrée${saved > 1 ? 's' : ''}`
                : `<i data-lucide="save" aria-hidden="true"></i> Enregistrer les notes`;
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: saveAllBtn });
            if (saved > 0) setTimeout(() => _renderSubmissions(seanceId, cohorteId), 1200);
        }
    });
}

// ── Sauvegarder une ligne de la table ───────────────────────
async function _saveRow(row, saveBtn, seanceId, cohorteId, sampleBlockId, silent = false) {
    const noteEl      = row.querySelector('.dv-note-input');
    const noteMax     = parseFloat(row.dataset.noteMax || '20');
    const note        = parseFloat(noteEl?.value);
    if (isNaN(note) || note < 0 || note > noteMax) {
        noteEl?.classList.add('input-error');
        if (!silent) noteEl?.focus();
        return false;
    }
    noteEl?.classList.remove('input-error');

    const fbInput    = row.querySelector('.dv-feedback-input');
    const feedback   = fbInput?.value?.trim() || '';
    const subId      = row.dataset.subId;
    const stagiaireId = row.dataset.stagiaireId;
    const blockId    = row.dataset.blockId || sampleBlockId;
    const vizId      = row.dataset.vizId;

    if (saveBtn && !silent) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i>';
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: saveBtn });
    }

    let saved;
    if (subId) {
        saved = await safeCall(
            () => gradeDevoirSubmission({ submissionId: subId, note, noteMax, feedback, gradedBy: store.getProfile()?.id }),
            'grade devoir'
        );
    } else {
        saved = await safeCall(
            () => gradeDirectly({ seanceId, blockId, stagiaireId, note, noteMax, feedback, gradedBy: store.getProfile()?.id }),
            'grade direct'
        );
    }

    if (saved) {
        // Mettre à jour le badge statut en live sans rechargement
        const statusCell = row.querySelector('.col-status');
        if (statusCell) {
            const p = Math.round(note / noteMax * 100);
            statusCell.innerHTML = `<span class="badge badge-success">${note}/${noteMax} · ${p}%</span>`;
        }
        row.classList.add('dv-mt-row--graded');
        row.dataset.graded = 'true';
        // Mettre à jour le sub-id si on vient de créer la soumission
        if (!subId && saved.id) row.dataset.subId = saved.id;

        if (saveBtn && !silent) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i data-lucide="check" style="color:var(--status-success)"></i>';
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: saveBtn });
            setTimeout(() => {
                saveBtn.innerHTML = '<i data-lucide="save" aria-hidden="true"></i>';
                if (typeof lucide !== 'undefined') lucide.createIcons({ root: saveBtn });
                saveBtn.disabled = false;
            }, 2000);
        }
        return true;
    } else {
        if (saveBtn && !silent) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i data-lucide="save" aria-hidden="true"></i>';
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: saveBtn });
        }
        return false;
    }
}

// ── Helpers affichage ───────────────────────────────────────
function _scoreClass(note, noteMax) {
    const p = Math.round(note / noteMax * 100);
    if (p >= 80) return 'dv-pct--success';
    if (p >= 50) return 'dv-pct--warning';
    return 'dv-pct--danger';
}

function _renderFeedback(feedback) {
    if (!feedback) return '';
    // Afficher avec sections colorées si format structuré détecté
    if (feedback.includes('✅') || feedback.includes('🔧')) {
        const parts = feedback.split(/\n\n(?=✅|🔧)/);
        return parts.map(p => {
            const cls = p.startsWith('✅') ? 'dv-fb-section--pos'
                      : p.startsWith('🔧') ? 'dv-fb-section--impr'
                      : '';
            return `<div class="dv-fb-section ${cls}">${_esc(p)}</div>`;
        }).join('');
    }
    return `<div class="dv-fb-section">${_esc(feedback)}</div>`;
}

// ── Utilitaire ──────────────────────────────────────────────
function _esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}
