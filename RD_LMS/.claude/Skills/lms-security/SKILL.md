---
name: lms-security
description: Règles de sécurité pour le LMS DASHBOA_RD. Utiliser quand l'utilisateur
  modifie l'authentification, les headers HTTP, les politiques RLS, les Edge Functions,
  les imports CSV, ou tout code traitant des données utilisateurs. Aussi déclencher
  si l'utilisateur écrit du code qui affiche du contenu issu de la base de données.
---

# Sécurité — LMS DASHBOA_RD

## Règles non négociables
1. `service_role` key → UNIQUEMENT dans les Edge Functions Supabase (Deno, côté serveur)
2. `anon` key → dans `js/config.js` côté client (c'est son rôle, la sécurité = RLS)
3. `element.innerHTML = valeur` → INTERDIT sauf avec `sanitize()` ou `DOMPurify.sanitize()`
4. `localStorage` → JAMAIS pour des données de progression ou sensibles (message du jour OK)

## Sanitisation HTML
```js
// Fonction légère (contenu simple)
function sanitize(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
// Contenu riche (formateurs) → DOMPurify obligatoire
element.innerHTML = DOMPurify.sanitize(richContent);
```

## Fichier `_headers` (racine du projet — NE PAS SUPPRIMER)
Contient : X-Frame-Options, HSTS, X-Content-Type-Options, CSP, Referrer-Policy, Permissions-Policy
Vérifier après chaque déploiement via https://securityheaders.com

## CSP — domaines autorisés dans connect-src
- `https://*.supabase.co` et `wss://*.supabase.co` UNIQUEMENT
- Tout autre domaine externe → refusé par défaut

## CORS Supabase
- Allowed Origins : URL GitHub Pages uniquement (jamais `*` en production)
- Edge Functions : `Access-Control-Allow-Origin` limité à l'URL de production
- Toujours gérer le preflight OPTIONS dans les Edge Functions

## Checklist avant chaque commit
- [ ] Aucune clé `service_role` dans les fichiers JS frontend
- [ ] Aucun `innerHTML` sans sanitisation sur du contenu utilisateur
- [ ] RLS testée avec un compte stagiaire (pas d'accès aux données d'un autre)
- [ ] `_headers` présent à la racine
- [ ] Edge Function vérifie le JWT + le rôle `admin` avant toute action