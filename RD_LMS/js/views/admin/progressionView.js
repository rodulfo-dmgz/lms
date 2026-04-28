/**
 * progressionView.js — Tableau de bord progression des stagiaires (admin/formateur)
 */

import { getStagiairesProgress, getStagiaireDetail } from '../../models/ProgressAdminModel.js';
import { safeCall } from '../../errorHandler.js';

export async function renderProgression(container) {
    container.innerHTML = `
    <div class="page-progression-admin">
      <div class="admin-page-header">
        <h2 class="page-title">
          <i data-lucide="bar-chart-2" aria-hidden="true"></i> Progression des stagiaires
        </h2>
      </div>
      <div id="prog-content">
        <div class="loading-state">
          <i data-lucide="loader-2" class="spin" style="width:32px;height:32px"></i>
        </div>
      </div>
    </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });

    const rows = await safeCall(getStagiairesProgress, 'progression: load');
    _renderTable(container.querySelector('#prog-content'), rows || []);
}

// ─────────────────────────────────────────────────────────────
//  Tableau principal
// ─────────────────────────────────────────────────────────────
function _renderTable(area, rows) {
    if (!rows.length) {
        area.innerHTML = `
        <div class="empty-state" style="padding:var(--space-8);text-align:center">
          <i data-lucide="users" style="width:48px;height:48px;color:var(--text-muted)"></i>
          <p style="color:var(--text-muted);margin-top:var(--space-3)">Aucun stagiaire trouvé.</p>
        </div>`;
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: area });
        return;
    }

    // Construire les options du filtre cohorte
    const cohortes = [...new Set(rows.map(r => r.cohorte_nom).filter(Boolean))].sort();
    const filterOpts = cohortes.map(c =>
        `<option value="${_esc(c)}">${_esc(c)}</option>`
    ).join('');

    area.innerHTML = `
    <div class="prog-filters">
      <select class="form-input form-input--sm" id="prog-filter-cohorte" style="max-width:220px">
        <option value="">Toutes les cohortes</option>
        ${filterOpts}
      </select>
      <span class="prog-count text-muted text-sm" id="prog-count">${rows.length} stagiaire${rows.length > 1 ? 's' : ''}</span>
    </div>

    <div class="prog-table-wrap">
      <table class="admin-table prog-table" id="prog-table">
        <thead>
          <tr>
            <th>Stagiaire</th>
            <th>Cohorte</th>
            <th>Séances</th>
            <th>Quiz</th>
            <th>Devoirs</th>
            <th>Dernière activité</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="prog-tbody">
          ${rows.map(r => _renderRow(r)).join('')}
        </tbody>
      </table>
    </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons({ root: area });

    // Filtre cohorte
    area.querySelector('#prog-filter-cohorte')?.addEventListener('change', (e) => {
        const val = e.target.value;
        const tbody = area.querySelector('#prog-tbody');
        const trs   = tbody?.querySelectorAll('tr[data-cohorte]') || [];
        let visible = 0;
        trs.forEach(tr => {
            const match = !val || tr.dataset.cohorte === val;
            tr.style.display = match ? '' : 'none';
            if (match) visible++;
        });
        area.querySelector('#prog-count').textContent =
            `${visible} stagiaire${visible > 1 ? 's' : ''}`;
    });

    // Boutons détail
    area.querySelectorAll('.prog-detail-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const row     = btn.closest('tr');
            const id      = btn.dataset.id;
            const name    = btn.dataset.name;
            _openDetail(id, name);
        });
    });
}

