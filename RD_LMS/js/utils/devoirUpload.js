/**
 * devoirUpload.js — Bloc dépôt de fichiers pour la vue stagiaire
 *
 * Le bloc inline affiche une carte compacte « Déposer mon devoir ».
 * Le clic ouvre un modal — fermer sans soumettre conserve les fichiers
 * déjà uploadés en mémoire pour la prochaine ouverture.
 *
 * Usage :
 *   import { mountDevoirBlocks } from './utils/devoirUpload.js';
 *   mountDevoirBlocks(container, { seanceId, stagiaireId });
 */

import { uploadDevoirFile, saveDevoirSubmission, getDevoirSubmission, resetDevoirSubmission } from '../models/DevoirModel.js';
import { safeCall } from '../errorHandler.js';
import { store }    from '../store.js';

// ─── Mappings ─────────────────────────────────────────────────────────────────
const EXT_MAP = {
    pdf:   ['application/pdf'],
    docx:  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/msword'],
    xlsx:  ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-excel'],
    pptx:  ['application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.ms-powerpoint'],
    mp3:   ['audio/mpeg','audio/wav','audio/ogg','audio/mp4'],
    mp4:   ['video/mp4','video/webm'],
    image: ['image/jpeg','image/png','image/gif','image/webp'],
    zip:   ['application/zip','application/x-zip-compressed'],
};
const TYPE_LABELS = {
    pdf: 'PDF', docx: 'Word', xlsx: 'Excel', pptx: 'PowerPoint',
    mp3: 'Audio', mp4: 'Vidéo', image: 'Image', zip: 'ZIP',
};

// ─── État en mémoire : blockId → { submission, pendingFiles, message } ────────
const _state = new Map();

/**
 * Monte tous les blocs devoir trouvés dans container.
 * @param {HTMLElement} container
 * @param {{ seanceId: string, stagiaireId: string|null, seanceTitre?: string, previewMode?: boolean }} ctx
 */
export async function mountDevoirBlocks(container, { seanceId, stagiaireId, seanceTitre = '', previewMode = false }) {
    const blocks = container.querySelectorAll('.devoir-block[data-devoir]');
    for (const el of blocks) {
        let config;
        try { config = JSON.parse(el.dataset.devoir); } catch { continue; }

        if (previewMode) {
            el.innerHTML = _buildPreviewHTML(config);
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: el });
            continue;
        }

        const existing = await safeCall(
            () => getDevoirSubmission({ seanceId, blockId: config.block_id, stagiaireId }),
            'devoir: load submission'
        );

        // Initialiser l'état (fichiers existants comme point de départ)
        if (!_state.has(config.block_id)) {
            _state.set(config.block_id, {
                submission:   existing || null,
                pendingFiles: [...(existing?.file_urls || [])],
                message:      existing?.message || '',
            });
        }

        _mountTrigger(el, config, { seanceId, stagiaireId, seanceTitre });
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: el });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Carte déclencheur (inline)
// ─────────────────────────────────────────────────────────────────────────────
function _mountTrigger(el, config, ctx) {
    const state = _state.get(config.block_id) || {};
    el.innerHTML = _buildTriggerHTML(config, state.submission);
    el.querySelector('.lms-activity-open-btn')?.addEventListener('click', () => {
        _openModal(el, config, ctx);
    });
}

function _remountTrigger(triggerEl, config, ctx) {
    const state = _state.get(config.block_id) || {};
    triggerEl.innerHTML = _buildTriggerHTML(config, state.submission);
    triggerEl.querySelector('.lms-activity-open-btn')?.addEventListener('click', () => {
        _openModal(triggerEl, config, ctx);
    });
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: triggerEl });
}

