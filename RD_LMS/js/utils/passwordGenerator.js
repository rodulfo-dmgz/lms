function removeDiacritics(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z]/g, '');
}

export function generateTempPassword(prenom, nom) {
    const year  = new Date().getFullYear();
    const cap   = s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    const clean = s => removeDiacritics(s.trim());
    return `${cap(clean(prenom))}.${cap(clean(nom))}${year}`;
    // ex: Marie.Dupont2026
}
