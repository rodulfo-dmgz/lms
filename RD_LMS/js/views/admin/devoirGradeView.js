/**
 * devoirGradeView.js — Interface admin pour noter les devoirs déposés
 */

import { getPendingDevoirSubmissions, gradeDevoirSubmission } from '../../models/DevoirModel.js';
import { safeCall } from '../../errorHandler.js';
import { store }    from '../../store.js';

export async function renderDevoirGrade(container) {
    container.innerHTML = `
    <div class="page-admin-devoirs">
      <div class="admin-page-header">
        <h2 class="page-title">
          <i data-lucide="upload" aria-hidden="true"></i> Devoirs à corriger
        </h2>
      </div>
      <div id="devoirs-list-area">
        <div class="loading-state">
          <i data-lucide="loader-2" class="spin" style="width:32px;height:32px"></i>
        </div>
      </div>
    </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });

    const subs = await safeCall(getPendingDevoirSubmissions, 'devoirGrade: load');
    renderList(container.querySelector('#devoirs-list-area'), subs || []);
}

function renderList(area, subs) {
    if (!subs.length) {
        area.innerHTML = `
        <div class="empty-state" style="padding:var(--space-8);text-align:center">
          <i data-lucide="check-circle" style="width:48px;height:48px;color:var(--text-muted)"></i>
          <p style="color:var(--text-muted);margin-top:var(--space-3)">
            Aucun devoir en attente de correction.
          </p>
        </div>`;
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: area });
        return;
    }

    area.innerHTML = `
    <div class="devoirs-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Stagiaire</th>
            <th>Séance</th>
            <th>Déposé le</th>
            <th>Fichiers</th>
            <th>Message</th>
            <th>Note</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${subs.map(s => renderRow(s)).join('')}
        </tbody>
      </table>
    </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons({ root: area });

    // Bind grading forms
    area.querySelectorAll('.devoir-grade-form').forEach(form => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const subId   = form.dataset.subId;
            const noteEl  = form.querySelector('.grade-note');
            const fbEl    = form.querySelector('.grade-feedback');
            const noteMax = parseFloat(form.dataset.noteMax || '20');
            const note    = parseFloat(noteEl?.value);
            if (isNaN(note) || note < 0 || note > noteMax) {
                noteEl?.classList.add('input-error');
                return;
            }
            noteEl?.classList.remove('input-error');

            const btn    = form.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i>';
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });

            const saved = await safeCall(
                () => gradeDevoirSubmission({
                    submissionId: subId,
                    note,
                    noteMax,
                    feedback:  fbEl?.value?.trim() || '',
                    gradedBy:  store.getProfile()?.id,
                }),
                'devoirGrade: save'
            );

            if (saved) {
                // Retirer la ligne du tableau
                form.closest('tr')?.remove();
                // Afficher "Noté ✓" temporairement
                const tbody = area.querySelector('tbody');
                if (!tbody?.children.length) {
                    renderList(area, []);
                }
            } else {
                btn.disabled = false;
                btn.innerHTML = '<i data-lucide="check"></i> Valider';
                if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });
            }
        });
    });
}

function renderRow(s) {
    const prof  = s.lms_profiles || {};
    const name  = [prof.prenom, prof.nom].filter(Boolean).join(' ') || s.stagiaire_id;
    const titre = s.lms_seances?.titre || s.seance_id;
    const date  = new Date(s.submitted_at).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
    const files = s.file_urls || [];

    return `
    <tr>
      <td>
        <span class="admin-cell-name__text">${escHtml(name)}</span>
      </td>
      <td><span class="text-sm">${escHtml(titre)}</span></td>
      <td><span class="text-sm text-muted">${date}</span></td>
      <td>
        <div class="devoir-grade-files">
          ${files.map(f => `
          <a href="${f.url}" target="_blank" rel="noopener"
             class="devoir-grade-file-link" title="${escHtml(f.name)}">
            <i data-lucide="paperclip" aria-hidden="true"></i>
            <span>${escHtml(f.name)}</span>
          </a>`).join('')}
        </div>
      </td>
      <td>
        <span class="text-sm text-muted">${s.message ? escHtml(s.message.slice(0,60))+'…' : '—'}</span>
      </td>
      <td>
        <form class="devoir-grade-form" data-sub-id="${s.id}" data-note-max="${s.note_max ?? 20}" novalidate>
          <div class="devoir-grade-inputs">
            <input type="number" class="form-input form-input--sm grade-note"
                   min="0" max="${s.note_max ?? 20}" step="0.5"
                   placeholder="0–${s.note_max ?? 20}" style="width:80px" required>
            <span class="text-muted">/ ${s.note_max ?? 20}</span>
          </div>
          <textarea class="form-input form-textarea grade-feedback" rows="2"
                    placeholder="Feedback (optionnel)…"
                    style="margin-top:var(--space-1);font-size:var(--font-caption-size)"></textarea>
      </td>
      <td>
          <button type="submit" class="btn btn-cta btn-sm">
            <i data-lucide="check" aria-hidden="true"></i> Valider
          </button>
        </form>
      </td>
    </tr>`;
}

function escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}
