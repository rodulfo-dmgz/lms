/**
 * kpi-auth.js — SSO bridge + formulaire de connexion inline
 *
 * Priorité : réutilise le JWT Supabase du LMS (même localStorage, même origin).
 * Si aucune session → affiche un formulaire de login directement dans la SPA,
 * sans redirection vers le LMS parent (évite les problèmes de redirect GitHub Pages).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON } from './kpi-config.js?v=2';

// ── Instance Supabase partagée ────────────────────────────────────
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Même clé localStorage que le LMS → SSO transparent
    storageKey: 'sb-iomzcbmyzjwtswrkvxqk-auth-token',
  },
});

/**
 * Vérifie ou initie la session.
 * - Si session valide → retourne { session, profile, kpiProfile }
 * - Si pas de session → affiche le formulaire de login inline et retourne null
 */
export async function requireAuth() {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) {
    _showLoginForm();
    return null;
  }

  // Profil LMS
  const { data: profile, error: pErr } = await supabase
    .from('lms_profiles')
    .select('id, prenom, nom, role')
    .eq('id', session.user.id)
    .single();

  if (pErr || !profile) {
    _showLoginForm('Compte trouvé mais profil LMS introuvable. Contactez votre administrateur.');
    return null;
  }

  // Profil KPI — créer si absent
  let { data: kpiProfile } = await supabase
    .from('kpi_student_profile')
    .select('*')
    .eq('profile_id', session.user.id)
    .single();

  if (!kpiProfile) {
    const { data: created } = await supabase
      .from('kpi_student_profile')
      .insert({ profile_id: session.user.id })
      .select()
      .single();
    kpiProfile = created || { profile_id: session.user.id };
  }

  return { session, profile, kpiProfile };
}

/**
 * Écoute les changements d'état auth
 */
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') _showLoginForm();
    callback(event, session);
  });
}

// ── Formulaire de connexion inline ────────────────────────────────

function _showLoginForm(message = null) {
  const app = document.getElementById('kpi-app');
  if (!app) return;

  app.innerHTML = `
    <div class="kpi-login-screen">
      <div class="kpi-login-card">
        <div class="kpi-login-logo">
          <i class="ph-fill ph-chart-bar"></i>
        </div>
        <h1 class="kpi-login-title">KPI Lab</h1>
        <p class="kpi-login-subtitle">Connectez-vous pour accéder à votre parcours</p>

        ${message ? `<div class="kpi-login-alert">${message}</div>` : ''}

        <form class="kpi-login-form" id="kpi-login-form" autocomplete="on">
          <div class="kpi-login-field">
            <label for="login-email">
              <i class="ph ph-envelope"></i> Email
            </label>
            <input
              type="email" id="login-email" name="email"
              class="kpi-input" placeholder="prenom.nom@exemple.fr"
              required autocomplete="email"
            >
          </div>
          <div class="kpi-login-field">
            <label for="login-password">
              <i class="ph ph-lock"></i> Mot de passe
            </label>
            <input
              type="password" id="login-password" name="password"
              class="kpi-input" placeholder="••••••••"
              required autocomplete="current-password"
            >
          </div>

          <div class="kpi-login-error" id="login-error" hidden></div>

          <button type="submit" class="kpi-btn kpi-btn--primary kpi-btn--lg" id="btn-login" style="width:100%">
            <i class="ph ph-sign-in"></i>
            Se connecter
          </button>
        </form>

        <p class="kpi-login-hint">
          <i class="ph ph-info"></i>
          Utilisez les mêmes identifiants que votre espace de formation.
        </p>
      </div>
    </div>
  `;

  const form  = document.getElementById('kpi-login-form');
  const errEl = document.getElementById('login-error');
  const btn   = document.getElementById('btn-login');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.hidden = true;
    btn.disabled = true;
    btn.innerHTML = '<i class="ph ph-circle-notch" style="animation:kpi-spin .8s linear infinite"></i> Connexion…';

    const email    = document.getElementById('login-email')?.value.trim();
    const password = document.getElementById('login-password')?.value;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data?.session) {
      errEl.textContent = error?.message === 'Invalid login credentials'
        ? 'Email ou mot de passe incorrect.'
        : (error?.message || 'Connexion impossible. Réessayez.');
      errEl.hidden = false;
      btn.disabled = false;
      btn.innerHTML = '<i class="ph ph-sign-in"></i> Se connecter';
    } else {
      // Succès → relancer le boot
      window.location.reload();
    }
  });
}
