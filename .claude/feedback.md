# Feedback & Préférences — RD LMS (seanceEditorView sessions)

Fichier compilé à partir des corrections, préférences et leçons apprises lors des sessions
de développement de l'éditeur de séance. À relire en début de session.

---

## ✅ Préférences visuelles & design

### Identité visuelle
- L'icône du bloc Accueil est **`smile`** (Lucide). Ne pas changer vers `briefcase-business` ou autre.
- Les dégradés CSS utilisent le pattern `linear-gradient(135deg, var(--action-primary) 0%, color-mix(in srgb, var(--action-primary) 70%, #6366f1) 100%)` — cohérent avec le welcome accordion.
- `border-radius: var(--radius-xl)` pour les blocs "premium" (welcome, consignes, seance-end).
- Le design doit être **premium et innovant**, jamais générique (style Moodle = signal négatif).

### Callout
- Doit rester **compact** : `padding: var(--space-3) var(--space-4)`, `border-left: 3px solid`, pas de margin externe forcé.
- Ne pas remettre de padding large ou de border-radius excessif.

### Consignes
- L'utilisateur veut les 5 modes (instruction / important / astuce / rappel / lecture) avec couleurs distinctes.
- **Deux variantes** coexistent intentionnellement :
  - `consigne` (SIMPLE_TYPE) — rich-text uniquement, nestable dans accordéons
  - `consignes` (CONTAINER_TYPE, "Consignes +") — slot libre avec n'importe quel bloc
- Les deux partagent le même CSS `.consignes-card--{mode}`.
- Design : header coloré en dégradé + icône dans cercle blanc semi-transparent + label en majuscules + chevron rotatif.

