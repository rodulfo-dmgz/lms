# Structure de Séance LMS - Moderne & Minimaliste

## 📌 Contexte
J'ai besoin d'une structure de séance claire, engageante et minimaliste. Mes séquences sont gérées de manière liée avec une structure définie. Je souhaite que tu m'aides à concevoir et implémenter cette structure.

---

## 🏗️ Hiérarchie Globale du Cours
MODULE
│
├── SÉQUENCE
│ │
│ ├── SÉANCE
│ │ ├── Bloc Accueil Personnalisé
│ │ ├── Bloc Objectifs Pédagogiques (Accordéon Spécial)
│ │ ├── Activité 1 (Accordéon)
│ │ ├── Activité 2 (Accordéon)
│ │ └── Activité N (Accordéon)
│ │
│ ├── SÉANCE
│ └── SÉANCE
│
├── SÉQUENCE
└── SÉQUENCE

text

---

## 🎯 Structure Détaillée d'une SÉANCE

### 1. BLOC D'ACCUEIL PERSONNALISÉ
*Affiché automatiquement à l'ouverture de la séance*

```markdown
# 🎯 [Titre de la séance]

👋 Bonjour $prenom, aujourd'hui nous allons [objectif principal exprimé en langage naturel et engageant]

⏱️ Durée : XX minutes
📅 Dernière mise à jour : $date
Règles pour ce bloc :

Toujours utiliser la variable $prenom pour personnaliser

L'objectif principal doit être formulé comme une promesse ("vous allez découvrir comment...", "vous allez apprendre à...")

La durée est indicative mais doit être réaliste

Ce bloc n'est PAS un accordéon, il est visible immédiatement

2. BLOC OBJECTIFS PÉDAGOGIQUES (Accordéon Spécial 🌟)
Cet accordéon doit être VISUELLEMENT DIFFÉRENT des autres (couleur distincte, icône spécifique)

markdown
📋 OBJECTIFS DE LA SÉANCE

🎓 Ce que vous allez apprendre :
✓ [Objectif 1 - Verbe d'action + contenu spécifique]
✓ [Objectif 2 - Verbe d'action + contenu spécifique]
✓ [Objectif 3 - Verbe d'action + contenu spécifique]

💡 Pourquoi c'est important :
[Contexte, mise en situation, bénéfice concret pour l'apprenant]

📊 Prérequis :
[Liste des connaissances ou compétences nécessaires]
Règles pour ce bloc :

Style visuel distinct : fond coloré différent, bordure spéciale, icône 🌟 ou 📋

Les objectifs utilisent la taxonomie de Bloom (Identifier, Comprendre, Appliquer, Analyser, Créer...)

Maximum 3-5 objectifs par séance

La section "Pourquoi c'est important" est OBLIGATOIRE

L'accordéon est OUVERT par défaut

3. ACTIVITÉS (Accordéons Standards)
Chaque activité est un accordéon indépendant

markdown
## Activité 1 : [Titre de l'activité]

⏱️ Durée : XX min
📝 Type : [Lecture | Vidéo | Quiz | Exercice | Discussion | Projet]

📌 Consignes :
[Instructions claires et numérotées si nécessaire]

📚 Ressources :
- [Document 1]
- [Vidéo 1]
- [Lien 1]

✅ Critère de réussite :
[Comment l'apprenant sait qu'il a terminé avec succès]

💬 Question de réflexion (optionnel) :
[Question pour approfondir]
Règles pour les activités :

Format accordéon STANDARD (style différent du bloc objectifs)

Une activité = un accordéon

Ordre logique et progressif

2 à 5 activités par séance maximum

La durée cumulée doit correspondre à la durée annoncée

4. BLOC DE FIN DE SÉANCE (Optionnel)
markdown
## 🎉 Félicitations $prenom !

✅ Ce que vous avez accompli :
- [Résumé point 1]
- [Résumé point 2]

📖 Pour aller plus loin :
[Ressources complémentaires]

➡️ Prochaine étape : [Séance suivante avec lien]
🎨 Exemple Concret de Séance
markdown
# 🎯 Introduction à la photographie

👋 Bonjour $prenom, aujourd'hui nous allons découvrir les fondamentaux de la photographie et apprendre à maîtriser votre appareil en mode manuel

⏱️ Durée : 25 minutes
📅 Dernière mise à jour : 15 janvier 2024

---

## 📋 OBJECTIFS DE LA SÉANCE

🎓 Ce que vous allez apprendre :
✓ Identifier les trois paramètres fondamentaux de l'exposition
✓ Comprendre la relation entre ouverture, vitesse et ISO
✓ Appliquer les réglages manuels sur votre appareil

💡 Pourquoi c'est important :
Maîtriser le mode manuel vous permettra de libérer votre créativité et de ne plus dépendre des modes automatiques qui limitent vos possibilités artistiques. C'est la première étape pour devenir un photographe accompli.

📊 Prérequis :
- Savoir allumer votre appareil photo
- Connaître les boutons de base

---

## Activité 1 : Le triangle d'exposition

⏱️ Durée : 10 min
📝 Type : Lecture interactive

📌 Consignes :
1. Lisez le document "Le triangle d'exposition"
2. Observez les animations interactives
3. Notez vos questions pour la suite

📚 Ressources :
- Document PDF : triangle-exposition.pdf
- Animation : simulateur-exposition.html

✅ Critère de réussite :
Vous devez pouvoir expliquer en vos mots le rôle de chaque paramètre

---

## Activité 2 : Quiz de validation

⏱️ Durée : 5 min
📝 Type : Quiz

📌 Consignes :
Répondez aux 5 questions du quiz pour valider votre compréhension

✅ Critère de réussite :
Score minimum de 4/5

📋 Checklist pour Claude
Quand tu généreras une séance, assure-toi de :

Inclure le message personnalisé avec $prenom

Formuler un objectif principal engageant (pas juste une liste)

Créer le bloc objectifs avec le style spécial

Ajouter la section "Pourquoi c'est important"

Limiter à 3-5 objectifs maximum

Proposer 2-5 activités en accordéons standards

Indiquer une durée pour chaque activité

Vérifier que la durée totale est cohérente

Inclure des critères de réussite pour chaque activité

Respecter la hiérarchie MODULE > SÉQUENCE > SÉANCE

Différencier visuellement l'accordéon objectifs des autres