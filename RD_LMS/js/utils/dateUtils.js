export function formatDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'long', year: 'numeric'
    });
}

export function formatDateShort(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });
}

export function isToday(iso) {
    if (!iso) return false;
    const d = new Date(iso);
    const n = new Date();
    return d.getDate() === n.getDate() &&
           d.getMonth() === n.getMonth() &&
           d.getFullYear() === n.getFullYear();
}