### Rich text
- Les contrôles de taille, police, couleur sont requis dans la toolbar rich-text.
- Variable CSS correcte : `var(--font-body, 'Plus Jakarta Sans', system-ui, sans-serif)` — **pas** `var(--font-sans)` (n'existe pas dans ce design system).
- Polices disponibles dans le picker : `Plus Jakarta Sans`, `Space Grotesk`, `JetBrains Mono`.

---

## 🐛 Bugs récurrents à éviter

### 1. Ne jamais hardcoder de contenu dans les sérialiseurs
**Problème** : Le sérialiseur `welcome` ajoutait `"👋 Bonjour $prenom,"` comme préfixe ET rendait `block.message` — ce qui produisait "Bonjour **Rodulfo**, Rodulfo" côté stagiaire.  
**Règle** : Le sérialiseur rend uniquement ce que l'admin a écrit. Aucun texte hardcodé ajouté autour des champs utilisateur.

### 2. Variable CSS inexistante
`var(--font-sans)` n'existe pas → blanc. Toujours utiliser `var(--font-body, fallback)`.  
**Règle** : Vérifier l'existence d'une variable CSS dans le design system avant de l'utiliser.

### 3. Picker radio `.active` non mis à jour au clic
Les pickers radio visuels (callout-variant-opt, consignes-mode-opt, spacer-style-opt) ont besoin d'un handler JS explicite pour toggler `.active`.  
**Règle** : À chaque nouveau picker radio, ajouter immédiatement le handler dans `bindRootCardEvents`. Le handler générique actuel couvre `.spacer-style-opt`, `.callout-variant-opt`, `.consignes-mode-opt` — l'étendre si nouveau type de picker.

### 4. `updateContainerConfig` et les radios
La version originale faisait `block[field] = el.value` pour TOUS les inputs — pour un radio non coché, cela écrase la valeur correcte.  
**Règle** : `updateContainerConfig` doit tester `el.type === 'radio'` et ne lire que si `el.checked`.

### 5. Scope du toggle `.active` (container vs simple)
Le handler `.active` était dans le bloc `else` (simple blocks seulement). Quand consignes est devenu container (`isCt = true`), le toggle a cessé de fonctionner.  
**Règle** : Le handler radio `.active` doit être **avant** le `if (isCt) / else` — il s'applique aux deux types.

### 6. Edit tool — `old_string` doit correspondre exactement
Plusieurs fois l'Edit a échoué car le fichier avait déjà été modifié et `old_string` ne correspondait plus.  
**Règle** : Relire le fichier (ou la section) juste avant d'éditer si une modification récente a pu changer le contexte. Ne jamais supposer que le fichier est dans l'état du dernier résumé.

---

## 🏗️ Checklist — Déplacer un type SIMPLE → CONTAINER

Quand un bloc passe de `SIMPLE_TYPES` à `CONTAINER_TYPES`, vérifier systématiquement :

- [ ] Retirer de `SIMPLE_TYPES`
- [ ] Ajouter dans `CONTAINER_TYPES`
- [ ] Ajouter le type dans les **deux** déclarations `const isCt = [...]` (`renderRootCard` ET `bindRootCardEvents`)
- [ ] Ajouter un `} else if (block.type === 'xxx') {` dans `renderRootCard` pour le body (avec `.block-container-config` + `.nested-slot`)
- [ ] Ajouter dans `mountContainerSlots()` avec le bon `allowContainers` (true/false)
- [ ] Vérifier que `updateContainerConfig` gère bien les radios du nouveau container
- [ ] Le handler radio `.active` doit être HORS du `if/else` pour couvrir le nouveau container
- [ ] Supprimer le `case 'xxx'` de `renderBlockForm` (formulaire maintenant dans le container config)
- [ ] Mettre à jour `serializeBlock` — utiliser `block.children` au lieu de `block.content`
- [ ] Mettre à jour `createDefaultBlock` — ajouter `children: []`
- [ ] Mettre à jour `blockPreview` pour le nouveau type
- [ ] CSS étudiant : `<details>/<summary>` au lieu de `<div>`
- [ ] DOMPurify : s'assurer que `open`, `details`, `summary` sont dans `ADD_TAGS`/`ADD_ATTR`

---

## 🧩 Checklist — Nouveau type simple nestable

Quand un bloc doit être utilisable **dans** un accordéon/container :

- [ ] Le mettre dans `SIMPLE_TYPES` uniquement (pas dans `CONTAINER_TYPES`)
- [ ] Il sera automatiquement disponible dans `mountNestedSlot` via `paletteTypes = [...SIMPLE_TYPES, ...]`
- [ ] Si c'est une variante "légère" d'un container existant, utiliser un nom au singulier (`consigne` vs `consignes`)
- [ ] Même CSS que la version container si applicable (réutiliser les classes)
- [ ] Ajouter dans `createDefaultBlock`, `renderBlockForm`, `serializeBlock`, `blockPreview`

---

## 💡 Décisions de design prises (à ne pas remettre en question)

| Décision | Contexte |
|---|---|
| `smile` pour le welcome | L'utilisateur a explicitement rejeté `briefcase-business` |
| `$prenom` = variable libre dans le message | L'utilisateur écrit tout le message lui-même, pas de préfixe auto |
| Consignes en 2 variantes (simple + container) | L'utilisateur veut la flexibilité : simple dans accordéon ET container à la racine |
| 5 modes de consigne avec gradients | Préférence explicite pour garder les types colorés |
| Callout compact | L'utilisateur avait "trop massif" comme retour |
| `<details open>` pour welcome et consignes | Ouvert par défaut, stagiaire peut réduire — pattern validé |
| `allowContainers: false` pour le slot welcome | Objectifs seulement, pas de mise en page complexe dans l'accueil |
| `allowContainers: true` pour accordion et consignes+ | Contenu libre intentionnel |

---

## 📐 Architecture — rappels importants

- `serializeBlocks(block.children)` pour les containers, `block.content` (innerHTML) pour les simples
- `updateContainerConfig` scope sur `.block-container-config` — ne lit pas les champs des blocs imbriqués
- `updateBlockFromForm` scope sur toute la carte — pour les simples uniquement
- `populateRichEditors` populate les `.rich-editor` depuis le store au rendu initial
- `lucide.createIcons({ root: list })` est appelé après `renderBlockList` — tous les data-lucide du formulaire (même hidden) sont convertis en SVG au rendu initial, pas besoin de rappeler à l'ouverture du formulaire

---

## 🔄 Pattern évolutif — à proposer plutôt qu'attendre la demande

- Si l'utilisateur demande un bloc "note" ou "info" → proposer d'emblée la dualité simple/container
- Si un bloc a un picker de variantes → vérifier que le handler `.active` existe avant de livrer
- Si un container a des radios dans sa config → vérifier que `updateContainerConfig` les gère
- Si l'utilisateur dit "comme Moodle" de façon négative → repenser entièrement le design avant de coder
