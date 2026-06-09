/**
 * kpi-auth.js — SSO bridge avec le LMS principal
 *
 * Le LMS stocke la session Supabase dans localStorage sous la clé standard.
 * On réutilise ce token sans demander de reconnexion.
 * Si absent, on redirige vers la page de login du LMS.
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON } from './kpi-config.js';

// Instance partagée Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'sb-iomzcbmyzjwtswrkvxqk-auth-token', // même clé que le LMS principal
  },
});

/**
 * Vérifie la session et retourne le profil LMS.
 * Redirige vers le LMS si non connecté.
 * @returns {{ session, profile }}
 */
export async function requireAuth() {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) {
    // Pas de session → rediriger vers le LMS parent
    const returnUrl = encodeURIComponent(window.location.href);
    window.location.href = `../index.html#/login?return=${returnUrl}`;
    return null;
  }

  // Récupérer le profil LMS
  const { data: profile, error: pErr } = await supabase
    .from('lms_profiles')
    .select('id, prenom, nom, role')
    .eq('id', session.user.id)
    .single();

  if (pErr || !profile) {
    // Compte auth mais pas de profil LMS → redirection
    window.location.href = '../index.html#/login';
    return null;
  }

  // Récupérer ou créer le profil KPI
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
    kpiProfile = created;
  }

  return { session, profile, kpiProfile };
}

/**
 * Écoute les changements d'état auth (refresh token, déconnexion, etc.)
 */
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      window.location.href = '../index.html#/login';
    }
    callback(event, session);
  });
}
