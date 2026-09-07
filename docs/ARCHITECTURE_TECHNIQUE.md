# BlueFox Odyssey — Architecture technique

Référence technique : **commit `1f20ba014686f5f6eadac78a22b89077bca8e380` — 8 septembre 2026**

Ce document décrit les **propriétaires effectifs** du HEAD courant. Il remplace les descriptions d’architecture antérieures lorsqu’elles sont en contradiction avec le HEAD ou avec une validation runtime plus récente.

## Registre canonique des propriétaires

| Domaine | Propriétaire canonique | Rôle / règle |
| --- | --- | --- |
| Objet / métadonnées CUO | `engine/object-library.js` | Source de vérité des objets |
| Placement / instanciation | `engine/object-spawner.js` | Placement global, spawn objets/MSC |
| Biomes | `engine/biome-rules.js` | Règles de biome |
| Politique de population | `engine/biome-population-policy-r3.js` | Pondérations, exclusions, population |
| Hiérarchie de population | `engine/map-population-hierarchy.js` | Organisation des niveaux de population |
| Génération de map | `engine/map-generator.js` + `engine/map-generation-rules.js` | Génération structurelle des maps |
| Prescription Bible des maps | `engine/bible-map-prescription-v19.js` | Prescriptions / excursions / contraintes de map ; pas un second exécuteur du retour connu |
| Application prescriptions Bible au générateur | `engine/map-generator-bible-overrides-v19.js` | Traduit/applique les prescriptions |
| Exploration Bible / monde | `engine/bible-exploration-world-v19.js` | Règles exploration issues de la Bible |
| Exploration Bible / MSC | `engine/bible-exploration-micro-scenes-v19.js` | Liaison exploration Bible ↔ MSC |
| Micro-scènes | `engine/micro-scenes.js` | Orchestration MSC |
| Données MSC custom | `data/custom-micro-scenes.js` | Compositions MSC enregistrées |
| Persistance MSC générique | `engine/persistent-micro-scenes-v20.js` | Restaurer/persister les MSC génériques |
| Sites missionnels / constructions | `engine/bible-runtime-v0-1-unified.js` | Effets de construction, rendu site, persistance de stade, retrait atomique du stade précédent ; sans posséder le lifecycle |
| Monde / transitions / autonomie exécutée | `engine/world-engine.js` | État du monde, transitions, autonomie exécutée, navigation et directive joueur persistante |
| Topologie monde | `engine/world-topology-v3.js` | Graphe/topologie des maps |
| Persistance topologie | `engine/topology-persistence-bridge.js` | Sauvegarde/restauration topologie |
| Menu planète / topologie UI | `engine/planet-topology-ui.js` | Représentation topologique dans l’UI |
| Globe planète | `engine/planet-globe-ui.js` | Rendu/interactions globe |
| Caméra | `engine/camera-controller.js` | Propriétaire principal caméra |
| Regard caméra étendu | `engine/camera-extended-look.js` | Extension du contrôleur |
| Déplacement BlueFox | `engine/character-controller.js` | Mouvement personnage ; signale `bluefox:navigation-failed` |
| Navigation / chemins | `engine/path-planner.js` | Calcul/planification ; absence de chemin = échec, jamais cible directe forcée |
| Arbitrage comportemental BAC | `engine/behavior-arbitration-core.js` | Décision comportementale |
| Intégration BAC au jeu | `engine/behavior-arbitration-integration.js` | Raccord BAC ↔ runtime ; ne remplace pas le choix missionnel propriétaire de MissionManager |
| Budget CPU | `engine/runtime-budget.js` | Unique système de throttling adaptatif |
| Progression centrale | `engine/progression-registry.js` | Registre autoritaire de progression / inventaires canoniques |
| Sauvegarde globale / snapshots | `engine/save-ui-bridge.js` | Orchestration save/load ; flush des mémoires différées avant snapshot |
| Missions / lifecycle / sélection action missionnelle | `engine/mission-manager.js` | Propriétaire du cycle missionnel, primaire/secondaires, pending, choix de l’action missionnelle et réarmement générique des missions explicitement repeatable |
| Nettoyage lifecycle de compatibilité | `engine/mission-manager-bible-fix-v19.js` | Compatibilité/clean state ; ne doit pas recréer un propriétaire concurrent |
| Mémoire mission | `engine/mission-memory.js` | Lifecycles, faits, historique, sites |
| Planification mission | `engine/mission-planner.js` | Traduit mission en intention/action ; équilibre la progression par ratio |
| Arbre / objectifs | `engine/mission-tree.js` | Structure objectifs, `distinctValues` |
| Types mission | `engine/mission-types.js` | Modèle des types/objectifs |
| Contrat Bible | `engine/bible-contract-v0-1.js` | Contrat des fiches/patrons |
| Runtime Bible | `engine/bible-runtime-v0-1-unified.js` | Interprétation, narration, effets, compteurs, completion gates, constructions/sites et conditions répétables déclaratives ; ne possède pas le lifecycle |
| Validation Bible | `engine/bible-validation-v0-1.js` | Validation des données Bible |
| Patrons Bible | `data/bible-patterns.js` | Familles génériques |
| Catalogue Bible | `data/bible-catalog.js` | Fiches missionnelles |
| Exécution mission → action | `engine/action-bridge.js` | Raccord intention/action réelle |
| Événements objets | `engine/object-event-registry.js` | Normalisation événements |
| Raccord CUO → M0 | `engine/object-m0-bridge.js` | Matching générique, `subject`, études dues, même instance, fan-out, identité missionnelle |
| Arbitrage cible mission | `engine/mission-target-arbitration-v19-12.js` | Choix/priorité de cible |
| Intégration runtime missions | `engine/mission-runtime-integration-v19-7.js` | Fallback de compatibilité ; ObjectM0 reste prioritaire lorsqu’il est actif |
| UI missions / tutoriel | `engine/mission-ui-bridge.js` | Affichage/guidage uniquement |
| Inventaire UI | `engine/inventory-ui-bridge.js` | Raccord UI inventaire |
| Nettoyage UI inventaire | `engine/inventory-ui-clean-v0-2.js` | Nettoyage visuel ; aucune sémantique gameplay |
| UI générale / Planète / Recherche / Journal | `engine/ui-enhancements.js` | Extensions UI ; ne possède pas le gameplay |
| Réglages UI | `engine/settings-ui-bridge.js` | UI/réglages ; ne doit pas réécrire l’autonomie métier |
| Survie / IA | `engine/survival-ai-bridge.js` | État survie / décisions de besoin |
| Rations | `engine/survival-rations-v0-3.js` | Mécanique réelle ration |
| IA ration | `engine/survival-rations-ai-v0-3.js` | Candidats collecte/craft/consommation sous capacités et BAC |
| Réglages survie | `engine/survival-tuning-r3.js` | Tuning uniquement |
| Runtime objets spéciaux / drones | `engine/special-object-runtime.js` | Drones scout/harvest, comportements et événements réels ; toute future console joueur doit le consommer, pas le dupliquer |
| Musique adaptative | `engine/adaptive-music-engine-v1.js` | Unique moteur musical |
| Raccord musique ↔ gameplay | `engine/adaptive-music-gameplay-bridge-v1.js` | Contexte gameplay/BAC |
| UI musique | `engine/adaptive-music-ui-v1.js` | Volumes/UI |
| `map-registry.js` | **PROTÉGÉ** | Aucun ajout de logique objet/population/mission |