function _buildTriggerHTML(config, submission) {
    const isGraded    = submission?.note !== null && submission?.note !== undefined;
    const isSubmitted = submission?.file_urls?.length > 0;
    const types       = (config.accepted_types || []).map(t => TYPE_LABELS[t] || t).join(', ') || '—';
    const maxFiles    = config.max_files ?? 3;

    let badge, btnLabel, btnIcon;
    if (isGraded) {
        badge    = `<span class="badge badge-success">
            <i data-lucide="check-circle" style="width:11px;height:11px"></i>&nbsp;Noté : ${submission.note}/${submission.note_max ?? 20}
          </span>`;
        btnLabel = 'Voir le feedback';
        btnIcon  = 'message-square';
    } else if (isSubmitted) {
        badge    = `<span class="badge badge-warning">
            <i data-lucide="clock" style="width:11px;height:11px"></i>&nbsp;En attente de correction
          </span>`;
        btnLabel = 'Voir mon dépôt';
        btnIcon  = 'folder-open';
    } else {
        badge    = `<span class="badge badge-neutral">À déposer</span>`;
        btnLabel = 'Déposer mon devoir';
        btnIcon  = 'upload-cloud';
    }

    return `
    <div class="lms-activity-card lms-activity-card--devoir">
      <div class="lms-activity-card__icon-wrap lms-activity-card__icon-wrap--devoir">
        <i data-lucide="upload" aria-hidden="true"></i>
      </div>
      <div class="lms-activity-card__body">
        <div class="lms-activity-card__title">${_esc(config.title || 'Devoir à rendre')}</div>
        <div class="lms-activity-card__meta">
          ${_esc(types)}&ensp;·&ensp;${maxFiles} fichier${maxFiles > 1 ? 's' : ''} max
        </div>
        <div class="lms-activity-card__status">${badge}</div>
      </div>
      <button class="btn btn-cta lms-activity-open-btn">
        <i data-lucide="${btnIcon}" aria-hidden="true"></i> ${btnLabel}
      </button>
    </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Modal
// ─────────────────────────────────────────────────────────────────────────────
function _openModal(triggerEl, config, ctx) {
    const state = _state.get(config.block_id) || { submission: null, pendingFiles: [], message: '' };

    const modal = _createModal({
        type : 'devoir',
        icon : 'upload',
        title: config.title || 'Devoir à rendre',
        onClose: () => {
            // Sauvegarder le message en cours avant fermeture
            const msgEl = modal.body.querySelector('#devoir-message');
            if (msgEl) state.message = msgEl.value;
            _state.set(config.block_id, state);
        },
    });

    const sub = state.submission;
    const isGraded    = sub?.note !== null && sub?.note !== undefined;
    const isSubmitted = sub?.file_urls?.length > 0;

    if (isGraded) {
        modal.body.innerHTML = _buildGradedHTML(config, sub);
        _addCloseFooter(modal);
    } else if (isSubmitted) {
        modal.body.innerHTML = _buildSubmittedHTML(config, sub);
        // Bouton "Modifier mon dépôt"
        modal.body.querySelector('#devoir-reset-btn')?.addEventListener('click', async () => {
            const btn = modal.body.querySelector('#devoir-reset-btn');
            btn.disabled  = true;
            btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Suppression…';
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });

            const ok = await safeCall(
                () => resetDevoirSubmission({ submissionId: sub.id, fileUrls: sub.file_urls, stagiaireId: ctx.stagiaireId }),
                'devoir: reset submission'
            );

            if (ok !== null) {
                // Remettre l'état à zéro
                _state.set(config.block_id, { submission: null, pendingFiles: [], message: '' });
                _remountTrigger(triggerEl, config, ctx);

                // Afficher le formulaire de dépôt
                const emptyState = _state.get(config.block_id);
                modal.body.innerHTML = _buildUploadFormHTML(config, emptyState.pendingFiles, emptyState.message);
                _bindUploadForm(modal, config, ctx, emptyState, triggerEl);
                if (typeof lucide !== 'undefined') lucide.createIcons({ root: modal.body });
            } else {
                btn.disabled  = false;
                btn.innerHTML = '<i data-lucide="trash-2" aria-hidden="true"></i> Modifier mon dépôt';
                if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });
            }
        });
        _addCloseFooter(modal);
    } else {
        modal.body.innerHTML = _buildUploadFormHTML(config, state.pendingFiles, state.message);
        _bindUploadForm(modal, config, ctx, state, triggerEl);
    }

    if (typeof lucide !== 'undefined') lucide.createIcons({ root: modal.overlay });
}

// ─────────────────────────────────────────────────────────────────────────────
//  États du modal
// ─────────────────────────────────────────────────────────────────────────────
function _buildGradedHTML(config, sub) {
    const types = (config.accepted_types || []).map(t => TYPE_LABELS[t] || t).join(', ');
    return `
    <div class="devoir-modal-content">
      ${config.instructions ? `<div class="devoir-player__instructions">${config.instructions}</div>` : ''}

      <div class="devoir-grade-result-banner">
        <div class="devoir-grade-badge">
          <span class="devoir-grade-score">${sub.note}<span class="devoir-grade-max">/${sub.note_max ?? 20}</span></span>
          <span class="devoir-grade-label">Note</span>
        </div>
        ${sub.graded_at ? `<span class="text-sm text-muted">Corrigé le ${new Date(sub.graded_at).toLocaleDateString('fr-FR', {day:'2-digit',month:'long',year:'numeric'})}</span>` : ''}
      </div>

      <div class="devoir-feedback">
        <div class="devoir-feedback__header">
          <i data-lucide="message-square" aria-hidden="true"></i>
          <strong>Feedback du formateur</strong>
        </div>
        ${sub.feedback
            ? `<div class="devoir-feedback__text">${_esc(sub.feedback)}</div>`
            : `<p class="devoir-feedback__empty">Aucun commentaire.</p>`}
      </div>

      <div class="devoir-section-label">Fichiers déposés</div>
      <div class="devoir-submitted-files">
        ${(sub.file_urls || []).map(f => _renderFileChip(f, false)).join('')}
      </div>
    </div>`;
}

function _buildSubmittedHTML(config, sub) {
    return `
    <div class="devoir-modal-content">
      ${config.instructions ? `<div class="devoir-player__instructions">${config.instructions}</div>` : ''}

      <div class="devoir-submitted-notice">
        <i data-lucide="check-circle" aria-hidden="true"></i>
        Devoir déposé le ${new Date(sub.submitted_at).toLocaleDateString('fr-FR', {day:'2-digit',month:'long',year:'numeric'})}
        — en attente de correction.
      </div>

      <div class="devoir-section-label">Fichiers déposés</div>
      <div class="devoir-submitted-files">
        ${(sub.file_urls || []).map(f => _renderFileChip(f, false)).join('')}
      </div>
      ${sub.message ? `<div class="devoir-section-label" style="margin-top:var(--space-3)">Votre message</div>
        <p class="devoir-feedback__text">${_esc(sub.message)}</p>` : ''}

      <div class="devoir-upload-actions devoir-reset-actions" style="margin-top:var(--space-4);border-top:1px solid var(--border-light);padding-top:var(--space-3)">
        <button type="button" id="devoir-reset-btn" class="btn btn-secondary btn-sm">
          <i data-lucide="trash-2" aria-hidden="true"></i>
          Modifier mon dépôt
        </button>
        <span class="devoir-reset-hint">
          <i data-lucide="info" aria-hidden="true"></i>
          Ceci supprime votre dépôt actuel et vous permet d'en soumettre un nouveau.
        </span>
      </div>
    </div>`;
}

function _buildUploadFormHTML(config, pendingFiles, message) {
    const max    = config.max_files ?? 3;
    const canAdd = pendingFiles.length < max;

    return `
    <div class="devoir-modal-content">
      ${config.instructions ? `<div class="devoir-player__instructions">${config.instructions}</div>` : ''}

      <div class="devoir-section-label">Fichiers (${pendingFiles.length} / ${max})</div>
      <div class="devoir-files-list" id="devoir-files-list">
        ${pendingFiles.map((f, i) => _renderFileChip(f, true, i)).join('')}
      </div>

      ${canAdd ? `
      <div class="devoir-dropzone" id="devoir-dz">
        <i data-lucide="upload-cloud" aria-hidden="true" style="width:28px;height:28px"></i>
        <span>Glisser-déposer ou <label class="devoir-browse-label">
          parcourir<input type="file" class="devoir-file-input" id="devoir-file-input"
            multiple accept="${_buildAccept(config.accepted_types || [])}"
            style="display:none">
        </label></span>
        <span class="devoir-dropzone__hint">${_buildHint(config.accepted_types || [], max - pendingFiles.length)}</span>
      </div>` : `
      <p class="devoir-max-notice">
        <i data-lucide="info" aria-hidden="true"></i>
        Nombre maximum de fichiers atteint (${max}).
      </p>`}

      <div class="devoir-upload-progress hidden" id="devoir-progress">
        <div class="devoir-progress-bar"><div class="devoir-progress-fill" id="devoir-progress-fill"></div></div>
        <span class="devoir-progress-label" id="devoir-progress-label">Envoi en cours…</span>
      </div>

      <div class="form-group" style="margin-top:var(--space-4)">
        <label class="form-label">Commentaire (optionnel)</label>
        <textarea class="form-input form-textarea" id="devoir-message" rows="2"
                  placeholder="Ajoutez un message pour le formateur…">${_esc(message || '')}</textarea>
      </div>

      <label class="devoir-copyright-label">
        <input type="checkbox" id="devoir-copyright-check">
        <span>J'atteste que ce travail est le mien et que j'accepte son utilisation dans le cadre exclusif de cette formation.</span>
      </label>

      <div class="devoir-upload-actions" style="margin-top:var(--space-4)">
        <button type="button" class="btn btn-cta" id="devoir-submit-btn" disabled>
          <i data-lucide="send" aria-hidden="true"></i>
          ${pendingFiles.length > 0 ? 'Soumettre le devoir' : 'Ajoutez des fichiers…'}
        </button>
      </div>
    </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Binding upload form
// ─────────────────────────────────────────────────────────────────────────────
function _bindUploadForm(modal, config, { seanceId, stagiaireId, seanceTitre }, state, triggerEl) {
    const el          = modal.body;
    const max         = config.max_files ?? 3;
    const profile     = store.getActiveProfile() || store.getProfile();
    const studentName = [profile?.prenom, profile?.nom].filter(Boolean).join('_') || '';

    // Ré-afficher le formulaire avec la liste de fichiers à jour
    const rerender = () => {
        const msg = el.querySelector('#devoir-message')?.value || '';
        state.message = msg;
        modal.body.innerHTML = _buildUploadFormHTML(config, state.pendingFiles, state.message);
        _bindUploadForm(modal, config, { seanceId, stagiaireId, seanceTitre }, state, triggerEl);
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: modal.body });
    };

    // ── Droit d'auteur → active/désactive le bouton ──────────
    const _syncSubmitBtn = () => {
        const checked = el.querySelector('#devoir-copyright-check')?.checked;
        const hasFiles = state.pendingFiles.length > 0;
        const btn = el.querySelector('#devoir-submit-btn');
        if (btn) {
            btn.disabled  = !(checked && hasFiles);
            btn.innerHTML = hasFiles
                ? `<i data-lucide="send" aria-hidden="true"></i> Soumettre le devoir`
                : `<i data-lucide="send" aria-hidden="true"></i> Ajoutez des fichiers…`;
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });
        }
    };
    el.querySelector('#devoir-copyright-check')?.addEventListener('change', _syncSubmitBtn);

    // ── Input fichier ────────────────────────────────────────
    el.querySelector('#devoir-file-input')?.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files || []);
        await _handleFiles(files, el, config, state.pendingFiles, max, seanceId, stagiaireId, studentName, seanceTitre, rerender);
        e.target.value = '';
    });

    // ── Drag & drop ──────────────────────────────────────────
    const dz = el.querySelector('#devoir-dz');
    if (dz) {
        dz.addEventListener('dragover',  (e) => { e.preventDefault(); dz.classList.add('dragover'); });
        dz.addEventListener('dragleave', ()  => dz.classList.remove('dragover'));
        dz.addEventListener('drop', async (e) => {
            e.preventDefault();
            dz.classList.remove('dragover');
            await _handleFiles(
                Array.from(e.dataTransfer.files || []),
                el, config, state.pendingFiles, max, seanceId, stagiaireId, studentName, seanceTitre, rerender
            );
        });
    }

    // ── Supprimer un fichier ─────────────────────────────────
    el.querySelectorAll('.devoir-remove-file').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.fidx, 10);
            state.pendingFiles.splice(idx, 1);
            rerender();
        });
    });

    // ── Soumettre ────────────────────────────────────────────
    el.querySelector('#devoir-submit-btn')?.addEventListener('click', async () => {
        const btn     = el.querySelector('#devoir-submit-btn');
        const message = el.querySelector('#devoir-message')?.value?.trim() || '';
        btn.disabled  = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Envoi…';
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });

        const saved = await safeCall(
            () => saveDevoirSubmission({
                seanceId,
                blockId:     config.block_id,
                stagiaireId,
                fileUrls:    state.pendingFiles,
                message,
            }),
            'devoir: save submission'
        );

        if (saved) {
            state.submission = saved;
            state.message    = '';
            _state.set(config.block_id, state);

            // Mettre à jour la carte trigger
            _remountTrigger(triggerEl, config, { seanceId, stagiaireId, seanceTitre });

            // Afficher état soumis dans le modal
            modal.body.innerHTML = _buildSubmittedHTML(config, saved);
            _addCloseFooter(modal);
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: modal.body });
        } else {
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="send" aria-hidden="true"></i> Soumettre le devoir';
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });
        }
    });
}