function _renderRow(r) {
    const name      = [r.prenom, r.nom].filter(Boolean).join(' ') || r.id;
    const done      = Number(r.seances_terminees ?? 0);
    const total     = Number(r.seances_total ?? 0);
    const pct       = total > 0 ? Math.round(done / total * 100) : 0;
    const quizAvg   = r.quiz_avg_pct != null ? `${r.quiz_avg_pct}%` : '—';
    const quizBadge = r.quiz_avg_pct != null
        ? (r.quiz_avg_pct >= 70 ? 'badge-success' : 'badge-error')
        : 'badge-neutral';
    const pending   = Number(r.devoirs_pending ?? 0);
    const submitted = Number(r.devoirs_submitted ?? 0);
    const graded    = Number(r.devoirs_graded ?? 0);
    const lastAct   = r.last_activity
        ? _timeAgo(r.last_activity)
        : '—';

    return `
    <tr data-cohorte="${_esc(r.cohorte_nom || '')}">
      <td>
        <div class="prog-name">
          <div class="prog-avatar">${_initials(r.prenom, r.nom)}</div>
          <span class="prog-name-text">${_esc(name)}</span>
        </div>
      </td>
      <td>
        <span class="badge badge-neutral" style="font-size:11px">
          ${_esc(r.cohorte_nom || '—')}
        </span>
      </td>
      <td>
        <div class="prog-seances">
          <div class="prog-bar-wrap">
            <div class="prog-bar-fill" style="width:${pct}%"></div>
          </div>
          <span class="prog-seances-label">${done}/${total}</span>
        </div>
      </td>
      <td>
        ${r.quiz_count > 0
            ? `<span class="badge ${quizBadge}">${quizAvg}</span>
               <span class="text-muted" style="font-size:11px;margin-left:4px">${r.quiz_count} quiz</span>`
            : `<span class="text-muted" style="font-size:12px">—</span>`}
      </td>
      <td>
        <div class="prog-devoirs">
          ${submitted > 0 ? `
          <span class="badge badge-neutral" title="${submitted} déposé${submitted>1?'s':''}">${submitted} <i data-lucide="upload" style="width:10px;height:10px"></i></span>
          ${pending  > 0 ? `<span class="badge badge-warning" title="${pending} en attente">${pending} <i data-lucide="clock" style="width:10px;height:10px"></i></span>` : ''}
          ${graded   > 0 ? `<span class="badge badge-success" title="${graded} noté${graded>1?'s':''}">${graded} <i data-lucide="check-circle" style="width:10px;height:10px"></i></span>` : ''}
          ` : `<span class="text-muted" style="font-size:12px">—</span>`}
        </div>
      </td>
      <td>
        <span class="text-sm text-muted">${lastAct}</span>
      </td>
      <td>
        <button class="btn btn-sm btn-secondary prog-detail-btn"
                data-id="${r.id}" data-name="${_esc(name)}">
          <i data-lucide="eye" aria-hidden="true"></i> Détail
        </button>
      </td>
    </tr>`;
}

// ─────────────────────────────────────────────────────────────
//  Modal détail stagiaire
// ─────────────────────────────────────────────────────────────
async function _openDetail(profileId, name) {
    // Créer le modal
    const overlay = document.createElement('div');
    overlay.className = 'lms-modal-overlay';
    overlay.id        = 'prog-detail-modal';
    overlay.innerHTML = `
    <div class="lms-modal" style="max-width:740px" role="dialog" aria-label="Détail ${_esc(name)}">
      <div class="lms-modal-header">
        <div class="lms-modal-header-icon lms-modal-header-icon--quiz">
          <i data-lucide="bar-chart-2" aria-hidden="true"></i>
        </div>
        <span class="lms-modal-title">${_esc(name)}</span>
        <button class="btn btn-ghost btn-sm lms-modal-close" aria-label="Fermer">
          <i data-lucide="x" aria-hidden="true"></i>
        </button>
      </div>
      <div class="lms-modal-body prog-detail-body">
        <div class="loading-state" style="padding:var(--space-8)">
          <i data-lucide="loader-2" class="spin" style="width:28px;height:28px"></i>
        </div>
      </div>
    </div>`;

    document.body.appendChild(overlay);
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: overlay });

    const close = () => overlay.remove();
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('.lms-modal-close')?.addEventListener('click', close);
    document.addEventListener('keydown', function onKey(e) {
        if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
    });

    // Charger les données
    const body   = overlay.querySelector('.prog-detail-body');
    const detail = await safeCall(() => getStagiaireDetail(profileId), 'prog: detail');

    if (!detail) {
        body.innerHTML = `<p class="text-muted" style="padding:var(--space-4)">Impossible de charger les données.</p>`;
        return;
    }

    _renderDetailBody(body, detail);
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: body });
}