## Contrat d’autorité runtime

### MissionManager
`MissionManager` est l’unique propriétaire du lifecycle et du choix missionnel :
- active / pending / completed ;
- mission principale et secondaires ;
- sélection canonique de la primaire ;
- `chooseRunnableMissionAction()` ;
- maximum une nouvelle activation par réévaluation causale ;
- `rearmRepeatableMission()` uniquement pour une mission dont la définition déclare explicitement `repeatable`.

Aucun wrapper tardif ne doit redéfinir une shortlist concurrente d’actions missionnelles.

### BAC
Le BAC décide des besoins/opportunités comportementales. L’intégration BAC matérialise ces décisions, mais :
- elle ne remplace pas le choix missionnel de `MissionManager` ;
- elle ne doit pas détourner une mission prioritaire/tutorielle par une collecte/repos sans autorisation explicite ;
- les candidats missionnels de construction peuvent utiliser le mécanisme de pondération existant, sans deuxième moteur de sélection.

### BibleRuntime
`BibleRuntime` interprète les fiches, récompenses, compteurs, effets, completion gates, opportunités répétables déclaratives et sites de construction.
Il appelle les méthodes du `MissionManager` lorsque nécessaire ; il ne remplace jamais son lifecycle.

Pour une construction missionnelle, il est propriétaire de la chaîne :
`objectifs complets → stock physique disponible → placement → spawn → consommation → persistance site → preuve de finalisation`.