async function _handleFiles(files, el, config, pendingFiles, max, seanceId, stagiaireId, studentName, seanceTitre, rerender) {
    const allowed   = _buildMimeList(config.accepted_types || []);
    const remaining = max - pendingFiles.length;
    const toUpload  = files.filter(f => allowed.includes(f.type)).slice(0, remaining);
    if (!toUpload.length) return;

    const progress      = el.querySelector('#devoir-progress');
    const progressFill  = el.querySelector('#devoir-progress-fill');
    const progressLabel = el.querySelector('#devoir-progress-label');
    progress?.classList.remove('hidden');

    for (let i = 0; i < toUpload.length; i++) {
        const f = toUpload[i];
        if (progressLabel) progressLabel.textContent = `Envoi de ${f.name}…`;
        if (progressFill)  progressFill.style.width  = `${Math.round((i / toUpload.length) * 100)}%`;

        const uploaded = await safeCall(
            () => uploadDevoirFile(stagiaireId, seanceId, config.block_id, f, studentName, seanceTitre),
            'devoir: upload file'
        );
        if (uploaded) {
            // Renommer le fichier pour l'admin : "Prenom Nom - NomFichier.ext"
            const displayName = (studentName || '').replace(/_/g, ' ').trim();
            if (displayName) uploaded.name = `${displayName} - ${f.name}`;
            pendingFiles.push(uploaded);
        }
    }

    progress?.classList.add('hidden');
    rerender();
}

