# BlueFox Odyssey — Architecture technique

Référence technique : **commit `8b34d8912667f02140c0c2999b1dfa3f37a8e9ee` — 2 septembre 2026**

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
| Prescription Bible des maps | `engine/bible-map-prescription-v19.js` | Prescriptions / excursions / contraintes de map ; **pas un second exécuteur du retour connu** |
| Application prescriptions Bible au générateur | `engine/map-generator-bible-overrides-v19.js` | Traduit/applique les prescriptions |
| Exploration Bible / monde | `engine/bible-exploration-world-v19.js` | Règles exploration issues de la Bible |
| Exploration Bible / MSC | `engine/bible-exploration-micro-scenes-v19.js` | Liaison exploration Bible ↔ MSC |
| Micro-scènes | `engine/micro-scenes.js` | Orchestration MSC |
| Données MSC custom | `data/custom-micro-scenes.js` | Compositions MSC enregistrées |
| Persistance MSC générique | `engine/persistent-micro-scenes-v20.js` | Restaurer/persister les MSC génériques |
| Sites missionnels / constructions | `engine/bible-runtime-v0-1-unified.js` | Effets de construction, rendu site, persistance de stade, retrait atomique du stade précédent ; **sans posséder le lifecycle** |
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
| Intégration BAC au jeu | `engine/behavior-arbitration-integration.js` | Raccord BAC ↔ runtime ; **ne remplace pas le choix missionnel propriétaire de MissionManager** |
| Budget CPU | `engine/runtime-budget.js` | Unique système de throttling adaptatif |
| Progression centrale | `engine/progression-registry.js` | Registre autoritaire de progression / inventaires canoniques |
| Sauvegarde globale / snapshots | `engine/save-ui-bridge.js` | Orchestration save/load ; flush des mémoires différées avant snapshot |
| Missions / lifecycle / sélection action missionnelle | `engine/mission-manager.js` | Propriétaire du cycle missionnel, primaire/secondaires, pending, choix de l’action missionnelle |
| Nettoyage lifecycle de compatibilité | `engine/mission-manager-bible-fix-v19.js` | Compatibilité/clean state ; ne doit pas recréer un propriétaire concurrent |
| Mémoire mission | `engine/mission-memory.js` | Lifecycles, faits, historique, sites |
| Planification mission | `engine/mission-planner.js` | Traduit mission en intention/action ; équilibre la progression par ratio |
| Arbre / objectifs | `engine/mission-tree.js` | Structure objectifs, `distinctValues` |
| Types mission | `engine/mission-types.js` | Modèle des types/objectifs |
| Contrat Bible | `engine/bible-contract-v0-1.js` | Contrat des fiches/patrons |
| Runtime Bible | `engine/bible-runtime-v0-1-unified.js` | Interprétation, narration, effets, compteurs, completion gates, constructions/sites ; **ne possède pas le lifecycle** |
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
| UI générale / Planète / Recherche | `engine/ui-enhancements.js` | Extensions UI ; ne possède pas le gameplay |
| Réglages UI | `engine/settings-ui-bridge.js` | UI/réglages ; ne doit pas réécrire l’autonomie métier |
| Survie / IA | `engine/survival-ai-bridge.js` | État survie / décisions de besoin |
| Rations | `engine/survival-rations-v0-3.js` | Mécanique réelle ration |
| IA ration | `engine/survival-rations-ai-v0-3.js` | Candidats collecte/craft/consommation sous capacités et BAC |
| Réglages survie | `engine/survival-tuning-r3.js` | Tuning uniquement |
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
- maximum une nouvelle activation par réévaluation causale.

Aucun wrapper tardif ne doit redéfinir une shortlist concurrente d’actions missionnelles.

### BAC
Le BAC décide des besoins/opportunités comportementales. L’intégration BAC matérialise ces décisions, mais :
- elle ne remplace pas le choix missionnel de `MissionManager` ;
- elle ne doit pas détourner une mission prioritaire/tutorielle par une collecte/repos sans autorisation explicite ;
- les candidats missionnels de construction peuvent utiliser le mécanisme de pondération existant, sans deuxième moteur de sélection.

### BibleRuntime
`BibleRuntime` interprète les fiches, récompenses, compteurs, effets, completion gates et sites de construction.
Il appelle les méthodes du `MissionManager` lorsque nécessaire ; il ne remplace jamais son lifecycle.

Pour une construction missionnelle, il est propriétaire de la chaîne :
`objectifs complets → stock physique disponible → placement → spawn → consommation → persistance site → preuve de finalisation`.

Règles durables :
- progression historique d’un objectif ≠ stock physique courant ;
- un manque de stock réarme la finalisation sur événements d’inventaire pertinents, sans polling parallèle ;
- le spawn est tenté avant toute consommation ;
- un échec de spawn ne consomme rien et ne remplace pas le site précédent ;
- la consommation et les effets sont idempotents ;
- la preuve de finalisation d’une construction repose sur le site réellement établi par la mission (`kind` + `missionId`), pas sur un matching générique du nom d’un objet de scène.

## Placement canonique des constructions

Lorsqu’un preset existe dans `crashSite.campSitePlacements`, il est **autoritaire** dès le premier spawn :
- position et rotation sont reprises exactement ;
- `autonomousPlacement()` ne doit pas recalculer ce placement ;
- `sitePlacementValid()` générique ne doit pas veto un overlap intentionnel du preset.

`autonomousPlacement()` reste uniquement le fallback des constructions sans preset canonique.

