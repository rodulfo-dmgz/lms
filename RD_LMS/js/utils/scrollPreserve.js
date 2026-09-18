// Préserve la position de scroll (et, pour les arbres, les nœuds dépliés)
// autour d'un refresh qui réécrit tout le DOM (container.innerHTML = ...).
// Sans ça, chaque save/delete ramène l'utilisateur en haut de la page.

export function preserveScroll(refreshFn) {
    return async (...args) => {
        const scrollY = window.scrollY;
        const result = await refreshFn(...args);
        requestAnimationFrame(() => {
            requestAnimationFrame(() => window.scrollTo(0, scrollY));
        });
        return result;
    };
}

export function captureTreeState(container) {
    const expandedIds = new Set();
    container.querySelectorAll('.tree-node--module:not(.tree-collapsed), .tree-node--sequence:not(.tree-collapsed)')
        .forEach(node => { if (node.dataset.id) expandedIds.add(node.dataset.id); });
    return expandedIds;
}

export function restoreTreeState(container, expandedIds) {
    if (!expandedIds || !expandedIds.size) return;
    container.querySelectorAll('.tree-node--module, .tree-node--sequence').forEach(node => {
        if (node.dataset.id && expandedIds.has(node.dataset.id)) {
            node.classList.remove('tree-collapsed');
        }
    });
}
