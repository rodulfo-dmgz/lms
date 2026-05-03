/**
 * quizPlayer.js — Lecteur interactif de quiz pour la vue stagiaire
 *
 * Le bloc inline affiche une carte compacte « Faire le quiz ».
 * Le clic ouvre un modal — fermer (croix / fond / Echap) préserve
 * les réponses déjà saisies sans les effacer.
 *
 * Usage :
 *   import { mountQuizBlocks } from './utils/quizPlayer.js';
 *   mountQuizBlocks(container, { seanceId, stagiaireId });
 */

import { saveQuizSubmission, getQuizSubmission } from '../models/QuizModel.js';
import { safeCall } from '../errorHandler.js';

// ─── État en mémoire : blockId → { submission, draft: Map<qi, value> } ───────
const _state = new Map();

/**
 * Monte tous les blocs quiz trouvés dans container.
 * @param {HTMLElement} container
 * @param {{ seanceId: string, stagiaireId: string|null, previewMode?: boolean }} ctx
 */
export async function mountQuizBlocks(container, { seanceId, stagiaireId, previewMode = false }) {
    const blocks = container.querySelectorAll('.quiz-block[data-quiz]');
    for (const el of blocks) {
        let config;
        try { config = JSON.parse(el.dataset.quiz); } catch { continue; }

        if (previewMode) {
            el.innerHTML = _buildPreviewHTML(config);
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: el });
            continue;
        }

        const existing = await safeCall(
            () => getQuizSubmission({ seanceId, blockId: config.block_id, stagiaireId }),
            'quiz: load submission'
        );

        _state.set(config.block_id, { submission: existing || null, draft: new Map() });
        _mountTrigger(el, config, { seanceId, stagiaireId });
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: el });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Carte déclencheur (inline)
// ─────────────────────────────────────────────────────────────────────────────
function _mountTrigger(el, config, ctx) {
    const { submission } = _state.get(config.block_id) || {};
    el.innerHTML = _buildTriggerHTML(config, submission);
    el.querySelector('.lms-activity-open-btn')?.addEventListener('click', () => {
        _openModal(el, config, ctx);
    });
}