Presets validés sur `crystal` :
- Camp : `x=6.174798, y=0.25, z=3.249376` ;
- Refuge : `x=-0.4399, y=0.25, z=4.9833` ;
- Base renforcée : `x=-2.7567, y=0.25, z=4.768`.

## Transition de stade Refuge → Base renforcée

La Base renforcée utilise `MSC-CUSTOM-CAMP-BASE-REINFORCED`, qui embarque elle-même la composition Refuge nécessaire.

Contrat de transition validé :
1. Camp conservé ;
2. Refuge autonome conservé tant que la nouvelle Base n’a pas réellement réussi ;
3. Base renforcée spawn ;
4. ressources consommées ;
5. site Base persisté ;
6. Refuge autonome retiré de la scène, de ses colliders et de `sites.refuge` ;
7. reload final : Camp + Base renforcée, sans réapparition du Refuge autonome.

Le retrait du stade précédent est donc **postérieur au succès du nouveau stade**. Il ne doit jamais précéder le spawn/consommation/persistance réussis.

## Navigation et directive joueur

Propriétaire : `WorldEngine`.

Règle B validée :
1. la suggestion joueur de changement de map est mémorisée immédiatement ;
2. elle n’interrompt pas l’action atomique déjà engagée ;
3. dès cette action terminée, elle est reprise **avant toute nouvelle planification missionnelle ou décision BAC** ;
4. elle est persistée (`bluefox_navigation_intent_v1`) et doit survivre au reload ;
5. elle est supprimée uniquement sur réalisation, remplacement ou annulation explicite.

La navigation inconnue reste limitée à un seul passage lorsqu’elle est explicitement demandée.

## Contrat chemins / obstacles

`PathPlanner` doit retourner un vrai chemin ou aucun chemin.
`CharacterController` :
- ne transforme pas l’absence de chemin en déplacement direct vers la cible ;
- arrête le déplacement et émet `bluefox:navigation-failed` ;
- conserve le mécanisme de replanification pour les blocages apparus pendant un chemin valide.

Le traveling d’intro et les paramètres de locomotion ne sont pas des variables de correction implicites : toute modification exige une preuve dédiée.

## CUO / même instance / fan-out

`object-m0-bridge.js` reste propriétaire du raccord générique :
- critères `objectId`, `cuoType`, `kind`, `family`, `subject`, `category`, tags/exclusions ;
- le matching `subject:mineral` est résolu par les métadonnées canoniques, pas par une branche par mission ;
- 0..N études missionnelles réellement dues ;
- acquisition immédiate de la **même instance** ;
- identité d’acquisition persistante distincte de l’étude momentanée ;
- fan-out d’un ObjectEvent vers toutes les missions déjà actives compatibles ;
- unicité nœud d’étude × instance.

Le fallback `mission-runtime-integration-v19-7.js` ne devient propriétaire que lorsque ObjectM0 n’est pas disponible.

## Sauvegarde / persistance

`save-ui-bridge.js` capture les clés `bluefox_*` après avoir demandé aux propriétaires différés de publier leur état.
- `MissionMemory.flush(true)` doit être utilisé s’il existe ;
- `MapExploration.flush(true)` doit être utilisé s’il existe ;
- `ProgressionRegistry` conserve ses mutations à la source ;
- topologie, MSC, ration et autres propriétaires conservent leurs clés canoniques.

Pour les constructions Bible, `BibleRuntime` conserve la signification du stade courant via `siteProgression`.
Une suppression de stade précédent doit être persistée afin qu’un reload ne le recrée pas.

La persistance est validée seulement si le reload conserve la **signification** du gameplay, pas uniquement des octets.

Aucune migration automatique de vieux bindings de mission rejetée au runtime ne doit être réintroduite sans preuve complète.

## Rations

- mécanique réelle : `survival-rations-v0-3.js` ;
- politique/candidat IA : `survival-rations-ai-v0-3.js` ;
- fabrication autonome missionnelle : capacités déverrouillées + propriétaire réel du craft + BAC ;
- ne jamais créer une recette/ration parallèle.

La chaîne T13 de craft/excursion a été validée en jeu ; elle n’est plus un écart architectural ouvert.

## UI

L’UI n’est jamais propriétaire du gameplay.
`game.js` conserve un état React de panneau actif ; les bridges tardifs doivent masquer/nettoyer leurs injections sans retirer des nœuds que React considère encore comme siens.

## Chantiers architecturaux encore ouverts

Les écarts actifs sont suivis uniquement dans `ROADMAP_TODO.md`.

Les principaux axes actuellement ouverts sont :
- CPU / cadence décisionnelle ;
- autorité missionnelle / continuité d’activité ;
- cohérence Survival énergie/repos/alimentation ;
- validation complète du contrat IMI `REVEAL-ONLY / SAME-DEFINITION / SAME-INSTANCE` sur les consommateurs réels.

T13 n’est plus un écart ouvert.
Shelter/Base renforcée est considéré validé au HEAD de référence.

## Discipline de modification

- HEAD courant seule base technique ;
- décisions utilisateur récentes > anciennes traductions techniques ;
- audit producteur → propriétaire → runtime final → événement → consommateurs ;
- aucun bridge parallèle si un propriétaire existe ;
- aucun patch depuis un extrait partiel ;
- tests des wrappers réellement chargés par `index.html` ;
- un symptôme sert de réfutation, pas de cible de design ;
- `hasPrimaryMissionAuthority()` n’est pas à modifier sans preuve explicite ;
- un nouveau stade de site ne peut retirer l’ancien qu’après succès prouvé du nouveau.
