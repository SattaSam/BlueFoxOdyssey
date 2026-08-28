# BlueFox Odyssey — Architecture technique

Référence technique : **commit `c75fa77b2afe59a0d3dc41fc00453c3dc47a1d64` — 28 août 2026**

Ce document décrit les **propriétaires effectifs** après la passe de récupération intégrée. Il remplace les descriptions d’architecture antérieures lorsqu’elles sont en contradiction avec le HEAD.

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
| Persistance MSC | `engine/persistent-micro-scenes-v20.js` | Restaurer/persister les MSC |
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
| Progression centrale | `engine/progression-registry.js` | Registre autoritaire de progression |
| Sauvegarde globale / snapshots | `engine/save-ui-bridge.js` | Orchestration save/load ; flush des mémoires différées avant snapshot |
| Missions / lifecycle / sélection action missionnelle | `engine/mission-manager.js` | Propriétaire du cycle missionnel, primaire/secondaires, pending, choix de l’action missionnelle |
| Nettoyage lifecycle de compatibilité | `engine/mission-manager-bible-fix-v19.js` | Compatibilité/clean state ; ne doit pas recréer un propriétaire concurrent |
| Mémoire mission | `engine/mission-memory.js` | Lifecycles, faits, historique, sites |
| Planification mission | `engine/mission-planner.js` | Traduit mission en intention/action |
| Arbre / objectifs | `engine/mission-tree.js` | Structure objectifs, `distinctValues` |
| Types mission | `engine/mission-types.js` | Modèle des types/objectifs |
| Contrat Bible | `engine/bible-contract-v0-1.js` | Contrat des fiches/patrons |
| Runtime Bible | `engine/bible-runtime-v0-1-unified.js` | Interprétation, narration, effets, compteurs, completion gates ; **ne possède pas le lifecycle** |
| Validation Bible | `engine/bible-validation-v0-1.js` | Validation des données Bible |
| Patrons Bible | `data/bible-patterns.js` | Familles génériques |
| Catalogue Bible | `data/bible-catalog.js` | Fiches missionnelles |
| Exécution mission → action | `engine/action-bridge.js` | Raccord intention/action réelle |
| Événements objets | `engine/object-event-registry.js` | Normalisation événements |
| Raccord CUO → M0 | `engine/object-m0-bridge.js` | Matching générique, études dues, même instance, fan-out, identité missionnelle |
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
- `chooseRunnableMissionAction()`;
- maximum une nouvelle activation par réévaluation causale.

Aucun wrapper tardif ne doit redéfinir une shortlist concurrente d’actions missionnelles.

### BAC
Le BAC décide des besoins/opportunités comportementales. L’intégration BAC matérialise ces décisions, mais :
- elle ne remplace pas le choix missionnel de `MissionManager`;
- elle ne doit pas détourner une mission prioritaire/tutorielle par une collecte/repos sans autorisation explicite du contrat gameplay ;
- les capacités ration post-T12 restent des exceptions explicites, pas une permission générale de repos.

### BibleRuntime
`BibleRuntime` interprète les fiches, récompenses, compteurs et completion gates. Il appelle les méthodes du `MissionManager` lorsque nécessaire ; il ne remplace pas son lifecycle.

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
- 0..N études missionnelles réellement dues ;
- acquisition immédiate de la **même instance** ;
- identité d’acquisition persistante distincte de l’étude momentanée ;
- fan-out d’un ObjectEvent vers toutes les missions déjà actives compatibles ;
- unicité nœud d’étude × instance.

Le fallback `mission-runtime-integration-v19-7.js` ne devient propriétaire que lorsque ObjectM0 n’est pas disponible.

## Sauvegarde / persistance

`savе-ui-bridge.js` capture les clés `bluefox_*` après avoir demandé aux propriétaires différés de publier leur état.
Au checkpoint c75fa77 :
- `MissionMemory.flush(true)` doit être utilisé s’il existe ;
- `MapExploration.flush(true)` doit être utilisé s’il existe ;
- `ProgressionRegistry` conserve ses mutations à la source ;
- topologie, MSC, ration et autres propriétaires conservent leurs clés canoniques.

La persistance est validée seulement si le reload conserve la **signification** du gameplay, pas uniquement des octets.

## Rations

- mécanique réelle : `survival-rations-v0-3.js`;
- politique/candidat IA : `survival-rations-ai-v0-3.js`;
- fabrication autonome missionnelle : doit passer par capacités déverrouillées + propriétaire réel du craft + BAC ;
- ne jamais créer une recette/ration parallèle.

## UI

L’UI n’est jamais propriétaire du gameplay.
`game.js` conserve un état React de panneau actif ; les bridges tardifs doivent nettoyer leurs injections lorsqu’un panneau change et ne doivent pas laisser Recherche/Inventaire coexister visuellement.

## Écarts ouverts au checkpoint c75fa77

### T11 — retour autonome
Le contrat est connu et a déjà été historiquement validé, mais il n’est pas reproduit au checkpoint :
- après les collectes T11, BlueFox continue localement pour Shelter ;
- le retour physique autonome vers un abri ne prend pas la main.

Chantier dédié : **récupération différentielle du dernier cycle fonctionnel**. Ne pas inventer un nouveau moteur de retour.

### T13 — autocraft ration
La mécanique ration existe mais l’objectif T13 ne déclenche pas encore le craft autonome.
Chantier dédié : tracer génériquement :
`CRAFT → MissionPlanner/BAC → propriétaire craft → consommation → production → événement → progression`.

Aucune branche `if (missionId === "T13")`.

## Discipline de modification

- HEAD courant seule base technique ;
- décisions utilisateur récentes > anciennes traductions techniques ;
- audit producteur → propriétaire → runtime final → événement → consommateurs ;
- aucun bridge parallèle si un propriétaire existe ;
- aucun patch depuis un extrait partiel ;
- tests des wrappers réellement chargés par `index.html`;
- un symptôme sert de réfutation, pas de cible de design ;
- `hasPrimaryMissionAuthority()` n’est pas à modifier sans preuve explicite.
