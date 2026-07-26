# MASTER BLUEFOX ODYSSEY

## 1. Identité du projet

**Nom :** BlueFox Odyssey  
**Version jouable de référence :** V0.12 — navigation et monde en développement  
**Chantier prioritaire actuel :** refonte complète du personnage dans Blender  
**Plateforme principale :** navigateur HTML5 / PWA  
**Fonctionnement visé :** hors ligne après installation ou mise en cache  
**Source de travail du personnage :** `BlueFoxMODE_9-2.glb` corrigé dans `BlueFox_MASTER_WORK.blend`  
**Futur modèle officiel :** export GLB propre issu du nouveau rig Blender

BlueFox Odyssey est un jeu d’exploration et d’aventure dans lequel le joueur donne des intentions à BlueFox plutôt que de contrôler chaque action de manière purement mécanique. Le comportement du personnage devra progressivement intégrer autonomie, personnalité, mémoire et relations.

---

## 2. Direction artistique impérative

La qualité visuelle de référence est proche de l’image « Renard et interface.png » :

- renard astronaute bleu et blanc ;
- design mignon, expressif et très détaillé ;
- rendu illustré / 3D cinématique haut de gamme ;
- interfaces bleu nuit futuristes cohérentes ;
- personnage de carte éventuellement plus stylisé, mais toujours soigné.

Le modèle utilisé par le jeu doit être remplacé par l’export propre issu de
`BlueFox_MASTER_WORK.blend`. L’ancien `BlueFoxMODEL.glb` et les variantes
`BlueFoxMODE_9-x.glb` restent des sources historiques, pas des modèles prêts
pour la production.

---

## 3. Principes de jeu validés

- Le joueur exprime une intention.
- BlueFox choisit et exécute l’action appropriée.
- L’exploration doit fonctionner à plusieurs échelles.
- Le zoom doit être fluide entre vue stratégique et vue troisième personne.
- Les biomes doivent former des environnements continus.
- Les transitions entre biomes se font par les limites de la carte.
- Le monde pourra être généré à partir d’illustrations et de règles procédurales.
- L’architecture hors ligne reste obligatoire.

---

## 4. Architecture technique cible

```text
BlueFox Odyssey/
├── index.html
├── css/
├── js/
├── assets/
├── models/
│   └── BlueFoxMODEL.glb
├── docs/
├── tools/
├── builds/
├── MASTER_BLUEFOX.md
├── DEV_HISTORIQUE_BLUEFOX.md
├── TODO_BLUEFOX.md
└── .gitignore
```

### Technologies principales

- HTML5
- CSS
- JavaScript ES modules
- Three.js
- GLTF / GLB
- PWA
- Python pour les outils de développement seulement
- Git pour les points de sauvegarde

---

## 5. Méthode de travail

- Préproduction principalement dans ChatGPT : GDD, architecture, scripts, modèles de données et concepts visuels.
- Développement par étapes courtes.
- Livraison de fichiers complets uniquement.
- Pas de fragments de code à recopier manuellement.
- Builds jouables régulièrement dans le navigateur.
- Godot local pourra rester utile pour des besoins d’intégration avancée, mais HTML5/PWA est désormais la cible principale.
- À chaque jalon validé : mise à jour de MASTER, DEV_HISTORIQUE et TODO, puis point Git.

---

## 6. État réel de la V0.8

Les parties V0.8 Part 1 à Part 6 constituent actuellement une **base de développement et du scaffolding**.

Éléments présents ou préparés :

- structure HTML/CSS/JavaScript ;
- découpage de premiers modules ;
- ajout de Three.js par modules distants ;
- scène 3D de base ;
- sol et éclairage simples ;
- chargement prévu de `BlueFoxMODEL.glb` ;
- ébauches de contrôleur joueur et de caméra troisième personne.

### Limites actuelles

La V0.8 n’est pas encore un jeu pleinement jouable :

- le déplacement complet du renard n’est pas finalisé ;
- la caméra troisième personne n’est pas encore intégrée proprement à la boucle principale ;
- les animations GLB ne sont pas analysées ni pilotées ;
- le terrain est encore un placeholder ;
- aucun biome définitif n’est intégré ;
- aucune IA de comportement n’est encore active ;
- les modules Part 6 restent préparatoires et doivent être corrigés/intégrés avant validation fonctionnelle.

