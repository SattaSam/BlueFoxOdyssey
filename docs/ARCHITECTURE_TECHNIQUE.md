# BlueFox Odyssey — Architecture technique

Référence : **commit `35685c793ecb110bc928e9af0b5b3fecd1658e0b` — 19 août 2026**

## Registre canonique des propriétaires

| Domaine | Propriétaire canonique | Rôle / règle |
| --- | --- | --- |
| Objet / métadonnées CUO | `engine/object-library.js` | Source de vérité des objets |
| Placement / instanciation | `engine/object-spawner.js` | Placement global, spawn objets/MSC |
| Biomes | `engine/biome-rules.js` | Règles de biome |
| Politique de population | `engine/biome-population-policy-r3.js` | Pondérations, exclusions, population |
| Hiérarchie de population | `engine/map-population-hierarchy.js` | Organisation des niveaux de population |
| Génération de map | `engine/map-generator.js` + `engine/map-generation-rules.js` | Génération structurelle des maps |
| Prescription Bible des maps | `engine/bible-map-prescription-v19.js` | Prescriptions Bible appliquées aux maps |
| Application prescriptions Bible au générateur | `engine/map-generator-bible-overrides-v19.js` | Traduit/applique les prescriptions |
| Exploration Bible / monde | `engine/bible-exploration-world-v19.js` | Règles exploration issues de la Bible |
| Exploration Bible / MSC | `engine/bible-exploration-micro-scenes-v19.js` | Liaison exploration Bible ↔ MSC |
| Micro-scènes | `engine/micro-scenes.js` | Orchestration MSC |
| Données MSC custom | `data/custom-micro-scenes.js` | Compositions MSC enregistrées |
| Persistance MSC | `engine/persistent-micro-scenes-v20.js` | Restaurer/persister les MSC |
| Monde / transitions / autonomie | `engine/world-engine.js` | État et fonctionnement du monde |
| Topologie monde | `engine/world-topology-v3.js` | Graphe/topologie des maps |
| Persistance topologie | `engine/topology-persistence-bridge.js` | Sauvegarde/restauration topologie |
| Menu planète / topologie UI | `engine/planet-topology-ui.js` | Représentation topologique dans l’UI |
| Globe planète | `engine/planet-globe-ui.js` | Rendu/interactions globe |
| Caméra | `engine/camera-controller.js` | Propriétaire principal caméra |
| Regard caméra étendu | `engine/camera-extended-look.js` | Extension du contrôleur |
| Déplacement BlueFox | `engine/character-controller.js` | Mouvement personnage |
| Navigation / chemins | `engine/path-planner.js` | Calcul/planification des déplacements |
| Arbitrage comportemental BAC | `engine/behavior-arbitration-core.js` | Décision comportementale |
| Intégration BAC au jeu | `engine/behavior-arbitration-integration.js` | Raccord BAC ↔ runtime |
| Budget CPU | `engine/runtime-budget.js` | Unique système de throttling adaptatif |
| Progression centrale | `engine/progression-registry.js` | Registre autoritaire de progression |
| Sauvegarde globale / snapshots | `engine/save-ui-bridge.js` | Orchestration save/load |
| Missions / orchestration | `engine/mission-manager.js` | Propriétaire du cycle missionnel |
| Mémoire mission | `engine/mission-memory.js` | Lifecycles, faits, historique, sites |
| Planification mission | `engine/mission-planner.js` | Traduit mission en intention/action |
| Arbre / objectifs | `engine/mission-tree.js` | Structure des objectifs |
| Types mission | `engine/mission-types.js` | Modèle des types/objectifs |
| Contrat Bible | `engine/bible-contract-v0-1.js` | Contrat des fiches/patrons |
| Runtime Bible | `engine/bible-runtime-v0-1-unified.js` | Interprétation Bible, narration, effets et crédits d’activation |
| Validation Bible | `engine/bible-validation-v0-1.js` | Validation des données Bible |
| Patrons Bible | `data/bible-patterns.js` | Familles génériques |
| Catalogue Bible | `data/bible-catalog.js` | Fiches missionnelles |
| Exécution mission → action | `engine/action-bridge.js` | Raccord intention/action réelle |
| Événements objets | `engine/object-event-registry.js` | Normalisation événements |
| Raccord CUO → M0 | `engine/object-m0-bridge.js` | Matching générique critères mission ↔ métadonnées CUO |
| Arbitrage cible mission | `engine/mission-target-arbitration-v19-12.js` | Choix/priorité de cible |
| Intégration runtime missions | `engine/mission-runtime-integration-v19-7.js` | Raccord runtime mission au jeu |
| UI missions / tutoriel | `engine/mission-ui-bridge.js` | Affichage mission + consommation guidage tutoriel ; aucune logique missionnelle propriétaire |
| Inventaire UI | `engine/inventory-ui-bridge.js` | Raccord UI inventaire |
| Survie / IA | `engine/survival-ai-bridge.js` | Raccord survie ↔ comportement |
| Rations | `engine/survival-rations-v0-3.js` | Mécanique ration |
| IA ration | `engine/survival-rations-ai-v0-3.js` | Utilisation ration par IA |
| Réglages survie | `engine/survival-tuning-r3.js` | Tuning uniquement |
| Musique adaptative | `engine/adaptive-music-engine-v1.js` | Unique moteur musical |
| Raccord musique ↔ gameplay | `engine/adaptive-music-gameplay-bridge-v1.js` | Contexte gameplay/BAC |
| UI musique | `engine/adaptive-music-ui-v1.js` | Volumes/UI |
| `map-registry.js` | **PROTÉGÉ** | Aucun ajout de logique objet/population/mission |

