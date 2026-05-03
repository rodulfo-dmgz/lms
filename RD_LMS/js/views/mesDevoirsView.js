/**
 * mesDevoirsView.js — Page "Mes devoirs" côté stagiaire
 * Design minimaliste, moderne, regroupé par module
 */

export function renderMesDevoirs(container, { devoirs, profile }) {
    const pending = devoirs.filter(d => d.note === null || d.note === undefined);
    const graded  = devoirs.filter(d => d.note !== null && d.note !== undefined);

    // ── Regrouper par module ──────────────────────────────────
    const modulesMap = new Map();
    const orphans    = [];

    for (const d of devoirs) {
        const module = d.lms_seances?.lms_sequences?.lms_cours;
        if (module?.id) {
            if (!modulesMap.has(module.id)) {
                modulesMap.set(module.id, { titre: module.titre || 'Module', devoirs: [] });
            }
            modulesMap.get(module.id).devoirs.push(d);
        } else {
            orphans.push(d);
        }
    }

    const moduleBlocks = [...modulesMap.values()].map(m => {
        const mPending = m.devoirs.filter(d => d.note === null || d.note === undefined).length;
        const mGraded  = m.devoirs.filter(d => d.note !== null && d.note !== undefined).length;
        return `
        <section class="md-module-section">
          <div class="md-module-header">
            <span class="md-module-label">Module</span>
            <h2 class="md-module-title">${_esc(m.titre)}</h2>
            <div class="md-module-line"></div>
            <div class="md-module-badges">
              ${mGraded  ? `<span class="md-module-badge md-module-badge--success">
                              <i data-lucide="check" aria-hidden="true"></i>${mGraded} corrigé${mGraded > 1 ? 's' : ''}
                            </span>` : ''}
              ${mPending ? `<span class="md-module-badge md-module-badge--warning">
                              <i data-lucide="clock" aria-hidden="true"></i>${mPending} en attente
                            </span>` : ''}
            </div>
          </div>
          <div class="md-module-devoirs">
            ${m.devoirs.map(d => _card(d)).join('')}
          </div>
        </section>`;
    }).join('');

    const orphanBlock = orphans.length
        ? `<section class="md-module-section">
             <div class="md-module-header">
               <span class="md-module-label">Autres</span>
               <div class="md-module-line"></div>
             </div>
             <div class="md-module-devoirs">
               ${orphans.map(d => _card(d)).join('')}
             </div>
           </section>`
        : '';

    container.innerHTML = `
    <div class="page-stagiaire mes-devoirs-page">

      <div class="mes-devoirs-header">
        <h1 class="page-title">Mes devoirs</h1>
        <div class="mes-devoirs-stats">
          <span class="md-stat">
            <i data-lucide="file-text" aria-hidden="true"></i>
            <span>${devoirs.length}</span> soumis
          </span>
          ${pending.length ? `<span class="md-stat md-stat--warning">
            <i data-lucide="clock" aria-hidden="true"></i>
            <span>${pending.length}</span> en attente
          </span>` : ''}
          ${graded.length ? `<span class="md-stat md-stat--success">
            <i data-lucide="check-circle" aria-hidden="true"></i>
            <span>${graded.length}</span> corrigé${graded.length > 1 ? 's' : ''}
          </span>` : ''}
        </div>
      </div>

      ${!devoirs.length
        ? `<div class="mes-devoirs-empty">
             <i data-lucide="inbox" aria-hidden="true"></i>
             <p>Vous n'avez encore déposé aucun devoir.</p>
             <a href="#/modules" class="btn btn-cta btn-sm">
               <i data-lucide="book-open" aria-hidden="true"></i> Aller à ma formation
             </a>
           </div>`
        : `<div class="md-modules-list">
             ${moduleBlocks}
             ${orphanBlock}
           </div>`}

    </div>`;
}

// ─── Carte devoir ─────────────────────────────────────────────
function _card(d) {
    const isGraded = d.note !== null && d.note !== undefined;
    const seance   = d.lms_seances;
    const seq      = seance?.lms_sequences;
    const files    = Array.isArray(d.file_urls) ? d.file_urls : [];
    const dateStr  = new Date(d.submitted_at).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'long', year: 'numeric'
    });

    // Score
    const score      = isGraded ? Math.round((d.note / (d.note_max || 20)) * 100) : null;
    const scoreColor = score >= 80 ? 'success' : score >= 50 ? 'warning' : 'error';

    const scoreHTML = isGraded
        ? `<div class="md-score-wrap">
             <div class="md-score md-score--${scoreColor}">
               <span class="md-score__value">${d.note}</span>
               <span class="md-score__max">/${d.note_max ?? 20}</span>
             </div>
           </div>`
        : `<div class="md-score-wrap">
             <span class="md-status-pill md-status-pill--pending">
               <i data-lucide="clock" aria-hidden="true"></i> En attente
             </span>
           </div>`;

    // Body : fichiers + message
    const bodyHTML = (files.length || d.message) ? `
    <div class="md-card__body">
      ${files.length ? `
      <div class="md-files">
        ${files.map(f => `
        <a href="${_esc(f.url)}" target="_blank" rel="noopener" class="md-file" title="${_esc(f.name)}">
          <i data-lucide="paperclip" aria-hidden="true"></i>
          ${_esc(f.name)}
        </a>`).join('')}
      </div>` : ''}
      ${d.message ? `
      <div class="md-message">
        <i data-lucide="quote" aria-hidden="true"></i>
        <span>${_esc(d.message)}</span>
      </div>` : ''}
    </div>` : '';

    // Feedback
    const feedbackHTML = isGraded ? `
    <div class="md-feedback${d.feedback ? '' : ' md-feedback--empty'}">
      <div class="md-feedback__header">
        <i data-lucide="message-circle" aria-hidden="true"></i>
        Feedback du formateur
        ${d.graded_at ? `<span class="md-feedback__date">
          Corrigé le ${new Date(d.graded_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' })}
        </span>` : ''}
      </div>
      <p class="md-feedback__text">
        ${d.feedback ? _esc(d.feedback) : 'Aucun commentaire laissé par le formateur.'}
      </p>
    </div>` : '';

    return `
    <article class="md-card">
      <div class="md-card__top">
        <div class="md-card__info">
          ${seq?.titre ? `
          <div class="md-card__seq">
            <span>${_esc(seq.titre)}</span>
            <i data-lucide="chevron-right" aria-hidden="true"></i>
          </div>` : ''}
          <h3 class="md-card__title">${_esc(seance?.titre || 'Séance inconnue')}</h3>
          <div class="md-card__row">
            <span class="md-card__date">
              <i data-lucide="calendar" aria-hidden="true"></i>
              ${dateStr}
            </span>
          </div>
        </div>
        ${scoreHTML}
      </div>
      ${bodyHTML}
      ${feedbackHTML}
    </article>`;
}

function _esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}
