---
name: lms-architecture
description: Architecture MVC du LMS DASHBOA_RD. Utiliser systématiquement quand l'utilisateur
  crée ou modifie des fichiers JS (modèles, vues, contrôleurs, store, router), ajoute une
  nouvelle page ou route, ou pose des questions sur l'organisation du code frontend.
---

# Architecture MVC — LMS DASHBOA_RD

## Stack
- Frontend : JS Vanilla ES6+, SPA, routage hash
- Backend : Supabase (PostgreSQL, Auth, RLS, RPC, Edge Functions)
- Hébergement : GitHub Pages

## Règles absolues
- JAMAIS la `service_role` key dans le frontend (uniquement la clé `anon`)
- JAMAIS `element.innerHTML = userInput` sans `sanitize()` ou DOMPurify
- JAMAIS de logique métier dans les Views
- TOUJOURS wrapper les appels Supabase avec `safeCall()` de `errorHandler.js`
- TOUJOURS appeler `lucide.createIcons()` après injection HTML avec `<i data-lucide>`

## Pattern contrôleur (toujours respecter cet ordre)
1. Afficher état loading dans le container
2. Appeler le/les modèle(s) avec `safeCall()`
3. Mettre à jour le store si nécessaire
4. Appeler la vue avec les données + callbacks
5. Appeler `lucide.createIcons()` après le rendu

## Séparation des responsabilités
- **Model** : appels Supabase uniquement, retourne données brutes, lève des erreurs
- **View** : génère du HTML, attache les événements, appelle les callbacks — zéro logique métier
- **Controller** : orchestre modèle + vue + store + navigation
- **Store** : source de vérité client — ne pas re-fetcher ce qui est déjà en store

## Routes hash disponibles
- `#/login` — page connexion
- `#/changer-mot-de-passe` — first_login obligatoire
- `#/dashboard` — tableau de bord
- `#/modules` — liste modules CP + transversaux
- `#/modules/:moduleId` — séquences d'un module
- `#/modules/:moduleId/sequences/:sequenceId` — séances (accordéon)
- `#/admin` — console admin

## Store — méthodes disponibles
```js
store.setUser(u) / store.getUser()
store.setProfile(p) / store.getProfile()
store.getRole()   // tient compte du mode viewAs
store.setCourses(c) / store.setProgressSummary(s)
store.setViewAs({ role, profileId })
store.reset()     // déconnexion
```

## Gestion first_login
- Après connexion, vérifier `profile.first_login`
- Si `true` → rediriger vers `#/changer-mot-de-passe` avant toute chose
- Après changement mdp → appeler `supabase.rpc('mark_first_login_done')` puis `store.setProfile({...profile, first_login: false})`