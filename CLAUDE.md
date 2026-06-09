# Instructions Claude — RD LMS

## Fichiers de référence à lire en priorité

- `.claude/feedback.md` — Préférences, corrections passées, checklists. **Lire avant toute modification de l'éditeur de séance.**
- `.claude/skills/lms-architecture/SKILL.md` — Architecture MVC, patterns contrôleur
- `.claude/skills/lms-supabase/SKILL.md` — Tables, RPC, patterns Supabase
- `.claude/skills/lms-design-system/SKILL.md` — Variables CSS, composants UI
- `.claude/skills/lms-security/SKILL.md` — Règles de sécurité, DOMPurify, RLS

## Règles de session

1. Avant de modifier `seanceEditorView.js` → lire `.claude/feedback.md`
2. Toujours vérifier qu'un `old_string` correspond exactement au fichier actuel avant d'appeler Edit
3. Ne jamais hardcoder de texte dans les sérialiseurs de blocs — rendre uniquement `block.field`
4. Après tout ajout de picker radio → vérifier que le handler `.active` existe dans `bindRootCardEvents`
5. `var(--font-sans)` n'existe pas — utiliser `var(--font-body, 'Plus Jakarta Sans', system-ui, sans-serif)`