function _renderDetailBody(body, { progressByCours, quizSubs, devoirSubs }) {
    body.innerHTML = `
    <!-- Progression par cours -->
    <div class="prog-detail-section">
      <div class="prog-detail-section-title">
        <i data-lucide="book-open" aria-hidden="true"></i> Progression par cours
      </div>
      ${progressByCours.length ? progressByCours.map(c => `
      <div class="prog-detail-cours">
        <div class="prog-detail-cours-titre">${_esc(c.cours_titre)}</div>
        <div class="prog-seances" style="flex:1">
          <div class="prog-bar-wrap">
            <div class="prog-bar-fill" style="width:${c.pourcentage ?? 0}%"></div>
          </div>
          <span class="prog-seances-label">${c.terminees}/${c.total_seances} séances</span>
          <span class="badge ${c.pourcentage >= 100 ? 'badge-success' : c.pourcentage > 0 ? 'badge-warning' : 'badge-neutral'}"
                style="font-size:11px">${c.pourcentage ?? 0}%</span>
        </div>
      </div>`).join('') : `<p class="text-muted text-sm">Aucun cours commencé.</p>`}
    </div>

    <!-- Quiz -->
    <div class="prog-detail-section">
      <div class="prog-detail-section-title">
        <i data-lucide="help-circle" aria-hidden="true"></i> Quiz récents
      </div>
      ${quizSubs.length ? `
      <table class="admin-table" style="font-size:var(--font-caption-size)">
        <thead><tr><th>Séance</th><th>Score</th><th>Date</th></tr></thead>
        <tbody>
          ${quizSubs.map(q => {
              const pct = q.max_score > 0 ? Math.round(q.score / q.max_score * 100) : null;
              return `<tr>
                <td>${_esc(q.lms_seances?.titre || q.seance_id)}</td>
                <td>
                  ${pct !== null
                    ? `<span class="badge ${pct >= 70 ? 'badge-success' : 'badge-error'}">${pct}%</span>
                       <span class="text-muted" style="font-size:11px">${q.score}/${q.max_score}</span>`
                    : '<span class="badge badge-neutral">En attente</span>'}
                </td>
                <td class="text-muted">${new Date(q.submitted_at).toLocaleDateString('fr-FR', {day:'2-digit',month:'short',year:'numeric'})}</td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>` : `<p class="text-muted text-sm">Aucun quiz soumis.</p>`}
    </div>

    <!-- Devoirs -->
    <div class="prog-detail-section">
      <div class="prog-detail-section-title">
        <i data-lucide="upload" aria-hidden="true"></i> Devoirs
      </div>
      ${devoirSubs.length ? `
      <table class="admin-table" style="font-size:var(--font-caption-size)">
        <thead><tr><th>Séance</th><th>Note</th><th>Déposé le</th><th>Statut</th></tr></thead>
        <tbody>
          ${devoirSubs.map(d => {
              const isGraded = d.note !== null && d.note !== undefined;
              return `<tr>
                <td>${_esc(d.lms_seances?.titre || d.seance_id)}</td>
                <td>${isGraded
                    ? `<strong>${d.note}/${d.note_max ?? 20}</strong>`
                    : '—'}</td>
                <td class="text-muted">${new Date(d.submitted_at).toLocaleDateString('fr-FR', {day:'2-digit',month:'short',year:'numeric'})}</td>
                <td>
                  <span class="badge ${isGraded ? 'badge-success' : 'badge-warning'}">
                    ${isGraded ? 'Noté' : 'En attente'}
                  </span>
                </td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>` : `<p class="text-muted text-sm">Aucun devoir déposé.</p>`}
    </div>`;
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
    if (days < 30)  return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function _initials(prenom, nom) {
    return `${(prenom || '')[0] || ''}${(nom || '')[0] || ''}`.toUpperCase() || '?';
}

function _esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}
