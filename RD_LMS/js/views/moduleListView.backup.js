export function renderModuleList(container, modules, { onModuleClick }) {
    const cp   = modules.filter(m => !m.est_transversal);
    const trsv = modules.filter(m =>  m.est_transversal);

    container.innerHTML = `
    <div class="page-formation">
      <section class="formation-section">
        <h2 class="section-title">
          <i data-lucide="briefcase" aria-hidden="true"></i>
          Compétences Professionnelles
        </h2>
        <div class="tuiles-grid" id="grid-cp"></div>
      </section>
      <section class="formation-section">
        <h2 class="section-title">
          <i data-lucide="layers" aria-hidden="true"></i>
          Compétences Transversales
        </h2>
        <div class="tuiles-grid" id="grid-transversal"></div>
      </section>
    </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons();
    renderTuiles(document.getElementById('grid-cp'),          cp,   onModuleClick);
    renderTuiles(document.getElementById('grid-transversal'), trsv, onModuleClick);
}

function renderTuiles(container, items, onClick) {
    if (!items.length) {
        container.innerHTML = '<p class="empty-state">Aucun module disponible.</p>';
        return;
    }
    container.innerHTML = items.map(m => `
    <article class="tuile" data-id="${m.cours_id}"
             role="button" tabindex="0" aria-label="${escapeAttr(m.titre)}">
      <div class="tuile-image">
        ${m.image_url
            ? `<img src="${escapeAttr(m.image_url)}" alt="" loading="lazy">`
            : `<div class="tuile-placeholder"></div>`}
      </div>
      <div class="tuile-body">
        <h3 class="tuile-titre">${escapeText(m.titre)}</h3>
        <span class="tuile-duree">${m.duree_reelle}h</span>
      </div>
    </article>`).join('');

    container.querySelectorAll('.tuile').forEach(el => {
        const id = el.dataset.id;
        el.addEventListener('click',   () => onClick(id));
        el.addEventListener('keydown', e => { if (e.key === 'Enter') onClick(id); });
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