Règles durables :
- progression historique d’un objectif ≠ stock physique courant ;
- un slot déclaré stock-backed reflète le stock courant et peut redescendre si le stock baisse avant finalisation ;
- la réconciliation du stock se fait sur événements d’inventaire pertinents, jamais par polling parallèle ;
- le spawn est tenté avant toute consommation ;
- un échec de spawn ne consomme rien et ne remplace pas le site précédent ;
- la consommation et les effets sont idempotents ;
- la preuve de finalisation d’une construction repose sur le site réellement établi par la mission (`kind` + `missionId`), pas sur un matching générique du nom d’un objet de scène.

## Placement canonique des constructions

Lorsqu’un preset existe dans `crashSite.campSitePlacements`, il est autoritaire dès le premier spawn :
- position et rotation sont reprises exactement ;
- `autonomousPlacement()` ne doit pas recalculer ce placement ;
- `sitePlacementValid()` générique ne doit pas veto un overlap intentionnel du preset.

Presets validés sur `crystal` :
- Camp : `x=6.174798, y=0.25, z=3.249376` ;
- Refuge : `x=-0.4399, y=0.25, z=4.9833` ;
- Base renforcée : `x=-2.7567, y=0.25, z=4.768`.

L’Établi suit un autre contrat :
- aucun preset fixe ;
- `WORKBENCH@crystal` utilise un placement joueur explicite ;
- l’anchor et la rotation réellement choisis sont persistés ;
- les futures missions « retour à l’établi » doivent cibler ce site persistant, jamais une coordonnée codée en dur.

## Transition de stade Refuge → Base renforcée

La Base renforcée utilise `MSC-CUSTOM-CAMP-BASE-REINFORCED`.

Contrat :
1. Camp conservé ;
2. Refuge autonome conservé tant que la nouvelle Base n’a pas réellement réussi ;
3. Base renforcée spawn ;
4. ressources consommées ;
5. site Base persisté ;
6. Refuge autonome retiré de la scène, de ses colliders et de `sites.refuge` ;
7. reload final : Camp + Base renforcée.

## Progression / inventaire

`ProgressionRegistry` reste propriétaire du stock physique.

`grantInventory()` est la primitive canonique permettant un crédit physique sans simuler une collecte historique.
Elle :
- incrémente l’inventaire ;
- sauvegarde ;
- publie le changement d’inventaire ;
- n’émet pas artificiellement `RESOURCE_COLLECTED`.

La réserve abandonnée est le premier consommateur validé de ce contrat.

Le reliquat encore présent dans une réserve du monde n’appartient pas à ProgressionRegistry :
- réserve monde / reliquat → fait persistant missionnel / BibleRuntime + MissionMemory ;
- ressources réellement emportées → ProgressionRegistry.

## Navigation et directive joueur

Propriétaire : `WorldEngine`.

