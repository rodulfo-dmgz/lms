# Backup — 2026-04-30 — Quiz : Sections & Navigation

## Fichiers sauvegardés
| Fichier | Chemin original |
|---|---|
| `quizPlayer.js` | `js/utils/quizPlayer.js` |
| `seanceEditorView.js` | `js/views/admin/seanceEditorView.js` |
| `progression.css` | `css/modules/progression.css` |

## Raison de la sauvegarde
Avant l'ajout des fonctionnalités suivantes :

### Admin (`seanceEditorView.js`)
- **Drag & drop** des questions et sections dans l'éditeur quiz
- **Champ description** (visible stagiaire) par section
- **Champ audio** (URL) par section — afficher l'audio lié aux questions
- **Case à cocher** `sectioned` — activer la navigation section par section
- **Onglet Aiken+** dans le panel d'import : nouveau format personnalisé
  supportant `SECTION:`, `SECTION_DESC:`, `SECTION_AUDIO:`, et les réponses `ANSWER:`

### Stagiaire (`quizPlayer.js`)
- **Navigation section par section** quand `config.sectioned === true`
- **Première section** → uniquement bouton "Suivant" (pas de Précédent)
- **Sections suivantes** → "Précédent" + "Suivant" (icônes `circle-chevron-left/right`)
- **Dernière section** → "Précédent" + "Valider"
- **Description de section** affichée sous le titre
- **Lecteur audio** sticky en bas quand la section a un champ `audio`

### CSS (`progression.css`)
- Ajout de nouvelles classes à la **fin du fichier uniquement** (aucune modification)
- Classes : `.quiz-q-drag-handle`, `.quiz-sectioned-wrapper`, `.quiz-section-page`,
  `.quiz-section-desc`, `.quiz-section-footer`, `.quiz-section-audio`,
  `.quiz-section-nav`, `.quiz-nav-btn`, `.quiz-section-label`
