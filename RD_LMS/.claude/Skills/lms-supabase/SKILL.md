---
name: lms-supabase
description: Règles Supabase pour le LMS DASHBOA_RD. Utiliser quand l'utilisateur écrit
  des requêtes Supabase, crée des fonctions RPC, modifie le schéma SQL, ajoute des
  politiques RLS, ou travaille sur les Edge Functions. Indispensable pour toute interaction
  avec la base de données.
---

# Supabase — LMS DASHBOA_RD

## Préfixe : toutes les tables commencent par `lms_`

## Tables principales
| Table | Rôle |
|-------|------|
| `lms_profiles` | Profils utilisateurs (role, first_login, prenom, nom) |
| `lms_cours` | Modules pédagogiques (est_transversal, image_url) |
| `lms_sequences` | Séquences d'un cours |
| `lms_seances` | Séances d'une séquence |
| `lms_cohortes` | Groupes de stagiaires |
| `lms_cohorte_membres` | Liaison stagiaire ↔ cohorte |
| `lms_parcours_finance_config` | Config parcours par financement |
| `lms_config_cours` | Cours assignés à une config |
| `lms_session_progress` | Progression séance par séance (PK: profile_id + seance_id) |
| `lms_import_logs` | Traçabilité des imports CSV |

## RPC disponibles (TOUJOURS préférer aux requêtes directes complexes)
```sql
get_student_courses(p_profile_id)        -- cours du stagiaire via son parcours
get_student_progress_summary(p_profile_id) -- % avancement par cours
toggle_seance_progress(p_profile_id, p_seance_id) -- retourne 'termine' ou 'non_commence'
mark_first_login_done()                  -- met first_login = false pour auth.uid()
admin_prepare_import_log(...)            -- trace les imports CSV
```

## Règles RLS (déjà en place — ne pas contourner)
- Un stagiaire ne voit et modifie QUE ses propres lignes dans `lms_session_progress`
- La fonction `get_my_role()` est SECURITY DEFINER — l'utiliser pour les checks de rôle
- L'admin passe par l'Edge Function `create-user` pour créer des comptes (service_role côté serveur uniquement)

## Patterns de requête
```js
// Requête simple
const { data, error } = await supabase.from('lms_sequences')
  .select('id, titre, image_url, ordre')
  .eq('cours_id', coursId)
  .order('ordre');
if (error) throw error;

// RPC
const { data, error } = await supabase.rpc('toggle_seance_progress', {
  p_profile_id: profileId, p_seance_id: seanceId
});
if (error) throw error;

// Jointure avec progression (séances)
const { data, error } = await supabase
  .from('lms_seances')
  .select('*, lms_session_progress!left(statut, score, date_completion)')
  .eq('sequence_id', sequenceId)
  .eq('lms_session_progress.profile_id', profileId)
  .order('ordre');
```

## Edge Function `create-user`
- URL : `${SUPABASE_URL}/functions/v1/create-user`
- Auth : Bearer token de la session admin courante
- CORS : header `Access-Control-Allow-Origin` limité à l'URL GitHub Pages
- Vérifie que l'appelant est `admin` avant de créer le compte

## Génération mot de passe temporaire
Format : `Prenom.NomAnnee` — ex: `Marie.Dupont2026`
Fonction disponible dans `js/utils/passwordGenerator.js`