/**
 * mesDevoirsView.js — Page "Mes devoirs" côté stagiaire
 * Affiche tous les travaux soumis avec leur statut (en attente / corrigé)
 */

export function renderMesDevoirs(container, { devoirs, profile }) {
    const pending = devoirs.filter(d => d.note === null || d.note === undefined);
    const graded  = devoirs.filter(d => d.note !== null && d.note !== undefined);

    container.innerHTML = `
    <div class="page-stagiaire mes-devoirs-page">

      <div class="mes-devoirs-header">
        <div>
          <h1 class="page-title">Mes devoirs</h1>
          <p class="page-sub">
            ${devoirs.length} travail${devoirs.length > 1 ? 'aux' : ''} soumis
            · <span class="text-warning">${pending.length} en attente</span>
            · <span class="text-success">${graded.length} corrigé${graded.length > 1 ? 's' : ''}</span>
          </p>
        </div>
      </div>

      ${!devoirs.length ? `
      <div class="mes-devoirs-empty">
        <i data-lucide="inbox" aria-hidden="true"></i>
        <p>Vous n'avez encore déposé aucun devoir.</p>
        <a href="#/modules" class="btn btn-cta">
          <i data-lucide="book-open" aria-hidden="true"></i> Aller à ma formation
        </a>
      </div>` : `

      ${pending.length > 0 ? `
      <section class="mes-devoirs-section">
        <h2 class="mes-devoirs-section__title">
          <i data-lucide="clock" aria-hidden="true"></i>
          En attente de correction
          <span class="mes-devoirs-count mes-devoirs-count--pending">${pending.length}</span>
        </h2>
        <div class="mes-devoirs-list">
          ${pending.map(d => _card(d, false)).join('')}
        </div>
      </section>` : ''}

      ${graded.length > 0 ? `
      <section class="mes-devoirs-section">
        <h2 class="mes-devoirs-section__title">
          <i data-lucide="check-circle" aria-hidden="true"></i>
          Travaux corrigés
          <span class="mes-devoirs-count mes-devoirs-count--graded">${graded.length}</span>
        </h2>
        <div class="mes-devoirs-list">
          ${graded.map(d => _card(d, true)).join('')}
        </div>
      </section>` : ''}`}

    </div>`;
}

function _card(d, isGraded) {
    const seance  = d.lms_seances;
    const seq     = seance?.lms_sequences;
    const module  = seq?.lms_cours;
    const files   = Array.isArray(d.file_urls) ? d.file_urls : [];
    const dateStr = new Date(d.submitted_at).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'long', year: 'numeric'
    });
    const score = isGraded
        ? Math.round((d.note / (d.note_max || 20)) * 100)
        : null;
    const scoreColor = score >= 80 ? 'success' : score >= 50 ? 'warning' : 'error';

    return `
    <article class="md-card ${isGraded ? 'md-card--graded' : 'md-card--pending'}">

      <div class="md-card__header">
        <div class="md-card__meta">
          ${module?.titre ? `
          <span class="md-breadcrumb">
            <span>${_esc(module.titre)}</span>
            <i data-lucide="chevron-right" aria-hidden="true"></i>
            <span>${_esc(seq?.titre || '')}</span>
            <i data-lucide="chevron-right" aria-hidden="true"></i>
          </span>` : ''}
          <h3 class="md-card__seance">${_esc(seance?.titre || 'Séance inconnue')}</h3>
          <p class="md-card__date">Déposé le ${dateStr}</p>
        </div>

        <div class="md-card__status">
          ${isGraded ? `
          <div class="md-score md-score--${scoreColor}">
            <span class="md-score__value">${d.note}</span>
            <span class="md-score__max">/ ${d.note_max ?? 20}</span>
          </div>` : `
          <span class="badge badge-warning">
            <i data-lucide="clock" aria-hidden="true"></i> En attente
          </span>`}
        </div>
      </div>

      ${files.length ? `
      <div class="md-card__files">
        ${files.map(f => `
        <a href="${_esc(f.url)}" target="_blank" rel="noopener" class="md-file-chip">
          <i data-lucide="paperclip" aria-hidden="true"></i>
          <span>${_esc(f.name)}</span>
        </a>`).join('')}
      </div>` : ''}

      ${d.message ? `
      <div class="md-card__msg">
        <i data-lucide="message-square" aria-hidden="true"></i>
        <p>${_esc(d.message)}</p>
      </div>` : ''}

      ${isGraded && d.feedback ? `
      <div class="md-card__feedback">
        <div class="md-feedback-header">
          <i data-lucide="message-circle" aria-hidden="true"></i>
          <span>Commentaire du formateur</span>
        </div>
        <p class="md-feedback-text">${_esc(d.feedback)}</p>
        <p class="md-feedback-date">
          Corrigé le ${new Date(d.graded_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' })}
        </p>
      </div>` : ''}

      ${isGraded && !d.feedback ? `
      <p class="md-no-feedback">Aucun commentaire laissé par le formateur.</p>
      ` : ''}

    </article>`;
}

function _esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}