Règle B validée :
1. suggestion joueur mémorisée immédiatement ;
2. action atomique courante non interrompue ;
3. directive reprise avant nouvelle planification missionnelle/BAC ;
4. persistance `bluefox_navigation_intent_v1` ;
5. suppression uniquement sur réalisation, remplacement ou annulation explicite.

## CUO / même instance / fan-out

`object-m0-bridge.js` reste propriétaire du raccord générique :
- critères `objectId`, `cuoType`, `kind`, `family`, `subject`, `category`, tags/exclusions ;
- matching `subject:mineral` résolu par métadonnées canoniques ;
- 0..N études réellement dues ;
- acquisition immédiate de la même instance ;
- identité persistante ;
- fan-out vers toutes les missions actives compatibles ;
- unicité nœud d’étude × instance.

## Sauvegarde / persistance

`save-ui-bridge.js` capture les clés `bluefox_*` après flush des propriétaires différés.
La persistance est validée si le reload conserve la signification du gameplay.

Pour les constructions Bible, `siteProgression` conserve le site courant.
Le WORKBENCH doit survivre au reload avec son anchor réel.

## Rations

- mécanique réelle : `survival-rations-v0-3.js` ;
- politique IA : `survival-rations-ai-v0-3.js` ;
- ne jamais créer une recette/ration parallèle.

## Drones — état et contrainte future

Le runtime réel scout/harvest existe dans `special-object-runtime.js`.

La future console drone :
- doit vivre côté Recherche/UI ;
- doit consommer les primitives runtime existantes ;
- ne doit créer ni second runtime drone ni nouveau registre ;
- doit préserver les événements canoniques, notamment `DRONE_ACTIVATED` et `OBJECT_SEEN`.

ENE-13 reste current-map only tant qu’un chantier inter-map dédié n’est pas validé.

## Kit d’expédition — état et contrainte future

Le Kit actuel est encore spécialisé sur les rations.

La future généralisation doit :
- représenter les objets fabriqués transportables réellement possédés ;
- accueillir l’accumulateur comme premier nouveau consommateur ;
- permettre plus tard des objets activables comme une balise ;
- laisser l’activation au propriétaire de l’objet ;
- ne jamais devenir un moteur gameplay parallèle.

## Journal évolutif — état et contrat futur

Le HEAD possède déjà une synthèse d’évolution dans `ui-enhancements.js`, mais le calcul reste couplé aux scans UI.

Contrat utilisateur à appliquer :
- calcul de la synthèse uniquement à l’ouverture du Journal ;
- aucune reconstruction à chaque événement missionnel ;
- persistance des briques précédentes ;
- une branche sans évolution majeure reste textuellement identique ;
- seules les branches ayant réellement progressé sont enrichies ;
- plus une branche est développée, plus sa brique peut devenir riche, mais le résultat final ne conserve que l’essentiel ;
- aucun polling supplémentaire.

## Chantiers architecturaux encore ouverts

Suivis uniquement dans `ROADMAP_TODO.md`.

Immédiats :
- ENE-11→14 ;
- console drone joueur dans Recherche ;
- Kit d’expédition générique ;
- Journal évolutif lazy/persistant.

De fond :
- CPU / cadence décisionnelle ;
- autorité missionnelle / continuité d’activité ;
- cohérence Survival énergie/repos/alimentation ;
- validation complète IMI `REVEAL-ONLY / SAME-DEFINITION / SAME-INSTANCE`.

T13, Shelter/Base, GAME Civilisation/Engineering et WORKBENCH ne sont plus des écarts ouverts.

## Discipline de modification

- HEAD courant seule base technique ;
- décisions utilisateur récentes > anciennes traductions techniques ;
- audit producteur → propriétaire → runtime final → événement → consommateurs ;
- aucun bridge parallèle si un propriétaire existe ;
- aucun patch depuis un extrait partiel ;
- BASE partielle exacte limitée au périmètre, jamais reconstruction du dépôt complet ;
- tests des wrappers réellement chargés par `index.html` ;
- `map-registry.js` protégé ;
- un symptôme sert de réfutation, pas de cible de design.
