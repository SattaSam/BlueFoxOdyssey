# DEV HISTORIQUE — BLUEFOX ODYSSEY

## Origine du projet

BlueFox Odyssey a d’abord été envisagé sous Godot, avec un modèle 3D de renard astronaute. Le projet a ensuite été réorienté vers une architecture HTML5/PWA afin de permettre des tests fréquents directement dans le navigateur et une diffusion simplifiée.

---

## V0.1 — Anciennes bases

- premières expérimentations Godot ;
- premiers fichiers GLB et imports ;
- premiers prototypes HTML ;
- archives conservées localement ;
- caches `.godot` exclus du dépôt Git actif.

---

## V0.7 — Prototype de référence avant refonte

- prototype principalement contenu dans un gros `index.html` ;
- interface et intentions générales du jeu déjà visibles ;
- validation de la poursuite du projet ;
- décision de réorganiser progressivement le code.

---

## V0.8 Part 1 — Fondation modulaire

- création d’une structure de projet simplifiée ;
- séparation initiale de `index.html`, `css/style.css` et `js/main.js` ;
- création des premiers dossiers de référence.

Statut : fondation technique, non jouable comme version finale.

---

## V0.8 Part 2 — Premiers modules

Ajout de modules préparatoires :

- `camera.js`
- `world.js`
- `fox.js`
- `main.js`

Statut : architecture légère et encore incomplète.

---

## V0.8 Part 3 — Préparation Three.js

- ajout d’un bootstrap Three.js ;
- préparation du zoom ;
- préparation du dossier `models/`.

Statut : scaffolding, sans moteur complet.

---

## V0.8 Part 4 — Intégration du modèle

- ajout du fichier officiel `BlueFoxMODEL.glb` ;
- préparation de sa détection et de son chargement.

Statut : modèle intégré aux fichiers, mais validation visuelle encore nécessaire.

---

## V0.8 Part 5 — Première scène Three.js

- création d’une scène Three.js ;
- caméra perspective ;
- OrbitControls ;
- éclairage hémisphérique ;
- sol simple ;
- chargement GLTF prévu par `GLTFLoader` ;
- redimensionnement automatique.

Dépendance actuelle : modules chargés depuis `unpkg.com`.  
Conséquence : la version n’est pas encore entièrement hors ligne.

Statut : première scène technique à tester depuis un serveur local.

---

## V0.8 Part 6 — Contrôleur et caméra préparatoires

- ajout de `player_controller.js` ;
- ajout de `third_person.js` ;
- préparation des contrôles clavier ;
- préparation d’une caméra de suivi.

Important : ces modules n’ont pas encore été correctement intégrés à la scène principale et nécessitent un hotfix avant d’être considérés comme fonctionnels.

Statut : non validé fonctionnellement.

---

## Mise en place locale — 23 juillet 2026

- Python déjà présent via le lanceur Windows `py` ;
- version détectée : Python 3.14.6 ;
- environnement virtuel créé avec :

```powershell
py -m venv .venv
```

- dépôt Git existant détecté ;
- branche renommée en `main` ;
- `.gitignore` ajouté pour exclure notamment `.venv`, archives, ZIP et caches Godot ;
- état final confirmé :

```text
On branch main
nothing to commit, working tree clean
```

Le dépôt local est donc actuellement propre.

---

## Règles permanentes de livraison

- fournir uniquement des fichiers complets ;
- ne jamais demander de modifier quelques lignes à la main ;
- annoncer honnêtement si une livraison est un prototype ou un scaffolding ;
- ne pas présenter une fonctionnalité comme validée sans test réel ;
- mettre à jour les documents de référence à chaque sprint validé.

---

## V0.12 — Diagnostic navigation, caméra et déplacement — 23 juillet 2026

Les tests de la version navigateur ont montré que les anomalies de caméra et
de navigation ne provenaient pas uniquement du code :

- BlueFox pouvait sortir du champ malgré le suivi ;
- le pivot visuel ne correspondait pas à la position logique ;
- le personnage flottait et restait incliné ;
- les rotations et les contournements accentuaient le décalage ;
- les compensations successives dans Three.js devenaient instables.

Conclusion : le système de jeu reste récupérable, mais le modèle devait être
normalisé à la source. La priorité a été déplacée du runtime vers Blender.

---

## Session Blender — Refonte du modèle et du rig — 23/24 juillet 2026

### Diagnostic du GLB source

Le modèle `BlueFoxMODE_9-2.glb` présentait notamment :

- rotation racine d’environ 90° sur X ;
- échelle objet de 0,01 ;
- armature importée inutilisable ou affichée sous forme de volume/étoile ;
- aucune animation intégrée exploitable ;
- orientation et origine incompatibles avec un déplacement fiable.

### Nettoyage du personnage

- duplication du maillage source ;
- création de `BlueFox_Mesh_WORK` ;
- suppression de l’ancien modificateur Armature ;
- suppression du parent en conservant la transformation ;
- redressement manuel du personnage ;
- correction supplémentaire d’environ -32° jusqu’à la posture validée ;
- correction latérale d’environ 5° ;
- application de la rotation et de l’échelle ;
- hauteur finale fixée à 2,25 m ;
- origine placée au sol entre les bottes ;
- recentrage supplémentaire en profondeur depuis la vue de profil ;
- création de `BlueFox_Mesh_CLEAN_BACKUP`.

### Nouvelle armature

Le rig a été reconstruit manuellement et vérifié dans plusieurs vues. Il
comprend le corps humanoïde ainsi que les éléments propres à BlueFox :

- mâchoire ;
- os des yeux ;
- oreilles ;
- houpette en quatre segments ;
- queue principale et branches de touffes ;
- mains, doigts et pouces.

### Incident de pondération résolu

Les premières opérations « Avec poids automatiques » semblaient se terminer,
mais le maillage ne suivait pas les os. Le message complet était :
« pondération avec la chaleur des os impossible ».

Nettoyage effectué :

1. suppression du parent, du modificateur et des groupes incomplets ;
2. fusion par distance de l’ensemble du maillage ;
3. **6 565 sommets fusionnés** ;
4. recalcul des normales vers l’extérieur ;
5. nouvelle pondération automatique.

Résultat validé : la rotation d’un avant-bras déforme désormais effectivement
le maillage de BlueFox.

### Tentative faciale

Création préparatoire de clés de forme :

- `Basis`
- `Blink_L`
- `Blink_R`
- `Squint`
- `Smile`
- `Brow_Up`

La tentative `Blink_L` a montré que l’œil est une texture peinte sur la surface
du visage, sans paupière géométrique. La compression des sommets étire l’œil et
n’est pas utilisable. Décision : créer des paupières séparées avant de reprendre
les expressions.

### Point exact de fin de session

- rig corporel fonctionnel ;
- poids automatiques calculés ;
- première articulation validée ;
- animations encore absentes ;
- os encore à renommer ;
- corrections fines des poids non réalisées ;
- création d’une paupière séparée commencée puis interrompue ;
- curseur 3D remis à l’origine du monde avant sauvegarde ;
- fichier Blender enregistré localement sous `BlueFox_MASTER_WORK.blend`.
