import { signIn, signOut, changePassword } from '../models/AuthModel.js';
import { store }                            from '../store.js';
import { handleError }                      from '../errorHandler.js';

// ── Init page login (HTML statique dans index.html) ─────────────
export function initLoginPage() {
    // Ré-attacher thème
    if (window.themeManager) {
        window.themeManager.updateToggleButton();
    }

    // Toggle affichage mot de passe
    document.getElementById('passwordToggle')?.addEventListener('click', () => {
        const input = document.getElementById('password');
        const icon  = document.getElementById('eyeIcon');
        const show  = input.type === 'password';
        input.type  = show ? 'text' : 'password';
        icon?.setAttribute('data-lucide', show ? 'eye-off' : 'eye');
        document.getElementById('passwordToggle')?.setAttribute('aria-pressed', String(show));
        if (typeof lucide !== 'undefined') lucide.createIcons();
    });

    // Modale mot de passe oublié
    document.getElementById('forgotPasswordLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        const modal = document.getElementById('forgotPasswordModal');
        if (modal) {
            modal.style.display = 'flex';
            document.getElementById('forgotModalCloseBtn')?.focus();
        }
    });
    const closeModal = () => {
        const modal = document.getElementById('forgotPasswordModal');
        if (modal) modal.style.display = 'none';
    };
    document.getElementById('forgotModalCloseBtn')?.addEventListener('click', closeModal);
    document.getElementById('forgotModalBackdrop')?.addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    }, { once: false });

    // Soumission formulaire
    document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email    = document.getElementById('email')?.value.trim() || '';
        const password = document.getElementById('password')?.value || '';
        const btn      = document.getElementById('submitBtn');
        const errDiv   = document.getElementById('login-error');

        if (!email || !password) return;

        if (btn) {
            btn.disabled  = true;
            btn.innerHTML = '<i data-lucide="loader-2" class="spin" aria-hidden="true"></i> Connexion…';
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });
        }
        if (errDiv) errDiv.style.display = 'none';

        try {
            await signIn(email, password);
            // app.js gère tout via onAuthStateChange (loadFullProfile + titre_pro)
        } catch (err) {
            const msg = translateError(err.message);
            if (errDiv) { errDiv.textContent = msg; errDiv.style.display = 'block'; }
        } finally {
            if (btn) {
                btn.disabled  = false;
                btn.innerHTML = '<i data-lucide="log-in" aria-hidden="true"></i> Accéder au dashboard';
                if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });
            }
        }
    });
}

// ── Page changement de mot de passe (first_login) ───────────────
export async function loadChangePassword(container) {
    const profile = store.getProfile();
    container.innerHTML = `
    <div class="auth-wrapper">
      <div class="auth-card animate-fade-in-scale">
        <img src="assets/images/logo.svg" alt="DASHBOA_RD" class="auth-logo">
        <h1>Bienvenue ${escapeText(profile?.prenom || '')} !</h1>
        <p class="auth-subtitle">Pour sécuriser ton compte, choisis un nouveau mot de passe.<br>
          <strong>8 caractères minimum.</strong></p>
        <div class="form-group">
          <label for="new-password" class="form-label form-label--required">Nouveau mot de passe</label>
          <input type="password" id="new-password" class="form-input" autocomplete="new-password" minlength="8">
        </div>
        <div class="form-group">
          <label for="confirm-password" class="form-label form-label--required">Confirmer</label>
          <input type="password" id="confirm-password" class="form-input" autocomplete="new-password" minlength="8">
        </div>
        <div id="change-error" class="form-error-global" style="display:none;" role="alert"></div>
        <button id="btn-change" class="btn btn-cta btn-full">
          <i data-lucide="shield-check" aria-hidden="true"></i>
          Enregistrer le mot de passe
        </button>
      </div>
    </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();

    document.getElementById('btn-change')?.addEventListener('click', async () => {
        const newPassword = document.getElementById('new-password')?.value || '';
        const confirm     = document.getElementById('confirm-password')?.value || '';
        const errDiv      = document.getElementById('change-error');
        const btn         = document.getElementById('btn-change');

        const showErr = (msg) => { if (errDiv) { errDiv.textContent = msg; errDiv.style.display = 'block'; } };

        if (newPassword.length < 8)  return showErr('Le mot de passe doit contenir au moins 8 caractères.');
        if (newPassword !== confirm)  return showErr('Les deux mots de passe ne correspondent pas.');

        if (btn) {
            btn.disabled  = true;
            btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Enregistrement…';
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });
        }

        try {
            await changePassword(newPassword);
            store.setProfile({ ...store.getProfile(), first_login: false });
            window.location.hash = '#/dashboard';
        } catch (err) {
            handleError(err, 'Changement mot de passe');
            if (btn) {
                btn.disabled  = false;
                btn.innerHTML = '<i data-lucide="shield-check"></i> Enregistrer le mot de passe';
                if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });
            }
        }
    });
}

// ── Déconnexion ─────────────────────────────────────────────────
export async function logout() {
    try { await signOut(); } catch {}
    store.reset();
    // app.js gère le retour à la page login via onAuthStateChange
}

// ── Helpers ─────────────────────────────────────────────────────
function translateError(msg = '') {
    const map = {
        'Invalid login credentials':  'Email ou mot de passe incorrect.',
        'Email not confirmed':         'Email non confirmé. Contactez votre formateur.',
        'Too many requests':           'Trop de tentatives. Patientez quelques minutes.',
        'User not found':              'Aucun compte trouvé avec cet email.',
        'JWT expired':                 'Session expirée. Reconnectez-vous.',
    };
    return map[msg] || 'Connexion échouée. Vérifiez vos identifiants.';
}

function escapeText(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}