// ─────────────────────────────────────────────────────────────────────────────
//  Aperçu éditeur — version compacte / minimaliste
// ─────────────────────────────────────────────────────────────────────────────
function _buildPreviewHTML(config) {
    const types    = (config.accepted_types || []).map(t => TYPE_LABELS[t] || t).join(' · ') || '—';
    const maxFiles = config.max_files ?? 3;
    return `
    <div class="devoir-preview-mini">
      <span class="devoir-preview-mini__icon">
        <i data-lucide="upload" aria-hidden="true"></i>
      </span>
      <span class="devoir-preview-mini__title">${_esc(config.title || 'Devoir à rendre')}</span>
      <span class="devoir-preview-mini__meta">${_esc(types)}&thinsp;·&thinsp;${maxFiles} fichier${maxFiles > 1 ? 's' : ''} max</span>
      <span class="devoir-preview-mini__badge">aperçu</span>
    </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Chip fichier
// ─────────────────────────────────────────────────────────────────────────────
function _renderFileChip(f, removable = false, idx = 0) {
    const icon = _fileIcon(f.type || '');
    const size = f.size ? _fmtSize(f.size) : '';
    return `
    <div class="devoir-file-chip" data-fidx="${idx}">
      <i data-lucide="${icon}" aria-hidden="true"></i>
      <a href="${f.url}" target="_blank" rel="noopener" class="devoir-file-chip__name">${_esc(f.name)}</a>
      ${size ? `<span class="devoir-file-chip__size">${size}</span>` : ''}
      ${removable ? `<button type="button" class="btn-icon devoir-remove-file" data-fidx="${idx}" title="Retirer">
        <i data-lucide="x" aria-hidden="true"></i>
      </button>` : ''}
    </div>`;
}

function _addCloseFooter(modal) {
    if (modal.body.querySelector('.lms-modal-footer-close')) return;
    const div = document.createElement('div');
    div.className = 'devoir-upload-actions lms-modal-footer-close';
    div.style.marginTop = 'var(--space-4)';
    div.innerHTML = `<button class="btn btn-secondary">
        <i data-lucide="x" aria-hidden="true"></i> Fermer
    </button>`;
    div.querySelector('button')?.addEventListener('click', () => modal.close());
    modal.body.appendChild(div);
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: div });
}

// ─────────────────────────────────────────────────────────────────────────────
//  Fabrique modale partagée
// ─────────────────────────────────────────────────────────────────────────────
function _createModal({ type, icon, title, onClose }) {
    document.getElementById('lms-activity-modal')?.remove();

    const overlay = document.createElement('div');
    overlay.id        = 'lms-activity-modal';
    overlay.className = 'lms-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', _esc(title));
    Object.assign(overlay.style, {
        position:       'fixed',
        top:            '0',
        left:           '0',
        right:          '0',
        bottom:         '0',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        zIndex:         '9999',
    });
    overlay.innerHTML = `
    <div class="lms-modal">
      <div class="lms-modal-header">
        <div class="lms-modal-header-icon lms-modal-header-icon--${type}">
          <i data-lucide="${icon}" aria-hidden="true"></i>
        </div>
        <span class="lms-modal-title">${_esc(title)}</span>
        <button class="btn btn-ghost btn-sm lms-modal-close" aria-label="Fermer">
          <i data-lucide="x" aria-hidden="true"></i>
        </button>
      </div>
      <div class="lms-modal-body"></div>
    </div>`;

    document.body.appendChild(overlay);
    const body = overlay.querySelector('.lms-modal-body');

    let closed = false;
    const close = (triggerCallback = false) => {
        if (closed) return;
        closed = true;
        if (triggerCallback) onClose?.();
        overlay.remove();
        document.removeEventListener('keydown', _onKeyDown);
    };

    const _onKeyDown = (e) => { if (e.key === 'Escape') close(true); };
    document.addEventListener('keydown', _onKeyDown);

    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(true); });
    overlay.querySelector('.lms-modal-close')?.addEventListener('click', () => close(true));

    return { overlay, body, close: () => close(false) };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────
function _buildAccept(types) {
    return types.flatMap(t => EXT_MAP[t] || []).join(',');
}
function _buildMimeList(types) {
    return types.flatMap(t => EXT_MAP[t] || []);
}
function _buildHint(types, remaining) {
    const labels = types.map(t => TYPE_LABELS[t] || t).join(', ');
    return `${labels} · ${remaining} fichier${remaining > 1 ? 's' : ''} restant${remaining > 1 ? 's' : ''}`;
}
function _fileIcon(mime) {
    if (mime.startsWith('image/'))  return 'image';
    if (mime.startsWith('video/'))  return 'play';
    if (mime.startsWith('audio/'))  return 'headphones';
    if (mime.includes('pdf'))       return 'file-text';
    if (mime.includes('word') || mime.includes('document')) return 'file-type-2';
    if (mime.includes('sheet') || mime.includes('excel'))   return 'table-2';
    if (mime.includes('presentation') || mime.includes('powerpoint')) return 'presentation';
    if (mime.includes('zip'))       return 'archive';
    return 'file';
}
function _fmtSize(bytes) {
    if (bytes < 1024)        return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}
function _esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}
