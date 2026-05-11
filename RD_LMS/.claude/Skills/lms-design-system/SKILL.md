---
name: lms-design-system
description: Design system RD pour le LMS DASHBOA_RD. Utiliser SYSTÉMATIQUEMENT quand
  l'utilisateur crée ou modifie du HTML, du CSS, des composants UI, des pages, des
  formulaires, des boutons, des badges, ou tout élément visuel. Ne jamais créer de
  variables CSS custom en dehors de ce système.
---

# Design System RD — DASHBOA_RD

## Palette (variables CSS — ne JAMAIS coder les couleurs en dur)
| Variable | Valeur | Usage |
|----------|--------|-------|
| `--action-primary` | `#1f4590` Bleu | Boutons principaux, nav, liens |
| `--action-cta` | `#ff570a` Orange | Boutons CTA, accents |
| `--action-secondary` | `#1ca098` Émeraude | Succès, badges "Terminé" |
| `--text-primary` | `#12355b` | Corps de texte |
| `--surface-app` | `#f8fafc` | Fond de page |
| `--surface-base` | `#ffffff` | Cartes, tuiles |

## Polices
- Titres H1-H6 : `var(--font-heading)` → Space Grotesk
- Corps : `var(--font-body)` → Plus Jakarta Sans
- Mono/stats : `var(--font-mono)` → JetBrains Mono

## Thème sombre
- Géré par classe `.dark` sur `<html>` via `ThemeManager` dans `js/theme.js`
- NE PAS gérer le thème manuellement — toujours passer par les variables CSS
- Toujours tester l'affichage en mode clair ET sombre

## Icônes
- Bibliothèque : Lucide (CDN `unpkg.com/lucide@latest`)
- Syntaxe : `<i data-lucide="nom-icone" aria-hidden="true"></i>`
- OBLIGATOIRE après chaque injection HTML : `lucide.createIcons()` ou `lucide.createIcons({ root: element })`

## Classes CSS disponibles
### Boutons
- `.btn.btn-cta` — Orange, actions principales (Marquer terminé, Accéder, Importer)
- `.btn` avec `--action-primary` — Bleu, navigation
- `.btn.btn-sm` — Version compacte
- `.btn-full` — Largeur 100%
- `.btn-back` — Lien retour (sans fond)

### Badges statut séances
- `.badge.badge-success` — Émeraude — "Terminé"
- `.badge.badge-warning` — Ambre — "En cours"
- `.badge.badge-neutral` — Gris — "À faire"

### Tuiles (modules / séquences)
- Classe conteneur : `.tuiles-grid` (CSS grid auto-fill 200px)
- Tuile : `.tuile` avec `.tuile-image` + `.tuile-body` + `.tuile-titre` + `.tuile-duree`
- Si pas d'image : `<div class="tuile-placeholder"></div>`

### Accordéon (séances)
- `.accordion` > `.accordion-item` > `.accordion-header` + `.accordion-content`
- État ouvert : classe `.open` sur `.accordion-item`
- Chevron : `<i data-lucide="chevron-down" class="accordion-chevron">`

### Tags type séance
- `.tag-type.tag-cours` `.tag-type.tag-tp` `.tag-type.tag-exercice`
- `.tag-type.tag-quiz` `.tag-type.tag-evaluation`

### Formulaires
- `.form-group` > `.form-label` + `.form-input`
- Label requis : `.form-label.form-label--required`
- Input avec icône : `.form-input.form-input--icon-left` + `.input-icon-wrapper`
- Erreur inline : `.form-error` (span avec `role="alert"`)
- Erreur globale : `.form-error-global`

## Page login — Layout split obligatoire
- Colonne gauche `.login-brand-card` : fond `--action-primary`, logo, nom DASHBOA_RD, tagline
- Colonne droite `.login-form-card` : formulaire, toggle thème en haut à droite
- Mobile : brand card en header compact
- Inclure toujours : toggle show/hide mot de passe + modale "mot de passe oublié"

## Accessibilité (obligatoire)
- Skip link `<a href="#main-content" class="skip-link">` en début de body
- `aria-label` sur tous les boutons sans texte visible
- `role="alert"` sur les zones d'erreur
- `aria-expanded` sur les headers d'accordéon
- `tabindex="0"` sur les tuiles (navigation clavier)
- `:focus-visible` géré par le design system — ne pas supprimer l'outline

## Toast erreur global
- `<div id="toast-error" role="alert" aria-live="assertive"></div>` dans index.html
- Afficher : ajouter classe `.visible`
- Masquer : retirer classe `.visible` après 4500ms