export function renderSequenceList(container, { cours, sequences, onSequenceClick, onBack }) {
    container.innerHTML = `
    <div class="page-sequences">
      <button class="btn-back" id="btn-back">
        <i data-lucide="arrow-left" aria-hidden="true"></i>
        Retour aux modules
      </button>

      ${cours ? `
      <div class="module-info-card">
        <h2 class="module-info-card__title">${escapeText(cours.titre)}</h2>
        ${cours.description ? `<p class="module-info-card__desc">${escapeText(cours.description)}</p>` : ''}
      </div>` : ''}

      <h2 class="section-title">
        <i data-lucide="list" aria-hidden="true"></i>
        Séquences
      </h2>

      <div class="tuiles-grid" id="grid-sequences"></div>
    </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons();
    document.getElementById('btn-back').addEventListener('click', onBack);

    const grid = document.getElementById('grid-sequences');
    if (!sequences.length) {
        grid.innerHTML = '<p class="empty-state">Aucune séquence disponible.</p>';
        return;
    }

    grid.innerHTML = sequences.map((s, i) => `
    <article class="tuile" data-id="${s.id}"
             role="button" tabindex="0" aria-label="${escapeAttr(s.titre)}">
      <div class="tuile-image">
        ${s.image_url
            ? `<img src="${escapeAttr(s.image_url)}" alt="" loading="lazy">`
            : `<div class="tuile-placeholder"></div>`}
      </div>
      <div class="tuile-body">
        <h3 class="tuile-titre">${escapeText(s.titre)}</h3>
        ${s.objectif ? `<p class="tuile-duree">${escapeText(s.objectif)}</p>` : ''}
      </div>
    </article>`).join('');

    grid.querySelectorAll('.tuile').forEach(el => {
        const id = el.dataset.id;
        el.addEventListener('click',   () => onSequenceClick(id));
        el.addEventListener('keydown', e => { if (e.key === 'Enter') onSequenceClick(id); });
    });
}

function escapeText(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}

function escapeAttr(str) {
    return (str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