## Contrat missionnel validé P01→P04

### Chaînage
Le lifecycle reste la propriété de `MissionManager`.
Les prérequis sont satisfaits sur l’état `completed` de la mission précédente. Une fiche peut être enregistrée/préparée avant d’être réellement active ; la narration de révélation doit attendre le passage réel à `active`.

Chaîne validée :

```text
T01 completed
→ T02 active
T02 completed
→ T03 active
T03 completed
→ T04 active + GAME-shelter active
```

### Narration Bible
Le propriétaire est `engine/bible-runtime-v0-1-unified.js`.

Contrat courant :
- texte narratif ordinaire → queue narrative → `onSpeak` + historique d’action ;
- route explicite `journal` → journal dédié lorsque le contrat le prévoit ;
- `mission_revealed` → émission une seule fois au passage réel en `active`, y compris sortie de `pending`;
- les reçus de narration sont persistés pour éviter les doublons ;
- la queue narrative calcule la durée d’affichage et réserve `speechQuietUntil` afin d’éviter qu’une parole autonome n’écrase la bulle.

### Crédit d’inventaire à l’activation
Le catalogue peut déclarer `activationInventoryCredits`.
`BibleRuntime` est le consommateur générique de cette prescription.
P03 l’utilise pour créditer l’objectif `collectWood` à partir du bois déjà disponible, plafonné à 10, sans consommer la ressource avant l’effet de complétion.

### Matching CUO générique
`engine/object-m0-bridge.js` compare les critères de mission aux métadonnées réelles :
- `objectId`
- `cuoType`
- `kind`
- `family`
- `subject`
- `category`
- tags
- exclusions correspondantes

Cette règle a permis de valider T02 sans coder de cas missionnel spécifique : bois, plante et minerai sont distingués par le vocabulaire CUO existant.

### Fan-out
Une même action canonique peut faire progresser plusieurs missions déjà actives.
P04 + `GAME-shelter` constituent le test de référence actuel de ce comportement.
Aucun bridge supplémentaire ne doit intercepter l’événement avant ses consommateurs normaux.

## UI tutorielle
La façade visuelle `BF.TutorialUI`, installée dans `mission-ui-bridge.js`, reste non destructive :
- message ;
- fermeture ;
- résolution de cible ;
- surbrillance.

Les fiches portent les prescriptions `uiGuidance`. Le bridge UI les consomme, mais ne possède pas le lifecycle missionnel.

Comportements validés :
- P01 : aide capsule ;
- P03 : aide caméra après 90 s, surbrillance `camera`;
- P04 : aide lorsque T04 + `GAME-shelter` sont actives simultanément ;
- durée explicite courante des aides : 14 s.

## BAC / fatigue
La décision survie/fatigue est portée par le BAC. L’intégration runtime exécute la routine décidée.
Ne pas réintroduire un second overlay `updateAutonomy` concurrent.
Les pauses critiques et micro-pauses restent autorisées même avec mission prioritaire.

## RuntimeBudget
`engine/runtime-budget.js` reste l'unique budget adaptatif de runtime. Aucun second système de throttling ne doit être créé.

## Sauvegarde / dirty-state
Chaîne d'autosave :

```text
persistRuntime()
→ captureState()
→ stateSignature()
→ comparaison à lastAutoStateSignature
→ écriture seulement si nécessaire
```

`persistRuntime()` ne doit pas créer artificiellement un état modifié. `MissionMemory` conserve son mécanisme dirty/flush.

## Contrat CUO → événements → missions
Le CUO ne sert pas uniquement au rendu 3D. Les définitions normalisées exposent actions, états, familles, tags, connaissances, recherche, ressources, progression, rareté, biomes et spawn.
Ces métadonnées sont projetées dans `userData` puis réinjectées dans les événements consommés par le moteur missionnel.

## Contrat MSC
- CUO Lab enregistre les transformations locales.
- MAP_Test et le jeu interprètent exactement les mêmes données.
- `ObjectSpawner` ne réécrit pas les pivots internes.
- Une MSC peut avoir trois rôles missionnels indépendants : `triggerContext`, `objectiveSubject`, `scenarioSupport`.
- Une MSC associée à une mission n'est pas automatiquement un objectif.
- P03 établit `MSC-CUSTOM-CAMP` via l’effet canonique `site.establish`.

## Raccords missionnels encore ouverts
À ajouter uniquement lorsqu’une future mission l’exige :
- propagation `targetBinding=instance` jusqu'à ActionBridge ;
- `distinctBy` générique ;
- agrégation multi-map / multi-biome / multi-instance ;
- généralisation éventuelle du spawn missionnel au-delà de `site.establish`;
- présence / proximité / durée / délai ;
- excursion → changement de map → retour ;
- effets génériques réputation / branche / faits.

## Discipline de modification
- toujours partir du fichier complet du HEAD courant ;
- ne jamais reconstruire depuis un extrait ;
- vérifier le diff exact ;
- conserver tout contenu hors périmètre ;
- aucun bridge parallèle ;
- aucun fichier versionné dans les patchs committables ;
- une correction locale doit préserver toutes les fonctionnalités validées ajoutées depuis le dernier commit de référence.
