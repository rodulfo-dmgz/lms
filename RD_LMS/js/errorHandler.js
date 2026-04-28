export function handleError(error, context = '') {
    console.error(`[DASHBOA_RD Error] ${context}`, error);
    const toast = document.getElementById('toast-error');
    if (toast) {
        toast.textContent = error.message?.includes('JWT')
            ? 'Session expirée. Veuillez vous reconnecter.'
            : (error.message || 'Une erreur est survenue. Réessaie dans un instant.');
        toast.classList.add('visible');
        setTimeout(() => toast.classList.remove('visible'), 4500);
    }
}

export async function safeCall(fn, context = '') {
    try { return await fn(); }
    catch (error) { handleError(error, context); return null; }
}