---

## 6 bis. État réel au 24 juillet 2026

Une version navigateur V0.12 a permis de tester le monde, l’interface,
l’autonomie et la navigation. Elle a révélé un défaut fondamental : le modèle
GLB d’origine possédait des axes, une origine, une échelle et une armature
inadaptés. Les corrections appliquées uniquement au runtime entraînaient :

- BlueFox incliné ou avançant dans le mauvais sens ;
- personnage flottant au-dessus du sol ;
- décalage entre caméra, modèle visuel et position logique ;
- disparition fréquente hors champ ;
- contournements d’obstacles avec sauts ou téléportations apparentes ;
- impossibilité d’obtenir une marche propre.

Décision validée : conserver le jeu et ses systèmes, mais **reforger entièrement
le personnage et son rig dans Blender** avant de reprendre les réglages fins de
déplacement et de caméra.

### Normalisation Blender obtenue

- maillage de travail : `BlueFox_Mesh_WORK` ;
- sauvegarde interne : `BlueFox_Mesh_CLEAN_BACKUP` ;
- hauteur : **2,25 m** ;
- position objet : **0 / 0 / 0** ;
- rotation : identité ;
- échelle : **1 / 1 / 1** ;
- origine au sol, centrée entre les bottes dans les vues de face et de profil ;
- personnage redressé et réaligné sur les trois axes ;
- orientation de production : Blender Z vers le haut, personnage tourné vers
  l’avant cohérent du futur export.

### Nouveau rig

Une armature personnalisée a été créée avec :

- os racine ;
- bassin, colonne, cou et tête ;
- épaules, bras, avant-bras, poignets, mains, doigts et pouces ;
- hanches, cuisses, tibias, chevilles et pieds ;
- mâchoire ;
- deux yeux ;
- deux oreilles ;
- houpette subdivisée en quatre segments ;
- queue avec base, chaîne principale et branches de touffes.

Le maillage contenait **6 565 sommets superposés**. Leur fusion, suivie du
recalcul des normales, a résolu l’échec « pondération avec la chaleur des os
impossible ». La pondération automatique fonctionne désormais et un test de
rotation d’avant-bras a confirmé que le maillage suit réellement l’armature.

### Visage

Les yeux sont peints directement sur le maillage et ne disposent pas de vraies
paupières. Une tentative de clignement par clé de forme a étiré la texture et
n’est pas retenue. La solution cible est :

- paupières séparées ou géométrie faciale complémentaire ;
- clés de forme pour sourires, pommettes, sourcils et plissement ;
- os de mâchoire pour la parole ;
- os des yeux pour l’orientation du regard.

Voir `BLENDER_RIG_BLUEFOX.md` pour le point de reprise détaillé.

---

## 7. Roadmap principale

### Phase A — Fondations V0.8

- structure propre du projet ;
- finalisation et export du nouveau GLB propre ;
- inspection et intégration des animations ;
- contrôleur joueur temporaire ;
- caméra troisième personne ;
- serveur local de test ;
- build navigateur jouable.

### Phase B — Premier biome

- terrain explorable ;
- décor et ambiance ;
- collisions ;
- limites de biome ;
- transition entre zones ;
- carte simplifiée.

### Phase C — BlueFox autonome

- système d’intentions ;
- Utility AI ;
- besoins et priorités ;
- mémoire locale ;
- réactions émotionnelles ;
- relations et conséquences.

### Phase D — Systèmes de jeu

- inventaire ;
- collecte ;
- survie légère ;
- construction ;
- quêtes ;
- colonie ;
- narration émergente.

---

## 8. Règle de validation

Une version n’est considérée comme validée que lorsque :

1. elle démarre sans erreur depuis un serveur local ;
2. le modèle officiel est visible ;
3. les commandes prévues fonctionnent ;
4. aucun fichier essentiel n’est manquant ;
5. un test manuel a été effectué ;
6. un point Git propre a été créé.