function _buildTriggerHTML(config, submission) {
    // Sections (type:'section') ne comptent pas comme des questions
    const n       = (config.questions || []).filter(q => q.type !== 'section').length;
    const passing = config.passing_score ?? 70;
    const score   = submission?.score ?? 0;
    const maxS    = submission?.max_score ?? 0;
    const pct     = submission && maxS > 0 ? Math.round(score / maxS * 100) : null;
    const passed  = pct !== null && pct >= passing;

    let badge, btnLabel, btnIcon;
    if (!submission) {
        badge    = `<span class="badge badge-neutral">À faire</span>`;
        btnLabel = 'Faire le quiz';
        btnIcon  = 'play-circle';
    } else if (pct === null) {
        badge    = `<span class="badge badge-warning">En attente de correction</span>`;
        btnLabel = 'Voir mes réponses';
        btnIcon  = 'eye';
    } else if (passed) {
        badge    = `<span class="badge badge-success"><i data-lucide="check-circle" style="width:11px;height:11px"></i>&nbsp;Réussi · ${pct}%</span>`;
        btnLabel = 'Voir les résultats';
        btnIcon  = 'bar-chart-2';
    } else {
        badge    = `<span class="badge badge-error"><i data-lucide="x-circle" style="width:11px;height:11px"></i>&nbsp;Non réussi · ${pct}%</span>`;
        btnLabel = 'Voir les résultats';
        btnIcon  = 'bar-chart-2';
    }

    return `
    <div class="lms-activity-card lms-activity-card--quiz">
      <div class="lms-activity-card__icon-wrap lms-activity-card__icon-wrap--quiz">
        <i data-lucide="help-circle" aria-hidden="true"></i>
      </div>
      <div class="lms-activity-card__body">
        <div class="lms-activity-card__title">${_esc(config.title || 'Quiz')}</div>
        <div class="lms-activity-card__meta">
          ${n} question${n > 1 ? 's' : ''}&ensp;·&ensp;Score de passage : ${passing}%
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
    const state = _state.get(config.block_id) || { submission: null, draft: new Map() };

    const modal = _createModal({
        type : 'quiz',
        icon : 'help-circle',
        title: config.title || 'Quiz',
        onClose: () => {
            // Backdrop / X / Echap → sauvegarder brouillon si pas encore soumis
            if (!state.submission) {
                _saveDraft(modal.body, config, state.draft);
                _state.set(config.block_id, state);
            }
        },
    });

    if (state.submission) {
        modal.body.innerHTML = _buildResultHTML(config, state.submission);
        _addCloseFooter(modal);
    } else {
        modal.body.innerHTML = _buildFormHTML(config);
        _restoreDraft(modal.body, config, state.draft);
        const hasSections = (config.questions || []).some(q => q.type === 'section');
        if (config.sectioned && hasSections) {
            _bindSectionedNav(modal, config, ctx, state, triggerEl);
        } else {
            _bindForm(modal, config, ctx, state, triggerEl);
        }
    }

    if (typeof lucide !== 'undefined') lucide.createIcons({ root: modal.overlay });
}

// ─────────────────────────────────────────────────────────────────────────────
//  Formulaire (dans modal)
// ─────────────────────────────────────────────────────────────────────────────
function _buildFormHTML(config) {
    const qs = config.questions || [];
    const hasSections = qs.some(q => q.type === 'section');

    // Mode sectionné : une section à la fois avec navigation
    if (config.sectioned && hasSections) {
        return _buildSectionedFormHTML(config);
    }

    // Mode classique — toutes les questions sur une seule page
    let qNum = 0;
    return `
    <form class="quiz-player__form" novalidate>
      ${qs.map((q, i) => {
          if (q.type === 'section') return _renderSection(q);
          qNum++;
          return _renderQuestion(q, i, qNum);
      }).join('')}
      <div class="quiz-player__footer">
        <button type="submit" class="btn btn-cta">
          <i data-lucide="send" aria-hidden="true"></i> Valider mes réponses
        </button>
      </div>
    </form>`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Navigation section par section
// ─────────────────────────────────────────────────────────────────────────────

/** Découpe les questions en pages (une page = une section + ses questions). */
function _buildPages(config) {
    const qs = config.questions || [];
    const pages = [];
    let current = null;
    let qNum    = 0;

    for (let i = 0; i < qs.length; i++) {
        const q = qs[i];
        if (q.type === 'section') {
            if (current) pages.push(current);
            current = { section: q, entries: [] };
        } else {
            if (!current) current = { section: null, entries: [] };
            qNum++;
            current.entries.push({ q, i, qNum });
        }
    }
    if (current) pages.push(current);
    return pages;
}

function _buildSectionedFormHTML(config) {
    const pages      = _buildPages(config);
    const totalPages = pages.length;
    if (!totalPages) return _buildFormHTML({ ...config, sectioned: false });

    const pagesHtml = pages.map((page, pi) => {
        const sec = page.section;
        const questionsHtml = page.entries.map(({ q, i, qNum }) =>
            _renderQuestion(q, i, qNum)
        ).join('');

        return `
        <div class="quiz-section-page" data-page="${pi}"${pi > 0 ? ' style="display:none"' : ''}>
          ${sec ? `
          <div class="quiz-section-page-header">
            <div class="quiz-section-divider">
              <span class="quiz-section-title">${_esc(sec.text || 'Section')}</span>
            </div>
            ${sec.description ? `<p class="quiz-section-desc">${_esc(sec.description)}</p>` : ''}
          </div>` : ''}
          ${questionsHtml}
        </div>`;
    }).join('');

    const firstSec   = pages[0].section;
    const firstAudio = firstSec?.audio || '';
    const isOnly     = totalPages === 1;

    return `
    <div class="quiz-sectioned-wrapper" data-total-pages="${totalPages}">
      <form class="quiz-player__form quiz-player__form--sectioned" novalidate>
        ${pagesHtml}
      </form>
      <div class="quiz-section-footer">
        <div class="quiz-section-audio" id="quiz-sect-audio"${!firstAudio ? ' style="display:none"' : ''}>
          ${firstAudio ? `
          <span class="quiz-section-audio__label">
            <i data-lucide="headphones" aria-hidden="true"></i>${_esc(firstSec?.text || '')}
          </span>
          <audio controls preload="none" src="${_esc(firstAudio)}"></audio>` : ''}
        </div>
        <div class="quiz-section-nav">
          <button type="button" class="quiz-nav-btn quiz-nav-btn--prev" id="quiz-nav-prev"
                  style="visibility:hidden" aria-label="Section précédente">
            <i data-lucide="circle-chevron-left" aria-hidden="true"></i>
            <span>Précédent</span>
          </button>
          <span class="quiz-section-label" id="quiz-sect-label">
            Section 1&nbsp;/&nbsp;${totalPages}${firstSec?.text ? ' : ' + _esc(firstSec.text) : ''}
          </span>
          <button type="button" id="quiz-nav-next"
                  class="quiz-nav-btn${isOnly ? ' quiz-nav-btn--submit' : ''}"
                  aria-label="${isOnly ? 'Valider mes réponses' : 'Section suivante'}">
            ${isOnly
              ? `<i data-lucide="send" aria-hidden="true"></i><span>Valider</span>`
              : `<span>Suivant</span><i data-lucide="circle-chevron-right" aria-hidden="true"></i>`}
          </button>
        </div>
      </div>
    </div>`;
}

/** Lie la navigation et la soumission en mode sectionné. */
function _bindSectionedNav(modal, config, ctx, state, triggerEl) {
    const wrapper = modal.body.querySelector('.quiz-sectioned-wrapper');
    const form    = wrapper?.querySelector('.quiz-player__form--sectioned');
    if (!wrapper || !form) return;

    const pages      = _buildPages(config);
    const totalPages = pages.length;
    let   current    = 0;

    const _show = (pi) => {
        // Afficher la bonne page
        wrapper.querySelectorAll('.quiz-section-page').forEach((p, idx) => {
            p.style.display = idx === pi ? '' : 'none';
        });
        current = pi;

        const sec     = pages[pi]?.section;
        const isFirst = pi === 0;
        const isLast  = pi === totalPages - 1;

        // Label section
        const label = wrapper.querySelector('#quiz-sect-label');
        if (label) {
            label.innerHTML = `Section ${pi + 1}&nbsp;/&nbsp;${totalPages}${sec?.text ? ' : ' + _esc(sec.text) : ''}`;
        }

        // Bouton précédent — invisible sur la 1ère section
        const prevBtn = wrapper.querySelector('#quiz-nav-prev');
        if (prevBtn) prevBtn.style.visibility = isFirst ? 'hidden' : '';

        // Bouton suivant / valider
        const nextBtn = wrapper.querySelector('#quiz-nav-next');
        if (nextBtn) {
            if (isLast) {
                nextBtn.innerHTML = `<i data-lucide="send" aria-hidden="true"></i><span>Valider</span>`;
                nextBtn.classList.add('quiz-nav-btn--submit');
            } else {
                nextBtn.innerHTML = `<span>Suivant</span><i data-lucide="circle-chevron-right" aria-hidden="true"></i>`;
                nextBtn.classList.remove('quiz-nav-btn--submit');
            }
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: nextBtn });
        }

        // Audio de la section
        const audioEl = wrapper.querySelector('#quiz-sect-audio');
        if (audioEl) {
            const audioUrl = sec?.audio || '';
            if (audioUrl) {
                audioEl.style.display = '';
                audioEl.innerHTML = `
                <span class="quiz-section-audio__label">
                  <i data-lucide="headphones" aria-hidden="true"></i>${_esc(sec.text || '')}
                </span>
                <audio controls preload="none" src="${_esc(audioUrl)}"></audio>`;
                if (typeof lucide !== 'undefined') lucide.createIcons({ root: audioEl });
            } else {
                audioEl.style.display = 'none';
                audioEl.innerHTML = '';
            }
        }

        if (typeof lucide !== 'undefined') lucide.createIcons({ root: wrapper.querySelector('.quiz-section-nav') });
    };

    // Navigation
    wrapper.querySelector('#quiz-nav-prev')?.addEventListener('click', () => {
        if (current > 0) _show(current - 1);
    });

    wrapper.querySelector('#quiz-nav-next')?.addEventListener('click', () => {
        if (current === totalPages - 1) {
            // Dernière section → soumettre
            form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        } else {
            _show(current + 1);
        }
    });

    // Soumission du formulaire (identique au mode classique)
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nextBtn = wrapper.querySelector('#quiz-nav-next');
        if (nextBtn) { nextBtn.disabled = true; nextBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i>'; }
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: wrapper });

        const { answers, score, maxScore } = _collectAnswers(form, config);
        const { seanceId, stagiaireId }    = ctx;

        const result = await safeCall(
            () => saveQuizSubmission({ seanceId, blockId: config.block_id, stagiaireId, answers, score, maxScore }),
            'quiz: save submission'
        );

        if (result) {
            state.submission = result;
            state.draft.clear();
            _state.set(config.block_id, state);

            const triggerContainer = triggerEl;
            triggerContainer.innerHTML = _buildTriggerHTML(config, result);
            triggerContainer.querySelector('.lms-activity-open-btn')?.addEventListener('click', () => {
                _openModal(triggerContainer, config, ctx);
            });
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: triggerContainer });

            modal.body.innerHTML = _buildResultHTML(config, result);
            _addCloseFooter(modal);
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: modal.body });
        } else {
            if (nextBtn) { nextBtn.disabled = false; nextBtn.innerHTML = '<i data-lucide="send" aria-hidden="true"></i><span>Valider</span>'; }
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: wrapper });
        }
    });
}

function _renderSection(q) {
    const title = (q.text || '').trim();
    return `
    <div class="quiz-section-divider">
      ${title ? `<span class="quiz-section-title">${_esc(title)}</span>` : '<span class="quiz-section-title quiz-section-title--empty">Section</span>'}
    </div>
    ${q.description ? `<p class="quiz-section-desc">${_esc(q.description)}</p>` : ''}`;
}

function _renderQuestion(q, i, qNum) {
    let inputHtml = '';
    if (q.type === 'truefalse') {
        inputHtml = `
        <div class="quiz-q-options">
          <label class="quiz-q-opt"><input type="radio" name="q${i}" value="0" required> Vrai</label>
          <label class="quiz-q-opt"><input type="radio" name="q${i}" value="1"> Faux</label>
        </div>`;
    } else if (q.type === 'mcq') {
        inputHtml = `
        <div class="quiz-q-options">
          ${(q.options || []).map((o, oi) => `
          <label class="quiz-q-opt">
            <input type="radio" name="q${i}" value="${oi}" required>
            ${(o || '').trim() ? _esc(o) : '<em class="quiz-q-empty">Option vide</em>'}
          </label>`).join('')}
        </div>`;
    } else if (q.type === 'checkbox') {
        inputHtml = `
        <div class="quiz-q-options">
          ${(q.options || []).map((o, oi) => `
          <label class="quiz-q-opt">
            <input type="checkbox" name="q${i}" value="${oi}">
            ${(o || '').trim() ? _esc(o) : '<em class="quiz-q-empty">Option vide</em>'}
          </label>`).join('')}
        </div>`;
    } else {
        inputHtml = `
        <div class="quiz-q-shorttext">
          <textarea class="form-input form-textarea" name="q${i}" rows="2"
                    placeholder="Votre réponse…"></textarea>
        </div>`;
    }

    const qText = (q.text || '').trim()
        ? _esc(q.text)
        : `<em class="quiz-q-empty">Question non renseignée</em>`;

    return `
    <div class="quiz-q-block" data-qi="${i}" data-qtype="${q.type}">
      <div class="quiz-q-label">
        <span class="quiz-q-num">${qNum}</span>
        <span class="quiz-q-text">${qText}</span>
      </div>
      ${inputHtml}
    </div>`;
}

function _bindForm(modal, config, { seanceId, stagiaireId }, state, triggerEl) {
    const form = modal.body.querySelector('.quiz-player__form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Envoi…';
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });

        const { answers, score, maxScore } = _collectAnswers(form, config);

        const result = await safeCall(
            () => saveQuizSubmission({
                seanceId,
                blockId:  config.block_id,
                stagiaireId,
                answers,
                score,
                maxScore,
            }),
            'quiz: save submission'
        );

        if (result) {
            state.submission = result;
            state.draft.clear();
            _state.set(config.block_id, state);

            // Mettre à jour la carte trigger (inline)
            triggerEl.innerHTML = _buildTriggerHTML(config, result);
            triggerEl.querySelector('.lms-activity-open-btn')?.addEventListener('click', () => {
                _openModal(triggerEl, config, { seanceId, stagiaireId });
            });
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: triggerEl });

            // Afficher les résultats dans le modal
            modal.body.innerHTML = _buildResultHTML(config, result);
            _addCloseFooter(modal);
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: modal.body });
        } else {
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="send" aria-hidden="true"></i> Valider mes réponses';
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });
        }
    });
}

// ─────────────────────────────────────────────────────────────────────────────
//  Préservation du brouillon (fermeture sans soumission)
// ─────────────────────────────────────────────────────────────────────────────
function _saveDraft(bodyEl, config, draftMap) {
    (config.questions || []).forEach((q, i) => {
        if (q.type === 'section') return; // séparateurs ignorés
        if (q.type === 'truefalse' || q.type === 'mcq') {
            const sel = bodyEl.querySelector(`[name="q${i}"]:checked`);
            if (sel) draftMap.set(i, sel.value); else draftMap.delete(i);
        } else if (q.type === 'checkbox') {
            const sels = Array.from(bodyEl.querySelectorAll(`[name="q${i}"]:checked`)).map(s => s.value);
            if (sels.length) draftMap.set(i, sels); else draftMap.delete(i);
        } else {
            const val = bodyEl.querySelector(`[name="q${i}"]`)?.value || '';
            if (val) draftMap.set(i, val); else draftMap.delete(i);
        }
    });
}

function _restoreDraft(bodyEl, config, draftMap) {
    draftMap.forEach((value, i) => {
        const q = config.questions?.[i];
        if (!q || q.type === 'section') return;
        if (q.type === 'truefalse' || q.type === 'mcq') {
            const inp = bodyEl.querySelector(`[name="q${i}"][value="${value}"]`);
            if (inp) inp.checked = true;
        } else if (q.type === 'checkbox') {
            (Array.isArray(value) ? value : [value]).forEach(v => {
                const inp = bodyEl.querySelector(`[name="q${i}"][value="${v}"]`);
                if (inp) inp.checked = true;
            });
        } else {
            const ta = bodyEl.querySelector(`[name="q${i}"]`);
            if (ta) ta.value = value;
        }
    });
}

// ─────────────────────────────────────────────────────────────────────────────
//  Résultats
// ─────────────────────────────────────────────────────────────────────────────
function _buildResultHTML(config, submission) {
    const score    = submission.score ?? 0;
    const maxScore = submission.max_score ?? 0;
    const pct      = maxScore > 0 ? Math.round(score / maxScore * 100) : null;
    const passing  = config.passing_score ?? 70;
    const passed   = pct !== null && pct >= passing;
    const hasShorttext = config.questions?.some(q => q.type === 'shorttext');

    const badgeClass = pct === null ? 'badge-neutral' : passed ? 'badge-success' : 'badge-error';
    const badgeIcon  = pct === null ? 'clock' : passed ? 'check-circle' : 'x-circle';
    const badgeLabel = pct === null
        ? 'En attente de correction'
        : passed ? `Réussi — ${pct}%` : `Non réussi — ${pct}%`;

    const answerMap = {};
    (submission.answers || []).forEach(a => { answerMap[a.question_id] = a.answer; });

    let resultQNum = 0;
    const qRows = (config.questions || []).map((q, i) => {
        // Sections → séparateur visuel dans les résultats aussi
        if (q.type === 'section') {
            return `
            <div class="quiz-section-divider quiz-section-divider--result">
              ${(q.text || '').trim() ? `<span class="quiz-section-title">${_esc(q.text)}</span>` : ''}
            </div>
            ${q.description ? `<p class="quiz-section-desc">${_esc(q.description)}</p>` : ''}`;
        }
        resultQNum++;
        const qid    = q.id || `q${i}`;
        const answer = answerMap[qid];
        const ok     = q.type !== 'shorttext' ? _isCorrect(q, answer) : null;

        let answerDisplay = '';
        if (q.type === 'truefalse') {
            answerDisplay = answer === 0 ? 'Vrai' : answer === 1 ? 'Faux' : '—';
        } else if (q.type === 'mcq') {
            answerDisplay = answer != null ? _esc(q.options?.[answer] ?? `Option ${answer + 1}`) : '—';
        } else if (q.type === 'checkbox') {
            const arr = Array.isArray(answer) ? answer : [];
            answerDisplay = arr.length ? arr.map(idx => _esc(q.options?.[idx] ?? `Option ${idx + 1}`)).join(', ') : '—';
        } else {
            answerDisplay = _esc(answer || '—');
        }

        let correctDisplay = '';
        if (config.show_correction && q.type !== 'shorttext') {
            if (q.type === 'truefalse') correctDisplay = q.correct === 0 ? 'Vrai' : 'Faux';
            else if (q.type === 'mcq')  correctDisplay = _esc(q.options?.[q.correct] ?? '');
            else if (q.type === 'checkbox') {
                const arr = Array.isArray(q.correct) ? q.correct : [];
                correctDisplay = arr.map(idx => _esc(q.options?.[idx] ?? `Option ${idx + 1}`)).join(', ');
            }
        }

        return `
        <div class="quiz-result-row ${ok === true ? 'quiz-result-row--ok' : ok === false ? 'quiz-result-row--ko' : ''}">
          <div class="quiz-result-q">
            ${ok === true  ? `<i data-lucide="check-circle" class="quiz-result-icon ok"      aria-hidden="true"></i>` : ''}
            ${ok === false ? `<i data-lucide="x-circle"     class="quiz-result-icon ko"      aria-hidden="true"></i>` : ''}
            ${ok === null  ? `<i data-lucide="clock"         class="quiz-result-icon pending" aria-hidden="true"></i>` : ''}
            <span class="quiz-result-num">Q${resultQNum}</span>
            <span class="quiz-result-text">${_esc(q.text || '')}</span>
          </div>
          <div class="quiz-result-answer">
            <span class="quiz-result-label">Votre réponse :</span>
            <span class="quiz-result-val">${answerDisplay}</span>
          </div>
          ${config.show_correction && correctDisplay ? `
          <div class="quiz-result-correct">
            <span class="quiz-result-label">Bonne réponse :</span>
            <span class="quiz-result-val ok">${correctDisplay}</span>
          </div>` : ''}
          ${config.show_correction && q.explanation ? `
          <div class="quiz-result-explanation">
            <i data-lucide="info" aria-hidden="true"></i> ${_esc(q.explanation)}
          </div>` : ''}
        </div>`;
    });

    return `
    <div class="quiz-modal-result">
      <div class="quiz-modal-score-banner ${passed ? 'quiz-modal-score-banner--pass' : pct === null ? 'quiz-modal-score-banner--neutral' : 'quiz-modal-score-banner--fail'}">
        <span class="badge ${badgeClass}" style="font-size:var(--font-body2-size);padding:.4em .8em">
          <i data-lucide="${badgeIcon}" aria-hidden="true"></i>
          ${badgeLabel}
        </span>
        ${pct !== null ? `<span class="quiz-modal-score-pts">${score} / ${maxScore} point${maxScore > 1 ? 's' : ''}</span>` : ''}
        ${hasShorttext ? `<span class="badge badge-neutral" style="font-size:10px">Réponses courtes évaluées manuellement</span>` : ''}
      </div>
      ${config.show_correction ? `<div class="quiz-result-list">${qRows.join('')}</div>` : ''}
    </div>`;
}

function _addCloseFooter(modal) {
    if (modal.body.querySelector('.lms-modal-footer-close')) return;
    const div = document.createElement('div');
    div.className = 'quiz-player__footer lms-modal-footer-close';
    div.innerHTML = `<button class="btn btn-secondary">
        <i data-lucide="x" aria-hidden="true"></i> Fermer
    </button>`;
    div.querySelector('button')?.addEventListener('click', () => modal.close());
    modal.body.appendChild(div);
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: div });
}

// ─────────────────────────────────────────────────────────────────────────────
//  Aperçu éditeur
// ─────────────────────────────────────────────────────────────────────────────
function _buildPreviewHTML(config) {
    const n = (config.questions || []).filter(q => q.type !== 'section').length;
    return `
    <div class="lms-activity-card lms-activity-card--quiz lms-activity-card--preview">
      <div class="lms-activity-card__icon-wrap lms-activity-card__icon-wrap--quiz">
        <i data-lucide="help-circle" aria-hidden="true"></i>
      </div>
      <div class="lms-activity-card__body">
        <div class="lms-activity-card__title">${_esc(config.title || 'Quiz')}</div>
        <div class="lms-activity-card__meta">
          ${n} question${n > 1 ? 's' : ''}&ensp;·&ensp;Score de passage : ${config.passing_score ?? 70}%
        </div>
        <div class="lms-activity-card__status">
          <span class="badge badge-neutral">À faire</span>
        </div>
      </div>
      <span class="badge badge-warning">
        <i data-lucide="eye" aria-hidden="true"></i> Mode aperçu
      </span>
    </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Scoring
// ─────────────────────────────────────────────────────────────────────────────
function _collectAnswers(form, config) {
    const answers  = [];
    let score    = 0;
    let maxScore = 0;

    config.questions.forEach((q, i) => {
        if (q.type === 'section') return; // séparateurs ignorés
        let answer;
        if (q.type === 'truefalse' || q.type === 'mcq') {
            const sel = form.querySelector(`[name="q${i}"]:checked`);
            answer = sel ? parseInt(sel.value, 10) : null;
        } else if (q.type === 'checkbox') {
            const sels = form.querySelectorAll(`[name="q${i}"]:checked`);
            answer = Array.from(sels).map(el => parseInt(el.value, 10));
        } else {
            answer = form.querySelector(`[name="q${i}"]`)?.value?.trim() || '';
        }

        answers.push({ question_id: q.id || `q${i}`, answer });

        if (q.type !== 'shorttext') {
            maxScore++;
            if (_isCorrect(q, answer)) score++;
        }
    });

    return { answers, score, maxScore };
}

function _isCorrect(q, answer) {
    if (answer === null || answer === undefined) return false;
    if (q.type === 'truefalse' || q.type === 'mcq') return answer === q.correct;
    if (q.type === 'checkbox') {
        const correct = Array.isArray(q.correct) ? [...q.correct].sort() : [];
        const given   = Array.isArray(answer)    ? [...answer].sort()    : [];
        return JSON.stringify(correct) === JSON.stringify(given);
    }
    return false;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Fabrique modale partagée
// ─────────────────────────────────────────────────────────────────────────────
function _createModal({ type, icon, title, onClose }) {
    // Une seule modale à la fois
    document.getElementById('lms-activity-modal')?.remove();

    const overlay = document.createElement('div');
    overlay.id        = 'lms-activity-modal';
    overlay.className = 'lms-modal-overlay';
    // role="dialog" doit être sur l'overlay, pas sur .lms-modal
    // → sinon [role="dialog"]{position:fixed;inset:0} de modals.css s'applique
    //   au div interne et le colle en haut-gauche avec max-width:660px
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', _esc(title));
    // Inline styles : position + flex, le reste (background, padding…) vient de .lms-modal-overlay
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

    // Clic sur le fond (pas sur la modale elle-même) → fermer + sauvegarder brouillon
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(true); });
    overlay.querySelector('.lms-modal-close')?.addEventListener('click', () => close(true));

    return { overlay, body, close: () => close(false) };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Utilitaire
// ─────────────────────────────────────────────────────────────────────────────
function _esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}
