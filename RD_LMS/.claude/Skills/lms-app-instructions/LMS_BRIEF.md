# LMS DASHBOA_RD — Document maître pour Claude Code · v2.0
## Brief complet · Supabase + GitHub Pages + JS Vanilla + Identité RD

> **À Claude Code** : Ce document est le brief technique exhaustif et à jour du LMS.
> Il intègre le schéma SQL complet, l'architecture MVC, la logique de navigation,
> la gestion des utilisateurs, la sécurité (RLS, CORS, Security Headers) et le
> design system RD complet (tokens CSS, thème sombre/clair, polices, composants).
> **Implémente chaque section dans l'ordre indiqué. Ne saute aucune étape.**

---

## Table des matières

1. [Vue d'ensemble du projet](#1-vue-densemble)
2. [Structure des fichiers](#2-structure-des-fichiers)
3. [Design system RD — Identité visuelle](#3-design-system-rd)
4. [Base de données SQL complète](#4-base-de-données-sql)
5. [Politiques RLS](#5-politiques-rls)
6. [Fonctions RPC Supabase](#6-fonctions-rpc)
7. [Sécurité — CORS, CSP et Security Headers](#7-sécurité)
8. [Architecture MVC Frontend](#8-architecture-mvc)
9. [Store central](#9-store-central)
10. [Routage hash](#10-routage-hash)
11. [Authentification et mots de passe](#11-authentification)
12. [Console admin — import CSV](#12-console-admin)
13. [Navigation modules / séquences / séances](#13-navigation)
14. [Dashboard personnalisé](#14-dashboard)
15. [Déploiement GitHub Pages + CI/CD](#15-déploiement)
16. [Ordre d'implémentation](#16-ordre-dimplémentation)

---

## 1. Vue d'ensemble

### Stack technique
| Couche | Technologie |
|--------|-------------|
| Backend | Supabase (PostgreSQL 15, Auth, Storage, RLS, RPC, Edge Functions) |
| Frontend | HTML5 / CSS3 / JavaScript ES6+ Vanilla — SPA sans framework |
| Hébergement | GitHub Pages (statique, déploiement automatique via Actions) |
| Architecture | MVC client-side + Store central (Observer pattern minimal) |
| Routage | Hash-based (`#/dashboard`, `#/modules`, etc.) |
| Icons | Lucide (CDN `unpkg.com/lucide@latest`) |
| CSV parsing | PapaParse 5.4 (CDN Cloudflare) |
| Thème | Clair / Sombre avec persistence `localStorage` |

### Marque
- **Nom produit** : DASHBOA_RD
- **Tagline** : KPI & Tableaux de Bord
- **Slogan** : Maîtrisez vos indicateurs de performance
- **Email placeholder** : `prenom.nom@rd-gestion.fr`

### Rôles utilisateurs
| Rôle | Permissions |
|------|-------------|
| `admin` | CRUD complet, import CSV, gestion cohortes/financements, reset mdp |
| `formateur_editeur` | Crée/modifie le contenu pédagogique, vue "voir en tant que" |
| `formateur` | Lecture progression de ses cohortes, pas de modification contenu |
| `stagiaire` | Voit uniquement son parcours et sa progression |
| `invite` | Accès catalogue public uniquement |

### Conventions de code
- Tables préfixées `lms_`, UUIDs partout, timestamps `TIMESTAMPTZ`
- JS : snake_case en base, camelCase en JS
- CSS : variables CSS natives du design system RD — **ne pas redéfinir les variables**
- Aucune dépendance npm — tout via CDN ou natif

---

## 2. Structure des fichiers

```
mon-lms/
├── index.html                          # Point d'entrée SPA
├── .github/
│   └── workflows/
│       └── deploy.yml                  # CI/CD GitHub Actions
│
├── css/
│   ├── main.css                        # Import central (ordre cascade strict)
│   ├── base/
│   │   ├── variables.css               # Tokens RD (palette, typo, spacing, z-index)
│   │   ├── reset.css                   # Normalisation cross-browser
│   │   └── typography.css              # Application des tokens typo
│   ├── layout/
│   │   ├── layout.css                  # Structure page (sidebar + content)
│   │   ├── sidebar.css                 # Navigation latérale
│   │   └── topbar.css                  # Barre supérieure
│   ├── components/
│   │   ├── buttons.css                 # Boutons (.btn, .btn-cta, .btn-sm)
│   │   ├── forms.css                   # Inputs, labels, erreurs
│   │   ├── cards.css                   # Tuiles modules/séquences
│   │   ├── badges.css                  # Statuts séances
│   │   ├── modals.css                  # Fenêtres modales
│   │   ├── toasts.css                  # Notifications toast
│   │   ├── progress.css                # Barres de progression
│   │   ├── tables.css                  # Tableaux admin
│   │   └── accordion.css               # Accordéon séances
│   ├── animations/
│   │   └── animations.css              # fadeInScale, transitions
│   └── modules/
│       ├── login.css                   # Page connexion (split layout)
│       ├── dashboard.css               # Dashboard + messages
│       ├── formation.css               # Modules/séquences (grille tuiles)
│       ├── progression.css             # Séances (accordéon)
│       ├── profile.css                 # Profil utilisateur
│       └── admin.css                   # Console admin, import CSV
│
├── js/
│   ├── app.js                          # Init globale, session Supabase
│   ├── config.js                       # Clé anon Supabase UNIQUEMENT
│   ├── theme.js                        # ThemeManager (dark/light)
│   ├── store.js                        # État global centralisé
│   ├── router.js                       # Routage hash
│   ├── errorHandler.js                 # Gestion centralisée erreurs
│   ├── lib/
│   │   └── supabaseClient.js
│   ├── models/
│   │   ├── AuthModel.js
│   │   ├── ProfileModel.js
│   │   ├── DashboardModel.js
│   │   ├── ModuleModel.js
│   │   ├── SequenceModel.js
│   │   ├── SeanceModel.js
│   │   ├── ProgressModel.js
│   │   └── AdminModel.js
│   ├── views/
│   │   ├── baseView.js
│   │   ├── authView.js
│   │   ├── dashboardView.js
│   │   ├── moduleListView.js
│   │   ├── sequenceListView.js
│   │   ├── seanceListView.js
│   │   └── adminView.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── dashboardController.js
│   │   ├── moduleController.js
│   │   ├── sequenceController.js
│   │   ├── seanceController.js
│   │   └── adminController.js
│   └── utils/
│       ├── csvParser.js
│       ├── passwordGenerator.js
│       └── dateUtils.js
│
├── assets/
│   ├── images/
│   │   └── logo.svg                    # Logo DASHBOA_RD
│   ├── icons/
│   │   └── icon.svg                    # Favicon
│   └── messages.json                   # Messages motivants
│
├── supabase/
│   └── functions/
│       └── create-user/
│           └── index.ts                # Edge Function création compte
│
└── sql/
    ├── 001_init_schema.sql
    ├── 002_rls_policies.sql
    ├── 003_rpc_functions.sql
    └── 004_seed_data.sql
```

---

## 3. Design system RD — Identité visuelle

> **IMPORTANT pour Claude Code** : Toutes les classes CSS, variables et composants
> du LMS doivent utiliser ce design system. Ne pas créer de variables CSS parallèles.

### 3.1. Palette de couleurs

| Rôle | Valeur | Usage |
|------|--------|-------|
| Primary | `#1f4590` (Bleu Profond) | Navigation, liens, actions principales |
| Secondary | `#1ca098` (Émeraude) | Validations, succès, badges "terminé" |
| Accent / CTA | `#ff570a` (Orange Vif) | Boutons CTA, alertes, highlights |
| Texte principal | `#12355b` | Corps de texte en mode clair |
| Surface app | `#f8fafc` | Fond de page |
| Surface base | `#ffffff` | Cartes, tuiles, formulaires |

### 3.2. Polices Google Fonts

```css
/* Chargement dans variables.css — déjà présent dans le design system */
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

--font-heading:  'Space Grotesk', system-ui, sans-serif;    /* Titres H1-H6 */
--font-body:     'Plus Jakarta Sans', system-ui, sans-serif; /* Corps de texte */
--font-mono:     'JetBrains Mono', monospace;                 /* Code, stats */
--font-subtitle: 'JetBrains Mono', monospace;                 /* Sous-titres techniques */
```

### 3.3. Fichier `css/base/variables.css` (COMPLET)

```css
/**
 * RD WORKFLOW — Design Tokens & Variables CSS
 * ═══════════════════════════════════════════
 * PALETTE :
 *   Primary   : Bleu Profond  #1f4590
 *   Secondary : Émeraude      #1ca098
 *   Accent    : Orange Vif    #ff570a
 */

@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

@layer tokens {
  :root {

    /* ── Typographie — Familles ── */
    --font-heading:  'Space Grotesk', -apple-system, system-ui, sans-serif;
    --font-subtitle: 'JetBrains Mono', 'Courier New', monospace;
    --font-body:     'Plus Jakarta Sans', -apple-system, system-ui, sans-serif;
    --font-mono:     'JetBrains Mono', 'Fira Code', 'Courier New', monospace;

    /* ── Typographie — Tailles & Poids ── */
    --font-h1-size: 2.5rem;  --font-h1-weight: 700; --font-h1-line: 1.2;  --font-h1-spacing: -0.02em;
    --font-h2-size: 2rem;    --font-h2-weight: 700; --font-h2-line: 1.25; --font-h2-spacing: -0.015em;
    --font-h3-size: 1.5rem;  --font-h3-weight: 600; --font-h3-line: 1.3;  --font-h3-spacing: -0.01em;
    --font-h4-size: 1.25rem; --font-h4-weight: 600; --font-h4-line: 1.4;  --font-h4-spacing: 0;
    --font-h5-size: 1.125rem;--font-h5-weight: 600; --font-h5-line: 1.4;
    --font-h6-size: 1rem;    --font-h6-weight: 600; --font-h6-line: 1.4;
    --font-body1-size: 1rem;     --font-body1-weight: 400; --font-body1-line: 1.6;
    --font-body2-size: 0.875rem; --font-body2-weight: 400; --font-body2-line: 1.5;
    --font-caption-size: 0.75rem;
    --font-label-size: 0.875rem; --font-label-weight: 500;
    --font-data-xl-size: 2.5rem; --font-data-lg-size: 2.25rem;
    --font-data-md-size: 1.5rem; --font-data-weight: 600;
    --font-weight-regular: 400;  --font-weight-medium: 500;
    --font-weight-semibold: 600; --font-weight-bold: 700;

    /* ── Couleurs — Palette Brute ── */
    /* Primary — Bleu Profond */
    --color-primary-950: #060f21; --color-primary-900: #0d1f42;
    --color-primary-800: #152d5c; --color-primary-700: #1a3670;
    --color-primary-600: #1f4590; /* BASE */
    --color-primary-500: #3d6bb8; --color-primary-400: #5c8fdf;
    --color-primary-300: #8db3f0; --color-primary-200: #bdd5f9;
    --color-primary-100: #e6effd; --color-primary-50:  #f5f8fe;

    /* Secondary — Émeraude */
    --color-secondary-950: #041f1d; --color-secondary-900: #0a4640;
    --color-secondary-800: #105e56; --color-secondary-700: #16766c;
    --color-secondary-600: #1ca098; /* BASE */
    --color-secondary-500: #2bc4b8; --color-secondary-400: #5fd9d0;
    --color-secondary-300: #8ee6df; --color-secondary-200: #bef0eb;
    --color-secondary-100: #e6f9f7; --color-secondary-50:  #f5fcfc;

    /* Accent — Orange Vif */
    --color-accent-950: #3d1000; --color-accent-900: #7a2400;
    --color-accent-800: #a33100; --color-accent-700: #cc3e00;
    --color-accent-600: #ff570a; /* BASE */
    --color-accent-500: #ff6b24; --color-accent-400: #ff8349;
    --color-accent-300: #ffaa82; --color-accent-200: #ffd0b8;
    --color-accent-100: #ffece2; --color-accent-50:  #fff6f1;

    /* Neutral */
    --color-neutral-950: #020617; --color-neutral-900: #0f172a;
    --color-neutral-800: #1e293b; --color-neutral-700: #334155;
    --color-neutral-600: #475569; --color-neutral-500: #64748b;
    --color-neutral-400: #94a3b8; --color-neutral-300: #cbd5e1;
    --color-neutral-200: #e2e8f0; --color-neutral-100: #f1f5f9;
    --color-neutral-50:  #f8fafc;

    /* Success / Warning / Danger / Info */
    --color-success-700: #15803d; --color-success-600: #16a34a;
    --color-success-100: #dcfce7; --color-success-50:  #f0fdf4;
    --color-warning-700: #b45309; --color-warning-600: #d97706;
    --color-warning-200: #fef3c7; --color-warning-50:  #fffbeb;
    --color-danger-700:  #b91c1c; --color-danger-600:  #dc2626;
    --color-danger-500:  #ef4444; --color-danger-200:  #fecaca;
    --color-danger-100:  #fee2e2; --color-danger-50:   #fef2f2;
    --color-info-700:    #1d4ed8; --color-info-600:    #2563eb;
    --color-info-100:    #dbeafe; --color-info-50:     #eff6ff;

    /* ── Tokens sémantiques ── */
    --action-primary:        var(--color-primary-600);
    --action-primary-hover:  var(--color-primary-700);
    --action-primary-active: var(--color-primary-800);
    --action-primary-subtle: var(--color-primary-50);
    --action-secondary:        var(--color-secondary-600);
    --action-secondary-hover:  var(--color-secondary-700);
    --action-secondary-subtle: var(--color-secondary-50);
    --action-cta:             var(--color-accent-600);
    --action-cta-hover:       var(--color-accent-700);
    --action-cta-active:      var(--color-accent-800);
    --action-cta-soft:        var(--color-accent-100);
    --action-cta-ultra-soft:  rgba(255, 87, 10, 0.06);
    --action-cta-border-soft: rgba(255, 87, 10, 0.15);
    --semantic-success:        var(--color-success-600);
    --semantic-success-bg:     var(--color-success-50);
    --semantic-success-border: #bbf7d0;
    --semantic-warning:        var(--color-warning-600);
    --semantic-warning-bg:     var(--color-warning-50);
    --semantic-danger:         var(--color-danger-600);
    --semantic-danger-bg:      var(--color-danger-50);
    --semantic-danger-border:  var(--color-danger-200);
    --semantic-info:           var(--color-info-600);
    --semantic-info-bg:        var(--color-info-50);
    --text-on-primary:  #ffffff;
    --text-on-accent:   #ffffff;

    /* ── Surfaces & Fonds — Mode Clair ── */
    --surface-app:      #f8fafc;
    --surface-base:     #ffffff;
    --surface-raised:   #f9fafb;
    --surface-overlay:  #ffffff;
    --surface-subtle:   #f3f4f6;
    --surface-disabled: #e5e7eb;
    --surface-inverse:  var(--color-primary-900);
    --surface:          var(--surface-base);

    /* ── Texte — Mode Clair ── */
    --text-primary:   #12355b;
    --text-secondary: rgba(18, 53, 91, 0.72);
    --text-tertiary:  #6b7280;
    --text-muted:     rgba(18, 53, 91, 0.45);
    --text-disabled:  rgba(18, 53, 91, 0.38);
    --text-inverse:   #ffffff;
    --text-link:       var(--color-primary-600);
    --text-link-hover: var(--color-primary-700);
    --text-danger:     var(--color-danger-700);
    --text-success:    var(--color-success-700);

    /* ── Bordures — Mode Clair ── */
    --border-light:       rgba(18, 53, 91, 0.08);
    --border-default:     #d1d5db;
    --border-strong:      #9ca3af;
    --border-focus:       var(--color-primary-600);
    --border-focus-cta:   var(--color-accent-600);
    --border-danger:      var(--color-danger-500);
    --border-success:     var(--color-secondary-500);
    --border-width-1: 1px; --border-width-2: 2px; --border-width-4: 4px;

    /* ── Ombres — Mode Clair ── */
    --shadow-xs: 0 1px 2px rgba(18, 53, 91, 0.04);
    --shadow-sm: 0 1px 3px rgba(18, 53, 91, 0.06), 0 1px 2px rgba(18, 53, 91, 0.04);
    --shadow-md: 0 4px 12px rgba(18, 53, 91, 0.08), 0 2px 4px rgba(18, 53, 91, 0.04);
    --shadow-lg: 0 8px 24px rgba(18, 53, 91, 0.10), 0 4px 8px rgba(18, 53, 91, 0.06);
    --shadow-xl: 0 16px 48px rgba(18, 53, 91, 0.12);
    --shadow-2xl: 0 32px 96px rgba(18, 53, 91, 0.16);
    --shadow-inner: inset 0 2px 4px rgba(18, 53, 91, 0.06);
    --shadow-focus:       0 0 0 3px rgba(31, 69, 144, 0.18);
    --shadow-focus-cta:   0 0 0 3px rgba(255, 87, 10, 0.22);
    --shadow-focus-danger:0 0 0 3px rgba(220, 38, 38, 0.18);
    --shadow-accent:      0 2px 8px rgba(255, 87, 10, 0.22), 0 4px 18px rgba(255, 87, 10, 0.18);
    --shadow-accent-hover:0 4px 16px rgba(255, 87, 10, 0.32), 0 8px 28px rgba(255, 87, 10, 0.22);

    /* ── Espacements ── */
    --space-0: 0; --space-px: 1px;
    --space-1: 0.25rem; --space-2: 0.5rem;  --space-3: 0.75rem;
    --space-4: 1rem;    --space-5: 1.25rem; --space-6: 1.5rem;
    --space-7: 1.75rem; --space-8: 2rem;    --space-9: 2.25rem;
    --space-10: 2.5rem; --space-12: 3rem;   --space-16: 4rem;
    --space-20: 5rem;   --space-24: 6rem;   --space-32: 8rem;

    /* ── Border Radius ── */
    --radius-none: 0; --radius-xs: 0.125rem; --radius-sm: 0.25rem;
    --radius-md: 0.5rem; --radius-lg: 0.75rem; --radius-xl: 1rem;
    --radius-2xl: 1.5rem; --radius-3xl: 2rem; --radius-full: 9999px;

    /* ── Transitions ── */
    --transition-fast:   150ms cubic-bezier(0.4, 0, 0.2, 1);
    --transition-base:   250ms cubic-bezier(0.4, 0, 0.2, 1);
    --transition-slow:   400ms cubic-bezier(0.4, 0, 0.2, 1);
    --transition-spring: 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
    --ease-in:     cubic-bezier(0.4, 0, 1, 1);
    --ease-out:    cubic-bezier(0, 0, 0.2, 1);
    --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);

    /* ── Z-Index ── */
    --z-below: -1; --z-base: 0; --z-raised: 10;
    --z-dropdown: 1000; --z-sticky: 1020; --z-fixed: 1030;
    --z-modal-backdrop: 1040; --z-modal: 1050;
    --z-popover: 1060; --z-tooltip: 1070;
    --z-notification: 1080; --z-top: 9999;

    /* ── Layout ── */
    --sidebar-width:           260px;
    --sidebar-width-collapsed: 72px;
    --topbar-height:           72px;
    --content-max-width:       1400px;

    /* ── Breakpoints (référence JS) ── */
    --breakpoint-sm: 640px; --breakpoint-md: 768px;
    --breakpoint-lg: 1024px; --breakpoint-xl: 1280px;

    /* ── États interactifs ── */
    --state-hover-overlay:    rgba(31, 69, 144, 0.04);
    --state-active-overlay:   rgba(31, 69, 144, 0.08);
    --state-disabled-opacity: 0.5;
  }

  /* ── Thème Sombre ── */
  html.dark {
    --surface-app:    #0f172a;
    --surface-base:   var(--color-primary-950);
    --surface-raised: #2d3a4f;
    --surface-overlay:#334155;
    --surface-subtle: #334155;
    --text-primary:   #e2e8f0;
    --text-secondary: rgba(226, 232, 240, 0.75);
    --text-tertiary:  rgba(226, 232, 240, 0.55);
    --text-muted:     rgba(226, 232, 240, 0.40);
    --text-inverse:   #ffffff;
    --text-link:      var(--color-accent-400);
    --text-link-hover:var(--color-accent-300);
    --border-light:   rgba(255, 255, 255, 0.06);
    --border-default: rgba(255, 255, 255, 0.12);
    --border-strong:  rgba(255, 255, 255, 0.20);
    --shadow-xs:  0 1px 2px rgba(0,0,0,.30);
    --shadow-sm:  0 1px 3px rgba(0,0,0,.40);
    --shadow-md:  0 4px 12px rgba(0,0,0,.50);
    --shadow-lg:  0 8px 24px rgba(0,0,0,.60);
    --shadow-xl:  0 16px 48px rgba(0,0,0,.70);
    --shadow-2xl: 0 32px 96px rgba(0,0,0,.80);
    --action-primary-subtle:     #1e3a5f;
    --action-cta-ultra-soft:     rgba(255, 87, 10, 0.15);
    --semantic-success-bg:  rgba(34, 197, 94, 0.1);
    --semantic-warning-bg:  rgba(245, 158, 11, 0.1);
    --semantic-danger-bg:   rgba(239, 68, 68, 0.1);
    --semantic-info-bg:     rgba(59, 130, 246, 0.1);
  }

  /* ── Responsive typography ── */
  @media (max-width: 640px) {
    :root {
      --font-h1-size: 1.875rem; --font-h2-size: 1.5rem;
      --font-h3-size: 1.25rem;  --font-h4-size: 1.125rem;
      --font-body1-size: 0.875rem;
    }
  }
  @media (min-width: 641px) and (max-width: 1024px) {
    :root {
      --font-h1-size: 2.25rem; --font-h2-size: 1.875rem;
      --font-h3-size: 1.375rem; --font-body1-size: 0.9375rem;
    }
  }
}
```

### 3.4. `js/theme.js` — ThemeManager (conserver tel quel)

```js
/**
 * RD WORKFLOW — Theme Manager
 * Gestion du basculement thème Clair/Sombre avec persistance
 */
const THEME_KEY = 'rd-theme';

class ThemeManager {
  constructor() {
    this.html = document.documentElement;
    this.currentTheme = this.getStoredTheme() || this.getSystemTheme();
    this.init();
  }

  init() {
    this.applyTheme(this.currentTheme, false);
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.attachEvents());
    } else {
      this.attachEvents();
    }
    this.watchSystem();
  }

  getStoredTheme()  { return localStorage.getItem(THEME_KEY); }
  getSystemTheme()  { return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }

  applyTheme(theme, save = true) {
    this.html.classList.toggle('dark', theme === 'dark');
    this.currentTheme = theme;
    if (save) localStorage.setItem(THEME_KEY, theme);
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
    this.updateToggleButton();
  }

  toggleTheme() { this.applyTheme(this.currentTheme === 'light' ? 'dark' : 'light'); }

  attachEvents() {
    const btn = document.getElementById('themeToggle');
    if (btn) btn.addEventListener('click', () => this.toggleTheme());
    // Raccourci Ctrl/Cmd + Shift + D
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        this.toggleTheme();
      }
    });
  }

  updateToggleButton() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    const isDark = this.currentTheme === 'dark';
    btn.setAttribute('aria-pressed', isDark);
    btn.setAttribute('aria-label', isDark ? 'Passer au thème clair' : 'Passer au thème sombre');
    btn.innerHTML = '';
    const icon = document.createElement('i');
    icon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
    btn.appendChild(icon);
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });
  }

  watchSystem() {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const handler = (e) => {
      if (!this.getStoredTheme()) this.applyTheme(e.matches ? 'dark' : 'light', false);
    };
    mq.addEventListener ? mq.addEventListener('change', handler) : mq.addListener(handler);
  }

  setTheme(t)  { if (t === 'light' || t === 'dark') this.applyTheme(t); }
  getTheme()   { return this.currentTheme; }
  reset()      { localStorage.removeItem(THEME_KEY); this.applyTheme(this.getSystemTheme(), false); }
}

const themeManager = new ThemeManager();
window.themeManager = themeManager;
```

### 3.5. `index.html` — Structure complète avec identité RD

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>DASHBOA_RD · KPI &amp; Tableaux de Bord</title>
  <link rel="icon" type="image/svg+xml" href="assets/icons/icon.svg">

  <!-- Security Headers via meta (complété par GitHub Pages headers) -->
  <meta http-equiv="X-Content-Type-Options" content="nosniff">
  <meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin">
  <meta http-equiv="Permissions-Policy" content="camera=(), microphone=(), geolocation=()">

  <!-- Anti-flash thème : avant tout CSS -->
  <script>
    (function(){
      const t = localStorage.getItem('rd-theme');
      const s = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      if ((t || s) === 'dark') document.documentElement.classList.add('dark');
    })();
  </script>

  <!-- Lucide icons -->
  <script src="https://unpkg.com/lucide@latest"></script>

  <!-- PapaParse pour import CSV -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js"></script>

  <!-- CSS principal (cascade stricte) -->
  <link rel="stylesheet" href="css/main.css">
</head>
<body>

  <!-- Accessibilité : skip link -->
  <a href="#main-content" class="skip-link">Aller au contenu principal</a>

  <!-- Navigation latérale (injectée par JS selon rôle) -->
  <div id="sidebar"></div>

  <!-- Barre supérieure -->
  <div id="topbar"></div>

  <!-- Contenu principal — le routeur injecte les vues ici -->
  <main id="app" id="main-content" role="main"></main>

  <!-- Toast notification globale -->
  <div id="toast-error"
       role="alert"
       aria-live="assertive"
       aria-atomic="true"></div>

  <!-- Supabase SDK (avant les modules ES6) -->
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

  <!-- ThemeManager (non-module, doit être global) -->
  <script src="js/theme.js"></script>

  <!-- Application -->
  <script type="module" src="js/app.js"></script>
</body>
</html>
```

### 3.6. `css/main.css` — Import central (ordre strict)

```css
/* ── 1. Tokens & Variables ── */
@import url('./base/variables.css');

/* ── 2. Base ── */
@import url('./base/reset.css');
@import url('./base/typography.css');

/* ── 3. Layout ── */
@import url('./layout/layout.css');
@import url('./layout/sidebar.css');
@import url('./layout/topbar.css');

/* ── 4. Components ── */
@import url('./components/buttons.css');
@import url('./components/forms.css');
@import url('./components/cards.css');
@import url('./components/badges.css');
@import url('./components/modals.css');
@import url('./components/toasts.css');
@import url('./components/progress.css');
@import url('./components/tables.css');
@import url('./components/accordion.css');

/* ── 5. Animations ── */
@import url('./animations/animations.css');

/* ── 6. Modules ── */
@import url('./modules/login.css');
@import url('./modules/dashboard.css');
@import url('./modules/formation.css');
@import url('./modules/progression.css');
@import url('./modules/profile.css');
@import url('./modules/admin.css');
```

### 3.7. Page de connexion — style split layout RD

La page de login utilise le layout **deux colonnes** : Brand card à gauche (fond `--action-primary`),
formulaire à droite. Sur mobile, la brand card se replie en header compact.

```html
<!-- Injecté par authView.js -->
<div class="login-page-wrapper">
  <main class="login-layout">

    <!-- Colonne gauche : Brand -->
    <section class="login-brand-card" aria-label="Identité DASHBOA_RD">
      <div class="login-brand-content">
        <img src="assets/images/logo.svg" alt="DASHBOA_RD" class="login-brand__logo">
        <h1 class="login-brand__name">DASHBOA_RD</h1>
        <p class="login-brand__tagline">KPI &amp; Tableaux de Bord</p>
        <p class="login-brand__slogan">Maîtrisez vos indicateurs de performance</p>
      </div>
    </section>

    <!-- Colonne droite : Formulaire -->
    <section class="login-form-card" aria-labelledby="formTitle">

      <button type="button" class="theme-toggle" id="themeToggle"
        aria-label="Basculer entre mode clair et mode sombre" aria-pressed="false">
        <i data-lucide="sun"></i>
      </button>

      <form id="loginForm" class="login-form" novalidate>
        <div>
          <h2 id="formTitle" class="login-form__title">Connexion</h2>
          <p class="login-form__subtitle">Accédez à votre espace de formation</p>
        </div>

        <!-- Email -->
        <div class="form-group">
          <label for="email" class="form-label form-label--required">Adresse email</label>
          <div class="input-icon-wrapper">
            <i data-lucide="mail" class="input-prefix-icon" aria-hidden="true"></i>
            <input type="email" id="email" name="email"
              class="form-input form-input--icon-left"
              placeholder="prenom.nom@rd-gestion.fr"
              autocomplete="email" inputmode="email"
              required aria-required="true" aria-describedby="email-error">
          </div>
          <span id="email-error" class="form-error" role="alert" style="display:none;"></span>
        </div>

        <!-- Mot de passe -->
        <div class="form-group">
          <label for="password" class="form-label form-label--required">Mot de passe</label>
          <div class="password-wrapper">
            <input type="password" id="password" name="password"
              class="form-input"
              placeholder="••••••••"
              autocomplete="current-password"
              required aria-required="true" aria-describedby="password-error">
            <button type="button" class="password-toggle" id="passwordToggle"
              aria-label="Afficher le mot de passe" aria-pressed="false">
              <i data-lucide="eye" id="eyeIcon"></i>
            </button>
          </div>
          <span id="password-error" class="form-error" role="alert" style="display:none;"></span>
        </div>

        <!-- Erreur globale -->
        <div id="login-error" class="form-error-global" role="alert" aria-live="polite"
          style="display:none;"></div>

        <button type="submit" class="btn btn-cta btn-full" id="submitBtn">
          <i data-lucide="log-in" aria-hidden="true"></i>
          Accéder au dashboard
        </button>

        <a href="#" class="forgot-password-link" id="forgotPasswordLink">
          Mot de passe oublié ?
        </a>
      </form>
    </section>
  </main>
</div>

<!-- Modale mot de passe oublié -->
<div id="forgotPasswordModal" role="dialog" aria-modal="true"
  aria-labelledby="forgotTitle" style="display:none;">
  <div id="forgotModalBackdrop" class="modal-backdrop"></div>
  <div class="modal-content" role="document">
    <div style="font-size:48px; text-align:center; margin-bottom:var(--space-4);">🔑</div>
    <h3 id="forgotTitle" class="modal-title">Mot de passe oublié ?</h3>
    <p class="modal-body">
      Pour réinitialiser votre mot de passe, contactez votre
      <strong>formateur</strong> ou l'<strong>administrateur</strong>
      de la plateforme.<br><br>
      Il pourra vous générer un nouveau mot de passe depuis son tableau de bord.
    </p>
    <button id="forgotModalCloseBtn" class="btn btn-cta btn-full">
      Compris, merci !
    </button>
  </div>
</div>
```

---

## 4. Base de données SQL

> **Instructions** : Exécuter dans Supabase SQL Editor dans l'ordre numéroté.

### `sql/001_init_schema.sql`

```sql
-- ============================================================
-- LMS DASHBOA_RD — Schéma v1.0
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Référentiel RNCP ──────────────────────────────────────
CREATE TABLE lms_titres_pro (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code_rncp                   VARCHAR(20) UNIQUE NOT NULL,
    sigle                       VARCHAR(20),
    intitule                    TEXT NOT NULL,
    niveau                      INT CHECK (niveau BETWEEN 1 AND 8),
    date_publication_jo         DATE,
    date_effet                  DATE,
    date_previsionnelle_revision DATE,
    secteur_activite            TEXT,
    created_at                  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lms_certificats_ccp (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titre_pro_id UUID REFERENCES lms_titres_pro(id) ON DELETE CASCADE,
    code         VARCHAR(20) UNIQUE NOT NULL,
    intitule     TEXT NOT NULL,
    ordre        INT NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lms_activites (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ccp_id      UUID REFERENCES lms_certificats_ccp(id) ON DELETE CASCADE,
    intitule    TEXT NOT NULL,
    description TEXT,
    ordre       INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lms_competences (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activite_id           UUID REFERENCES lms_activites(id) ON DELETE CASCADE,
    intitule              TEXT NOT NULL,
    description_processus TEXT,
    criteres_performance  TEXT[],
    ordre                 INT NOT NULL DEFAULT 0,
    created_at            TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lms_competences_transversales (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titre_pro_id          UUID REFERENCES lms_titres_pro(id) ON DELETE CASCADE,
    intitule              TEXT NOT NULL,
    description_processus TEXT,
    criteres_performance  TEXT[],
    ordre                 INT NOT NULL DEFAULT 0,
    created_at            TIMESTAMPTZ DEFAULT now()
);

-- ── Contenu pédagogique ────────────────────────────────────
CREATE TABLE lms_cours (
    id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titre                      VARCHAR(255) NOT NULL,
    description                TEXT,
    duree_heures               INT NOT NULL DEFAULT 0,
    est_transversal            BOOLEAN NOT NULL DEFAULT false,
    image_url                  TEXT,
    objectif_pedagogique       TEXT,
    competence_id              UUID REFERENCES lms_competences(id) ON DELETE SET NULL,
    ccp_id                     UUID REFERENCES lms_certificats_ccp(id) ON DELETE SET NULL,
    competence_transversale_id UUID REFERENCES lms_competences_transversales(id) ON DELETE SET NULL,
    created_at                 TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lms_sequences (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cours_id  UUID REFERENCES lms_cours(id) ON DELETE CASCADE NOT NULL,
    titre     VARCHAR(255) NOT NULL,
    objectif  TEXT,
    image_url TEXT,
    ordre     INT NOT NULL DEFAULT 0
);

CREATE TABLE lms_seances (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence_id UUID REFERENCES lms_sequences(id) ON DELETE CASCADE NOT NULL,
    titre       VARCHAR(255) NOT NULL,
    duree_heures DECIMAL(4,1) DEFAULT 0,
    type        VARCHAR(50) CHECK (type IN ('cours','tp','exercice','quiz','evaluation')),
    contenu     TEXT,
    ordre       INT NOT NULL DEFAULT 0
);

-- ── Parcours & Financements ────────────────────────────────
CREATE TABLE lms_pathways (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titre        VARCHAR(255) NOT NULL,
    description  TEXT,
    titre_pro_id UUID REFERENCES lms_titres_pro(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lms_financements (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom         VARCHAR(100) NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lms_parcours_finance_config (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pathway_id          UUID REFERENCES lms_pathways(id) ON DELETE CASCADE NOT NULL,
    financement_id      UUID REFERENCES lms_financements(id) ON DELETE CASCADE NOT NULL,
    duree_totale_heures INT,
    notes               TEXT,
    UNIQUE(pathway_id, financement_id)
);

CREATE TABLE lms_config_cours (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id    UUID REFERENCES lms_parcours_finance_config(id) ON DELETE CASCADE NOT NULL,
    cours_id     UUID REFERENCES lms_cours(id) ON DELETE CASCADE NOT NULL,
    duree_heures INT,
    obligatoire  BOOLEAN NOT NULL DEFAULT true,
    ordre        INT NOT NULL DEFAULT 0,
    UNIQUE(config_id, cours_id)
);

-- ── Utilisateurs & Cohortes ────────────────────────────────
CREATE TABLE lms_profiles (
    id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    civilite       VARCHAR(5) CHECK (civilite IN ('M.', 'Mme', 'Mlle')),
    nom            VARCHAR(100) NOT NULL,
    prenom         VARCHAR(100) NOT NULL,
    date_naissance DATE,
    adresse        TEXT,
    code_postal    VARCHAR(10),
    ville          VARCHAR(100),
    telephone      VARCHAR(20),
    role           VARCHAR(30) NOT NULL DEFAULT 'stagiaire'
                   CHECK (role IN ('admin','formateur_editeur','formateur','stagiaire','invite')),
    first_login    BOOLEAN NOT NULL DEFAULT true,
    created_at     TIMESTAMPTZ DEFAULT now(),
    updated_at     TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lms_profiles_updated_at
BEFORE UPDATE ON lms_profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE lms_cohortes (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom            VARCHAR(100) NOT NULL,
    pathway_id     UUID REFERENCES lms_pathways(id) ON DELETE RESTRICT NOT NULL,
    financement_id UUID REFERENCES lms_financements(id) ON DELETE SET NULL,
    date_debut     DATE,
    date_fin       DATE,
    created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lms_cohorte_membres (
    cohorte_id       UUID REFERENCES lms_cohortes(id) ON DELETE CASCADE NOT NULL,
    profile_id       UUID REFERENCES lms_profiles(id) ON DELETE CASCADE NOT NULL,
    date_inscription DATE NOT NULL DEFAULT CURRENT_DATE,
    PRIMARY KEY (cohorte_id, profile_id)
);

-- ── Progression ────────────────────────────────────────────
CREATE TABLE lms_session_progress (
    profile_id      UUID REFERENCES lms_profiles(id) ON DELETE CASCADE NOT NULL,
    seance_id       UUID REFERENCES lms_seances(id) ON DELETE CASCADE NOT NULL,
    statut          VARCHAR(20) NOT NULL DEFAULT 'non_commence'
                    CHECK (statut IN ('non_commence','en_cours','termine')),
    score           DECIMAL(5,2),
    date_completion TIMESTAMPTZ,
    PRIMARY KEY (profile_id, seance_id)
);

-- ── Logs import admin ──────────────────────────────────────
CREATE TABLE lms_import_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id        UUID REFERENCES lms_profiles(id) ON DELETE SET NULL,
    type_import     VARCHAR(50) NOT NULL,
    nb_lignes       INT NOT NULL DEFAULT 0,
    nb_succes       INT NOT NULL DEFAULT 0,
    nb_erreurs      INT NOT NULL DEFAULT 0,
    details_erreurs JSONB,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── Index performances ─────────────────────────────────────
CREATE INDEX idx_lms_session_progress_profile ON lms_session_progress(profile_id);
CREATE INDEX idx_lms_session_progress_seance  ON lms_session_progress(seance_id);
CREATE INDEX idx_lms_cohorte_membres_profile  ON lms_cohorte_membres(profile_id);
CREATE INDEX idx_lms_cohorte_membres_cohorte  ON lms_cohorte_membres(cohorte_id);
CREATE INDEX idx_lms_seances_sequence         ON lms_seances(sequence_id);
CREATE INDEX idx_lms_sequences_cours          ON lms_sequences(cours_id);
CREATE INDEX idx_lms_config_cours_config      ON lms_config_cours(config_id);
```

---

## 5. Politiques RLS

### `sql/002_rls_policies.sql`

```sql
-- ============================================================
-- LMS DASHBOA_RD — Row Level Security v1.0
-- ============================================================

-- Activer RLS sur toutes les tables
ALTER TABLE lms_titres_pro               ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_certificats_ccp          ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_activites                ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_competences              ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_competences_transversales ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_cours                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_sequences                ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_seances                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_pathways                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_financements             ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_parcours_finance_config  ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_config_cours             ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_profiles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_cohortes                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_cohorte_membres          ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_session_progress         ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_import_logs              ENABLE ROW LEVEL SECURITY;

-- Utilitaire rôle courant (SECURITY DEFINER = accès sans récursion RLS)
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM lms_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── lms_profiles ──────────────────────────────────────────
CREATE POLICY "profiles_select" ON lms_profiles
    FOR SELECT USING (
        id = auth.uid()
        OR get_my_role() IN ('admin','formateur','formateur_editeur')
    );
CREATE POLICY "profiles_update_own" ON lms_profiles
    FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_admin_all" ON lms_profiles
    FOR ALL USING (get_my_role() = 'admin');

-- ── Référentiel — lecture authentifiés, écriture admin ────
CREATE POLICY "ref_read_titres"     ON lms_titres_pro               FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ref_read_ccp"        ON lms_certificats_ccp           FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ref_read_activites"  ON lms_activites                 FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ref_read_comp"       ON lms_competences               FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ref_read_transv"     ON lms_competences_transversales FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ref_write_titres"    ON lms_titres_pro               FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY "ref_write_ccp"       ON lms_certificats_ccp           FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY "ref_write_activites" ON lms_activites                 FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY "ref_write_comp"      ON lms_competences               FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY "ref_write_transv"    ON lms_competences_transversales FOR ALL USING (get_my_role() = 'admin');

-- ── Contenu pédagogique ────────────────────────────────────
CREATE POLICY "cours_read"     ON lms_cours     FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "sequences_read" ON lms_sequences FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "seances_read"   ON lms_seances   FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "cours_write"     ON lms_cours     FOR ALL USING (get_my_role() IN ('admin','formateur_editeur'));
CREATE POLICY "sequences_write" ON lms_sequences FOR ALL USING (get_my_role() IN ('admin','formateur_editeur'));
CREATE POLICY "seances_write"   ON lms_seances   FOR ALL USING (get_my_role() IN ('admin','formateur_editeur'));

-- ── Parcours & Financements ────────────────────────────────
CREATE POLICY "pathways_read"       ON lms_pathways               FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "finance_read"        ON lms_financements            FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "pfc_read"            ON lms_parcours_finance_config FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "config_cours_read"   ON lms_config_cours            FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "pathways_admin"      ON lms_pathways               FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY "finance_admin"       ON lms_financements            FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY "pfc_admin"           ON lms_parcours_finance_config FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY "config_cours_write"  ON lms_config_cours            FOR ALL USING (get_my_role() IN ('admin','formateur_editeur'));

-- ── Cohortes ───────────────────────────────────────────────
CREATE POLICY "cohortes_read" ON lms_cohortes
    FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "cohortes_admin" ON lms_cohortes
    FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY "membres_read" ON lms_cohorte_membres
    FOR SELECT USING (
        profile_id = auth.uid()
        OR get_my_role() IN ('admin','formateur','formateur_editeur')
    );
CREATE POLICY "membres_admin" ON lms_cohorte_membres
    FOR ALL USING (get_my_role() = 'admin');

-- ── Progression — politique la plus critique ──────────────
-- Un stagiaire ne voit QUE sa propre progression
CREATE POLICY "progress_select" ON lms_session_progress
    FOR SELECT USING (
        profile_id = auth.uid()
        OR get_my_role() IN ('admin','formateur','formateur_editeur')
    );
-- Un stagiaire ne peut modifier QUE ses propres lignes
CREATE POLICY "progress_insert" ON lms_session_progress
    FOR INSERT WITH CHECK (profile_id = auth.uid());
CREATE POLICY "progress_update" ON lms_session_progress
    FOR UPDATE USING (profile_id = auth.uid());
-- Seul l'admin peut supprimer (reset progression)
CREATE POLICY "progress_delete" ON lms_session_progress
    FOR DELETE USING (get_my_role() = 'admin');

-- ── Logs import ────────────────────────────────────────────
CREATE POLICY "import_logs_admin" ON lms_import_logs
    FOR ALL USING (get_my_role() = 'admin');
```

---

## 6. Fonctions RPC

### `sql/003_rpc_functions.sql`

```sql
-- ============================================================
-- LMS DASHBOA_RD — Fonctions RPC v1.0
-- ============================================================

-- ── RPC 1 : Cours d'un stagiaire ──────────────────────────
CREATE OR REPLACE FUNCTION get_student_courses(p_profile_id UUID)
RETURNS TABLE (
    cours_id        UUID,    titre           TEXT,
    description     TEXT,    duree_reelle    INT,
    obligatoire     BOOLEAN, est_transversal BOOLEAN,
    image_url       TEXT,    objectif        TEXT,
    ordre           INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT c.id, c.titre, c.description,
        COALESCE(cc.duree_heures, c.duree_heures),
        cc.obligatoire, c.est_transversal,
        c.image_url, c.objectif_pedagogique, cc.ordre
    FROM lms_profiles p
    JOIN lms_cohorte_membres cm ON cm.profile_id = p.id
    JOIN lms_cohortes co ON co.id = cm.cohorte_id
    JOIN lms_parcours_finance_config pfc
        ON pfc.pathway_id = co.pathway_id
        AND pfc.financement_id = co.financement_id
    JOIN lms_config_cours cc ON cc.config_id = pfc.id
    JOIN lms_cours c ON c.id = cc.cours_id
    WHERE p.id = p_profile_id
    ORDER BY cc.ordre;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ── RPC 2 : Toggle progression (réversible) ───────────────
CREATE OR REPLACE FUNCTION toggle_seance_progress(
    p_profile_id UUID, p_seance_id UUID
)
RETURNS TEXT AS $$
DECLARE old_stat TEXT; new_stat TEXT;
BEGIN
    IF auth.uid() != p_profile_id THEN
        RAISE EXCEPTION 'Accès non autorisé';
    END IF;
    SELECT statut INTO old_stat
    FROM lms_session_progress
    WHERE profile_id = p_profile_id AND seance_id = p_seance_id;

    IF old_stat IS NULL OR old_stat = 'non_commence' THEN
        new_stat := 'termine';
        INSERT INTO lms_session_progress (profile_id, seance_id, statut, date_completion)
        VALUES (p_profile_id, p_seance_id, 'termine', now())
        ON CONFLICT (profile_id, seance_id)
        DO UPDATE SET statut = 'termine', date_completion = now();
    ELSIF old_stat = 'termine' THEN
        new_stat := 'non_commence';
        UPDATE lms_session_progress
        SET statut = 'non_commence', date_completion = NULL
        WHERE profile_id = p_profile_id AND seance_id = p_seance_id;
    ELSE
        new_stat := old_stat;
    END IF;
    RETURN new_stat;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── RPC 3 : Résumé progression dashboard ─────────────────
CREATE OR REPLACE FUNCTION get_student_progress_summary(p_profile_id UUID)
RETURNS TABLE (
    cours_id UUID, cours_titre TEXT,
    total_seances INT, terminees INT, pourcentage DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT c.id, c.titre,
        COUNT(s.id)::INT,
        COUNT(sp.seance_id) FILTER (WHERE sp.statut = 'termine')::INT,
        ROUND(
            COUNT(sp.seance_id) FILTER (WHERE sp.statut = 'termine')::DECIMAL
            / NULLIF(COUNT(s.id), 0) * 100, 1
        )
    FROM lms_profiles p
    JOIN lms_cohorte_membres cm ON cm.profile_id = p.id
    JOIN lms_cohortes co ON co.id = cm.cohorte_id
    JOIN lms_parcours_finance_config pfc
        ON pfc.pathway_id = co.pathway_id AND pfc.financement_id = co.financement_id
    JOIN lms_config_cours cc ON cc.config_id = pfc.id
    JOIN lms_cours c ON c.id = cc.cours_id
    JOIN lms_sequences seq ON seq.cours_id = c.id
    JOIN lms_seances s ON s.sequence_id = seq.id
    LEFT JOIN lms_session_progress sp
        ON sp.seance_id = s.id AND sp.profile_id = p_profile_id
    WHERE p.id = p_profile_id
    GROUP BY c.id, c.titre
    ORDER BY MAX(cc.ordre);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ── RPC 4 : Log import admin ──────────────────────────────
CREATE OR REPLACE FUNCTION admin_prepare_import_log(
    p_admin_id UUID, p_type_import TEXT,
    p_nb_lignes INT, p_nb_succes INT, p_nb_erreurs INT,
    p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE new_id UUID;
BEGIN
    IF get_my_role() != 'admin' THEN
        RAISE EXCEPTION 'Réservé aux administrateurs';
    END IF;
    INSERT INTO lms_import_logs
        (admin_id, type_import, nb_lignes, nb_succes, nb_erreurs, details_erreurs)
    VALUES (p_admin_id, p_type_import, p_nb_lignes, p_nb_succes, p_nb_erreurs, p_details)
    RETURNING id INTO new_id;
    RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── RPC 5 : Marquer first_login terminé ───────────────────
CREATE OR REPLACE FUNCTION mark_first_login_done()
RETURNS VOID AS $$
BEGIN
    UPDATE lms_profiles SET first_login = false WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 7. Sécurité — CORS, CSP et Security Headers

### 7.1. Fichier `_headers` (GitHub Pages)

> Ce fichier à la racine du projet est interprété par GitHub Pages / Cloudflare Pages
> pour injecter des headers HTTP sur chaque réponse. **C'est indispensable.**

```
# Fichier : /_headers
# Appliqué à toutes les pages

/*
  # Empêche le sniffing de type MIME (XSS via upload déguisé)
  X-Content-Type-Options: nosniff

  # Empêche l'embedding en iframe (clickjacking)
  X-Frame-Options: DENY

  # Force HTTPS et mémorise pendant 1 an
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

  # Politique de référent : envoie l'origine seulement sur HTTPS→HTTPS
  Referrer-Policy: strict-origin-when-cross-origin

  # Désactive les APIs sensibles non utilisées
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()

  # Content Security Policy — adapté à ce projet
  # - default-src : tout bloqué sauf auto
  # - script-src  : script inline (nonce ou hash recommandé), CDNs
  # - connect-src : Supabase uniquement
  # - font-src    : Google Fonts
  # - img-src     : Supabase Storage + data URIs
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://*.supabase.co https://*.supabase.in blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';
```

> **Note sur `unsafe-inline`** : utilisé pour les styles inline et les modules ES6.
> Pour renforcer davantage, remplacer par des nonces générés côté serveur — non
> applicable ici car GitHub Pages est 100% statique. C'est un compromis acceptable
> pour un LMS privé non exposé publiquement.

### 7.2. CORS côté Supabase

Supabase gère le CORS automatiquement via ses paramètres. Configurer dans
**Supabase Dashboard → Project Settings → API → Allowed Origins** :

```
# En développement
http://localhost:3000
http://localhost:5500
http://127.0.0.1:5500

# En production — remplacer par l'URL GitHub Pages réelle
https://VOTRE_ORG.github.io
https://VOTRE_DOMAINE_CUSTOM.fr
```

> **Ne jamais laisser `*` en production.** Le wildcard CORS autorise n'importe
> quel site à appeler ton API avec les credentials du visiteur.

### 7.3. CORS pour les Edge Functions

```ts
// supabase/functions/_shared/cors.ts
// Importer dans chaque Edge Function

export const corsHeaders = {
  'Access-Control-Allow-Origin':  'https://VOTRE_ORG.github.io',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Dans chaque fonction, gérer le preflight OPTIONS :
if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders });
}
```

### 7.4. Sécurité Supabase — checklist

```
✅ Utiliser UNIQUEMENT la clé anon dans le frontend (jamais service_role)
✅ RLS activée sur TOUTES les tables (vérifier dans Dashboard → Table Editor)
✅ Politiques RLS testées avec un compte stagiaire (voir section 5)
✅ Allowed Origins configurés (section 7.2)
✅ Email auth activé, pas de magic link si non nécessaire
✅ Rate limiting activé (Supabase Auth → Settings → Rate Limits)
✅ Edge Functions : vérifier le JWT appelant avant toute action admin
✅ Backups activés (Supabase Pro → Point-in-Time Recovery)
```

### 7.5. Sécurité JavaScript — règles à respecter

```js
// ❌ NE JAMAIS FAIRE
eval(userInput);
element.innerHTML = userInput;  // XSS direct
fetch(userProvidedUrl);          // SSRF potentiel

// ✅ TOUJOURS FAIRE
element.textContent = userInput;       // Échappement automatique
element.innerHTML = sanitize(html);    // Si du HTML est nécessaire

// Fonction sanitize légère (sans dépendance)
function sanitize(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Pour le contenu pédagogique (contenu riche autorisé par les formateurs)
// Utiliser DOMPurify via CDN si du HTML enrichi est nécessaire :
// <script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.6/purify.min.js"></script>
// element.innerHTML = DOMPurify.sanitize(content);
```

---

## 8. Architecture MVC Frontend

### `js/config.js`
```js
// UNIQUEMENT la clé anon — jamais la service_role
export const SUPABASE_URL  = 'https://VOTRE_PROJECT_ID.supabase.co';
export const SUPABASE_ANON = 'VOTRE_ANON_KEY';
```

### `js/lib/supabaseClient.js`
```js
import { createClient }        from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { SUPABASE_URL, SUPABASE_ANON } from '../config.js';
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
```

### `js/errorHandler.js`
```js
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
```

---

## 9. Store central

### `js/store.js`
```js
export const store = {
    state: {
        user:            null,   // { id, email }
        profile:         null,   // { prenom, nom, role, first_login }
        courses:         [],
        progressSummary: [],
        dailyMessage:    null,
        viewAs:          null,   // { role, profileId } mode "voir en tant que"
    },
    _listeners: [],

    subscribe(fn) {
        this._listeners.push(fn);
        return () => { this._listeners = this._listeners.filter(l => l !== fn); };
    },
    _notify() { this._listeners.forEach(fn => fn(this.state)); },

    setUser(u)            { this.state.user = u;            this._notify(); },
    setProfile(p)         { this.state.profile = p;         this._notify(); },
    setCourses(c)         { this.state.courses = c;         this._notify(); },
    setProgressSummary(s) { this.state.progressSummary = s; this._notify(); },
    setDailyMessage(m)    { this.state.dailyMessage = m;    this._notify(); },
    setViewAs(v)          { this.state.viewAs = v;          this._notify(); },

    getUser()    { return this.state.user; },
    getProfile() { return this.state.profile; },
    getRole()    { return this.state.viewAs?.role ?? this.state.profile?.role; },

    reset() {
        this.state = {
            user: null, profile: null, courses: [],
            progressSummary: [], dailyMessage: null, viewAs: null
        };
        this._notify();
    }
};
```

---

## 10. Routage hash

### `js/router.js`
```js
import { loadAuth, loadChangePassword } from './controllers/authController.js';
import { loadDashboard }   from './controllers/dashboardController.js';
import { loadModules }     from './controllers/moduleController.js';
import { loadSequences }   from './controllers/sequenceController.js';
import { loadSeances }     from './controllers/seanceController.js';
import { loadAdmin }       from './controllers/adminController.js';
import { store }           from './store.js';

export function initRouter(container) {
    window.addEventListener('hashchange', () => route(container));
    route(container);
}

async function route(container) {
    const hash    = location.hash.slice(1) || '/';
    const profile = store.getProfile();

    if (!store.getUser() && hash !== '/login') {
        window.location.hash = '#/login'; return;
    }
    if (profile?.first_login && hash !== '/changer-mot-de-passe') {
        window.location.hash = '#/changer-mot-de-passe'; return;
    }

    if (hash === '/login')                      return loadAuth(container);
    if (hash === '/changer-mot-de-passe')       return loadChangePassword(container);
    if (hash === '/' || hash === '/dashboard')  return loadDashboard(container);
    if (hash === '/admin')                      return loadAdmin(container);
    if (hash === '/modules')                    return loadModules(container);

    const seqMatch    = hash.match(/^\/modules\/([^/]+)$/);
    if (seqMatch)    return loadSequences(container, seqMatch[1]);

    const seanceMatch = hash.match(/^\/modules\/([^/]+)\/sequences\/([^/]+)$/);
    if (seanceMatch) return loadSeances(container, seanceMatch[1], seanceMatch[2]);

    container.innerHTML = `<div class="page-error">
      <i data-lucide="frown" style="width:48px;height:48px;color:var(--text-muted)"></i>
      <h2>Page introuvable</h2>
      <a href="#/dashboard" class="btn btn-cta">Retour au dashboard</a>
    </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
}
```

---

## 11. Authentification

### `js/utils/passwordGenerator.js`
```js
function removeDiacritics(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z]/g, '');
}
export function generateTempPassword(prenom, nom) {
    const year = new Date().getFullYear();
    const cap  = s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    const clean = s => removeDiacritics(s.trim());
    return `${cap(clean(prenom))}.${cap(clean(nom))}${year}`;
    // ex: Marie.Dupont2026
}
```

### `js/models/AuthModel.js`
```js
import { supabase } from '../lib/supabaseClient.js';

export async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
}
export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}
export async function changePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    await supabase.rpc('mark_first_login_done');
}
export async function getCurrentSession() {
    const { data } = await supabase.auth.getSession();
    return data.session;
}
```

### `js/controllers/authController.js`
```js
import { signIn, signOut, changePassword } from '../models/AuthModel.js';
import { getProfile }                       from '../models/ProfileModel.js';
import { store }                            from '../store.js';
import { handleError }                      from '../errorHandler.js';

export async function loadAuth(container) {
    // Injecte le layout split RD (voir section 3.7)
    container.innerHTML = buildLoginHTML();
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Toggle affichage mot de passe
    document.getElementById('passwordToggle')?.addEventListener('click', () => {
        const input = document.getElementById('password');
        const icon  = document.getElementById('eyeIcon');
        const show  = input.type === 'password';
        input.type = show ? 'text' : 'password';
        icon.setAttribute('data-lucide', show ? 'eye-off' : 'eye');
        if (typeof lucide !== 'undefined') lucide.createIcons();
        document.getElementById('passwordToggle').setAttribute('aria-pressed', show);
    });

    // Modale mot de passe oublié
    document.getElementById('forgotPasswordLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        const modal = document.getElementById('forgotPasswordModal');
        modal.style.display = 'flex';
        document.getElementById('forgotModalCloseBtn').focus();
    });
    document.getElementById('forgotModalCloseBtn')?.addEventListener('click', () => {
        document.getElementById('forgotPasswordModal').style.display = 'none';
    });
    document.getElementById('forgotModalBackdrop')?.addEventListener('click', () => {
        document.getElementById('forgotPasswordModal').style.display = 'none';
    });

    // Soumission formulaire
    document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email    = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const btn      = document.getElementById('submitBtn');

        if (!email || !password) return;
        btn.disabled = true;
        btn.textContent = 'Connexion…';

        try {
            const { user } = await signIn(email, password);
            store.setUser(user);
            const profile = await getProfile(user.id);
            store.setProfile(profile);
            window.location.hash = profile.first_login ? '#/changer-mot-de-passe' : '#/dashboard';
        } catch (err) {
            handleError(err, 'Connexion');
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="log-in"></i> Accéder au dashboard';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    });
}

export async function loadChangePassword(container) {
    const profile = store.getProfile();
    container.innerHTML = `
    <div class="auth-wrapper">
      <div class="auth-card">
        <img src="assets/images/logo.svg" alt="DASHBOA_RD" class="auth-logo">
        <h1>Bienvenue ${profile?.prenom || ''} !</h1>
        <p class="auth-subtitle">Pour sécuriser ton compte, choisis un nouveau mot de passe.<br>
          <strong>8 caractères minimum.</strong></p>
        <div class="form-group">
          <label for="new-password" class="form-label form-label--required">Nouveau mot de passe</label>
          <input type="password" id="new-password" class="form-input" autocomplete="new-password">
        </div>
        <div class="form-group">
          <label for="confirm-password" class="form-label form-label--required">Confirmer</label>
          <input type="password" id="confirm-password" class="form-input" autocomplete="new-password">
        </div>
        <div id="change-error" class="form-error-global" style="display:none;" role="alert"></div>
        <button id="btn-change" class="btn btn-cta btn-full">
          <i data-lucide="shield-check" aria-hidden="true"></i>
          Enregistrer le mot de passe
        </button>
      </div>
    </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();

    document.getElementById('btn-change').addEventListener('click', async () => {
        const newPassword = document.getElementById('new-password').value;
        const confirm     = document.getElementById('confirm-password').value;
        const errDiv      = document.getElementById('change-error');

        const showErr = (msg) => { errDiv.textContent = msg; errDiv.style.display = 'block'; };

        if (newPassword.length < 8) return showErr('Le mot de passe doit contenir au moins 8 caractères.');
        if (newPassword !== confirm)  return showErr('Les deux mots de passe ne correspondent pas.');

        try {
            await changePassword(newPassword);
            store.setProfile({ ...store.getProfile(), first_login: false });
            window.location.hash = '#/dashboard';
        } catch (err) {
            handleError(err, 'Changement mot de passe');
        }
    });
}

export async function logout() {
    await signOut();
    store.reset();
    window.location.hash = '#/login';
}

// Génère le HTML de la page login (layout split RD — section 3.7)
function buildLoginHTML() {
    return `<!-- coller ici le HTML complet de la section 3.7 -->`;
    // Note à Claude Code : remplacer par le HTML complet de la section 3.7
}
```

---

## 12. Console admin — import CSV

### Format CSV attendu pour les stagiaires
```
civilite,nom,prenom,email,date_naissance,cohorte_id
Mme,Martin,Sophie,sophie.martin@rd-gestion.fr,15/03/1990,<UUID cohorte>
M.,Dupont,Thomas,thomas.dupont@rd-gestion.fr,22/07/1985,<UUID cohorte>
```

### `js/utils/csvParser.js`
```js
// PapaParse chargé via CDN dans index.html
export function parseCSV(file) {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true, skipEmptyLines: true, trimHeaders: true,
            complete: (results) => resolve(results),
            error:    (err)     => reject(err)
        });
    });
}
```

### `js/models/AdminModel.js`
```js
import { supabase }             from '../lib/supabaseClient.js';
import { generateTempPassword } from '../utils/passwordGenerator.js';
import { store }                from '../store.js';

export async function importStagiaires(rows) {
    const results = { success: [], errors: [] };

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
            if (!row.email || !row.nom || !row.prenom) {
                throw new Error('Colonnes email, nom et prenom obligatoires');
            }
            const tempPassword = generateTempPassword(row.prenom, row.nom);

            // Appel Edge Function (service_role côté serveur uniquement)
            const session = await supabase.auth.getSession();
            const res = await fetch(
                `${supabaseUrl}/functions/v1/create-user`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.data.session.access_token}`
                    },
                    body: JSON.stringify({
                        email:          row.email.trim().toLowerCase(),
                        password:       tempPassword,
                        nom:            row.nom.trim(),
                        prenom:         row.prenom.trim(),
                        civilite:       row.civilite?.trim() || null,
                        date_naissance: parseDate(row.date_naissance),
                        cohorte_id:     row.cohorte_id?.trim() || null
                    })
                }
            );
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || `HTTP ${res.status}`);
            }
            results.success.push({ ligne: i+2, email: row.email, mot_de_passe: tempPassword });
        } catch (err) {
            results.errors.push({ ligne: i+2, email: row.email || '?', message: err.message });
        }
    }

    // Logger l'import
    await supabase.rpc('admin_prepare_import_log', {
        p_admin_id:    store.getUser()?.id,
        p_type_import: 'stagiaires',
        p_nb_lignes:   rows.length,
        p_nb_succes:   results.success.length,
        p_nb_erreurs:  results.errors.length,
        p_details:     results.errors.length ? JSON.stringify(results.errors) : null
    });

    return results;
}

function parseDate(str) {
    if (!str) return null;
    if (str.includes('/')) {
        const [d, m, y] = str.split('/');
        return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
    }
    return str;
}
```

### Edge Function `supabase/functions/create-user/index.ts`
```ts
import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin':  'https://VOTRE_ORG.github.io',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Vérifier que l'appelant est admin
    const token = req.headers.get('Authorization')?.replace('Bearer ', '') || '';
    const { data: { user: caller } } = await supabase.auth.getUser(token);
    if (!caller) return new Response(JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: callerProfile } = await supabase
        .from('lms_profiles').select('role').eq('id', caller.id).single();
    if (callerProfile?.role !== 'admin')
        return new Response(JSON.stringify({ error: 'Réservé aux administrateurs' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { email, password, nom, prenom, civilite, date_naissance, cohorte_id } = await req.json();

    // Créer le compte auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email, password, email_confirm: true
    });
    if (authError) return new Response(JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Créer le profil
    const { error: profileError } = await supabase.from('lms_profiles').insert({
        id: authData.user.id, nom, prenom, civilite, date_naissance,
        role: 'stagiaire', first_login: true
    });
    if (profileError) return new Response(JSON.stringify({ error: profileError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Rattacher à la cohorte
    if (cohorte_id) {
        await supabase.from('lms_cohorte_membres')
            .insert({ cohorte_id, profile_id: authData.user.id });
    }

    return new Response(JSON.stringify({ success: true, userId: authData.user.id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
```

---

## 13. Navigation modules / séquences / séances

### Modèles

```js
// js/models/ModuleModel.js
import { supabase } from '../lib/supabaseClient.js';
import { store }    from '../store.js';
export async function getModulesForStudent() {
    const { data, error } = await supabase.rpc('get_student_courses',
        { p_profile_id: store.getUser().id });
    if (error) throw error;
    return data;
}

// js/models/SequenceModel.js
export async function getSequences(coursId) {
    const { data, error } = await supabase
        .from('lms_sequences')
        .select('id, titre, objectif, image_url, ordre')
        .eq('cours_id', coursId).order('ordre');
    if (error) throw error;
    return data;
}

// js/models/SeanceModel.js
export async function getSeancesWithProgress(sequenceId) {
    const profileId = store.getUser().id;
    const { data, error } = await supabase
        .from('lms_seances')
        .select(`id, titre, duree_heures, type, contenu, ordre,
            lms_session_progress!left(statut, score, date_completion)`)
        .eq('sequence_id', sequenceId)
        .eq('lms_session_progress.profile_id', profileId)
        .order('ordre');
    if (error) throw error;
    return data.map(s => ({
        ...s,
        statut:          s.lms_session_progress?.[0]?.statut || 'non_commence',
        score:           s.lms_session_progress?.[0]?.score  || null,
        date_completion: s.lms_session_progress?.[0]?.date_completion || null
    }));
}

// js/models/ProgressModel.js
export async function toggleSeanceCompletion(seanceId) {
    const { data, error } = await supabase.rpc('toggle_seance_progress', {
        p_profile_id: store.getUser().id, p_seance_id: seanceId
    });
    if (error) throw error;
    return data;
}
```

### Vues — tuiles avec design RD

```js
// js/views/moduleListView.js
export function renderModuleList(container, modules, { onModuleClick }) {
    const cp   = modules.filter(m => !m.est_transversal);
    const trsv = modules.filter(m =>  m.est_transversal);

    container.innerHTML = `
    <div class="page-formation">
      <section class="formation-section">
        <h2 class="section-title">
          <i data-lucide="briefcase" aria-hidden="true"></i>
          Compétences Professionnelles
        </h2>
        <div class="tuiles-grid" id="grid-cp"></div>
      </section>
      <section class="formation-section">
        <h2 class="section-title">
          <i data-lucide="layers" aria-hidden="true"></i>
          Compétences Transversales
        </h2>
        <div class="tuiles-grid" id="grid-transversal"></div>
      </section>
    </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons();
    renderTuiles(document.getElementById('grid-cp'),          cp,   onModuleClick);
    renderTuiles(document.getElementById('grid-transversal'), trsv, onModuleClick);
}

function renderTuiles(container, items, onClick) {
    if (!items.length) {
        container.innerHTML = '<p class="empty-state">Aucun module disponible.</p>';
        return;
    }
    container.innerHTML = items.map(m => `
    <article class="tuile" data-id="${m.cours_id}"
             role="button" tabindex="0" aria-label="${m.titre}">
      <div class="tuile-image">
        ${m.image_url
            ? `<img src="${m.image_url}" alt="" loading="lazy">`
            : `<div class="tuile-placeholder"></div>`}
      </div>
      <div class="tuile-body">
        <h3 class="tuile-titre">${m.titre}</h3>
        <span class="tuile-duree">${m.duree_reelle}h</span>
      </div>
    </article>`).join('');

    container.querySelectorAll('.tuile').forEach(el => {
        const id = el.dataset.id;
        el.addEventListener('click',   () => onClick(id));
        el.addEventListener('keydown', e => { if (e.key === 'Enter') onClick(id); });
    });
}
```

### Vue accordéon séances — avec icônes Lucide et tokens RD

```js
// js/views/seanceListView.js
const BADGE_CONFIG = {
    termine:      { label: 'Terminé',  css: 'badge-success', icon: 'check-circle' },
    en_cours:     { label: 'En cours', css: 'badge-warning', icon: 'clock' },
    non_commence: { label: 'À faire',  css: 'badge-neutral', icon: 'circle' }
};

export function renderSeanceList(container, seances, moduleId, sequenceId, { onToggle, onBack }) {
    container.innerHTML = `
    <div class="page-progression">
      <button class="btn-back" id="btn-back">
        <i data-lucide="arrow-left" aria-hidden="true"></i> Retour
      </button>
      <h2 class="page-title">Séances</h2>
      <div class="accordion" id="accordion-seances" role="list"></div>
    </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons();
    document.getElementById('btn-back').addEventListener('click', onBack);

    const accordion = document.getElementById('accordion-seances');
    accordion.innerHTML = seances.map(buildItem).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: accordion });

    // Toggle accordéon
    accordion.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', (e) => {
            if (e.target.closest('.btn-toggle')) return;
            const item   = header.closest('.accordion-item');
            const isOpen = item.classList.contains('open');
            accordion.querySelectorAll('.accordion-item').forEach(i => {
                i.classList.remove('open');
                i.querySelector('.accordion-header')?.setAttribute('aria-expanded', 'false');
            });
            if (!isOpen) {
                item.classList.add('open');
                header.setAttribute('aria-expanded', 'true');
            }
        });
    });

    // Toggle progression
    accordion.querySelectorAll('.btn-toggle').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const seanceId = btn.dataset.seanceId;
            btn.disabled   = true;
            try {
                const newStatut = await onToggle(seanceId);
                updateItemUI(accordion, seanceId, newStatut);
            } finally {
                btn.disabled = false;
            }
        });
    });
}

function buildItem(s) {
    const b        = BADGE_CONFIG[s.statut] || BADGE_CONFIG.non_commence;
    const btnLabel = s.statut === 'termine' ? 'Réinitialiser' : 'Marquer terminé';
    const btnIcon  = s.statut === 'termine' ? 'rotate-ccw' : 'check';
    return `
    <div class="accordion-item" data-seance-id="${s.id}" role="listitem">
      <div class="accordion-header" role="button" tabindex="0"
           aria-expanded="false" aria-controls="content-${s.id}">
        <div class="accordion-header-left">
          <i data-lucide="${b.icon}" class="badge-icon ${b.css}" aria-hidden="true"></i>
          <span class="accordion-titre">${s.titre}</span>
          <span class="badge ${b.css}" data-badge="${s.id}">${b.label}</span>
        </div>
        <div class="accordion-header-right">
          ${s.duree_heures ? `<span class="accordion-duree">${s.duree_heures}h</span>` : ''}
          <button class="btn btn-sm btn-toggle ${s.statut === 'termine' ? 'btn-secondary' : 'btn-cta-soft'}"
                  data-seance-id="${s.id}" aria-label="${btnLabel}">
            <i data-lucide="${btnIcon}" aria-hidden="true"></i>
            <span>${btnLabel}</span>
          </button>
          <i data-lucide="chevron-down" class="accordion-chevron" aria-hidden="true"></i>
        </div>
      </div>
      <div class="accordion-content" id="content-${s.id}" role="region">
        <div class="accordion-inner">
          ${s.type ? `<span class="tag-type tag-${s.type}">${s.type.toUpperCase()}</span>` : ''}
          ${s.contenu
              ? `<div class="seance-contenu">${DOMPurify ? DOMPurify.sanitize(s.contenu) : s.contenu}</div>`
              : '<p class="empty-state">Contenu à venir.</p>'}
          ${s.date_completion
              ? `<p class="date-completion">
                   <i data-lucide="calendar-check" aria-hidden="true"></i>
                   Terminé le ${formatDate(s.date_completion)}
                 </p>`
              : ''}
        </div>
      </div>
    </div>`;
}

function updateItemUI(accordion, seanceId, newStatut) {
    const item  = accordion.querySelector(`.accordion-item[data-seance-id="${seanceId}"]`);
    const badge = accordion.querySelector(`[data-badge="${seanceId}"]`);
    const btn   = accordion.querySelector(`.btn-toggle[data-seance-id="${seanceId}"]`);
    if (!item || !badge || !btn) return;
    const b = BADGE_CONFIG[newStatut] || BADGE_CONFIG.non_commence;
    badge.textContent = b.label;
    badge.className   = `badge ${b.css}`;
    const newLabel    = newStatut === 'termine' ? 'Réinitialiser' : 'Marquer terminé';
    const newIcon     = newStatut === 'termine' ? 'rotate-ccw' : 'check';
    btn.className     = `btn btn-sm btn-toggle ${newStatut === 'termine' ? 'btn-secondary' : 'btn-cta-soft'}`;
    btn.innerHTML     = `<i data-lucide="${newIcon}" aria-hidden="true"></i><span>${newLabel}</span>`;
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });
}

function formatDate(iso) {
    return new Date(iso).toLocaleDateString('fr-FR',
        { day:'2-digit', month:'long', year:'numeric' });
}
```

---

## 14. Dashboard personnalisé

### `assets/messages.json`
```json
[
  { "type": "motivation", "texte": "Chaque séance terminée te rapproche de ton titre professionnel !" },
  { "type": "citation",   "texte": "La persévérance est la clé du succès. Continue comme ça !" },
  { "type": "conseil",    "texte": "N'hésite pas à revenir sur une séance pour consolider tes acquis." },
  { "type": "motivation", "texte": "Tu progresses chaque jour. C'est ça qui compte !" },
  { "type": "citation",   "texte": "Le chemin de mille lieues commence par un seul pas." },
  { "type": "conseil",    "texte": "Une bonne journée commence par un objectif clair. Quel module today ?" },
  { "type": "motivation", "texte": "Chaque effort compte. Tu bâtis ton avenir séance après séance." },
  { "type": "citation",   "texte": "Le succès est la somme de petits efforts répétés jour après jour." }
]
```

### `js/controllers/dashboardController.js`
```js
import { getProgressSummary } from '../models/DashboardModel.js';
import { renderDashboard }     from '../views/dashboardView.js';
import { store }               from '../store.js';
import { safeCall }            from '../errorHandler.js';

let messagesCache = null;

export async function loadDashboard(container) {
    container.innerHTML = `<div class="loading">
        <i data-lucide="loader-2" class="spin" aria-hidden="true"></i>
        Chargement…
    </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();

    const [progressSummary, messages] = await Promise.all([
        safeCall(() => getProgressSummary(store.getUser().id), 'dashboard'),
        loadMessages()
    ]);

    const dailyMessage      = getDailyMessage(messages || []);
    const contextualMessage = buildContextualMessage(progressSummary || []);
    store.setProgressSummary(progressSummary || []);
    store.setDailyMessage(dailyMessage);

    renderDashboard(container, {
        profile:          store.getProfile(),
        progressSummary:  progressSummary || [],
        dailyMessage,
        contextualMessage,
        role:             store.getRole()
    });
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function loadMessages() {
    if (messagesCache) return messagesCache;
    try {
        const res = await fetch('assets/messages.json');
        messagesCache = await res.json();
        return messagesCache;
    } catch { return []; }
}

function getDailyMessage(messages) {
    if (!messages.length) return null;
    const today  = new Date().toDateString();
    let stored;
    try { stored = JSON.parse(localStorage.getItem('lms_daily_msg')); } catch {}
    if (stored?.date === today) return stored.message;
    const message = messages[Math.floor(Math.random() * messages.length)];
    localStorage.setItem('lms_daily_msg', JSON.stringify({ date: today, message }));
    return message;
}

function buildContextualMessage(summary) {
    if (!summary.length) return null;
    const inProgress = summary.find(c => c.pourcentage > 0 && c.pourcentage < 100);
    if (inProgress) {
        const left = inProgress.total_seances - inProgress.terminees;
        return `Plus que ${left} séance${left > 1 ? 's' : ''} pour terminer « ${inProgress.cours_titre} » !`;
    }
    if (summary.every(c => c.pourcentage === 100))
        return 'Félicitations, tu as terminé toutes tes séances ! 🎉';
    return null;
}
```

---

## 15. Déploiement GitHub Pages

### `.github/workflows/deploy.yml`
```yaml
name: Deploy DASHBOA_RD to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages:    write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - name: Setup Pages
        uses: actions/configure-pages@v4
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: '.'
      - id: deployment
        uses: actions/deploy-pages@v4
```

### `.gitignore`
```
# Ne jamais committer les secrets
.env
.env.local
*.env

# Éditeurs
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db

# Logs
*.log
```

> **Important** : `js/config.js` contient la clé anon Supabase. Cette clé est
> **publique par nature** (c'est son rôle). La sécurité repose sur les RLS, pas
> sur la confidentialité de cette clé. Ne pas mettre ce fichier dans `.gitignore`.

---

## 16. Ordre d'implémentation

### Étape 1 — SQL (Jour 1)
1. `001_init_schema.sql` → vérifier tables dans Table Editor Supabase
2. `002_rls_policies.sql` → vérifier RLS activée sur chaque table
3. `003_rpc_functions.sql` → tester chaque RPC dans SQL Editor
4. Configurer les Allowed Origins CORS dans Supabase Dashboard
5. Tester les RLS avec un compte stagiaire de test

### Étape 2 — Base + Auth (Jours 2-3)
1. `index.html` + structure CSS (`main.css`, `variables.css`, `reset.css`)
2. `theme.js` → tester toggle dark/light
3. `app.js`, `config.js`, `supabaseClient.js`
4. `store.js`, `router.js`, `errorHandler.js`
5. Page login avec layout split RD → tester connexion
6. Page changement mot de passe → tester first_login = false
7. Fichier `_headers` → vérifier CSP dans DevTools (Network → Headers)

### Étape 3 — Dashboard (Jours 4-5)
1. `DashboardModel.js` + `dashboardView.js` + `dashboardController.js`
2. `assets/messages.json`
3. Tester : prénom correct, message du jour, résumé progression

### Étape 4 — Navigation modules (Jours 6-8)
1. Modèles : `ModuleModel`, `SequenceModel`, `SeanceModel`, `ProgressModel`
2. Vues : `moduleListView`, `sequenceListView`, `seanceListView`
3. Contrôleurs correspondants
4. Tester navigation complète + toggle progression + mise à jour badge

### Étape 5 — Console admin (Jours 9-11)
1. Déployer Edge Function `create-user` sur Supabase
2. `csvParser.js` + `passwordGenerator.js` + `AdminModel.js`
3. `adminView.js` + `adminController.js`
4. Tester import CSV avec fichier de 5 lignes → vérifier rapport succès/erreurs
5. Tester connexion avec un compte créé par import (mot de passe temporaire)

### Étape 6 — Finitions & sécurité (Jours 12-14)
1. Sidebar dynamique selon rôle (icônes Lucide, thème dark/light)
2. Mode "Voir en tant que" pour admin/formateur_editeur
3. Vérification CSP complète (console DevTools → zéro erreur CSP)
4. Tests manuels : connexion par rôle, navigation, toggle, import
5. Audit RLS final : stagiaire A ne voit pas la progression du stagiaire B
6. Déploiement GitHub Pages + vérification `_headers` en production

---

## Notes finales pour Claude Code

**Ne jamais** :
- Utiliser la `service_role` key dans le frontend
- Faire `element.innerHTML = userInput` sans sanitisation
- Stocker des données de progression en `localStorage`
- Oublier de vérifier le JWT dans les Edge Functions

**Toujours** :
- Utiliser les variables CSS du design system RD (`--color-primary-600`, etc.)
- Appeler `lucide.createIcons()` après chaque injection HTML contenant des `<i data-lucide>`
- Tester les RLS avec un compte stagiaire avant la mise en production
- Wrapper les appels Supabase avec `safeCall()` dans les contrôleurs
- Vérifier les Security Headers en production via https://securityheaders.com

**Design system** :
- Boutons principaux : `.btn.btn-cta` (orange `#ff570a`)
- Boutons navigation : `.btn` avec `--action-primary` (bleu `#1f4590`)
- Succès / badges "Terminé" : `--color-secondary-600` (émeraude `#1ca098`)
- Thème sombre : classe `.dark` sur `<html>`, géré par `ThemeManager`
