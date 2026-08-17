# BlueFox Odyssey — Architecture technique

Référence : **commit `cd4a5187e40294b3f6680243af8ae9f997c392a6` — 17 août 2026**

## Sources de vérité
- Objet / métadonnées : `engine/object-library.js`
- Placement / instanciation : `engine/object-spawner.js`
- Biomes / population : `engine/biome-rules.js`
- Politique de population : `engine/biome-population-policy-r3.js`
- Micro-scènes : `engine/micro-scenes.js` + `data/custom-micro-scenes.js`
- Monde / transitions / autonomie : `engine/world-engine.js`
- Budget runtime adaptatif : `engine/runtime-budget.js`
- Objets spéciaux runtime : `engine/special-object-runtime.js`
- Sauvegarde UI / snapshot / autosave : `engine/save-ui-bridge.js`
- MissionManager : `engine/mission-manager.js`
- Mémoire mission : `engine/mission-memory.js`
- Patrons Bible : `data/bible-patterns.js`
- Catalogue Bible injecté : `data/bible-catalog.js`
- Contrat Bible : `engine/bible-contract-v0-1.js`
- Runtime Bible : `engine/bible-runtime-v0-1-unified.js`
- Exécution mission : `engine/action-bridge.js`
- Événements objets : `engine/object-event-registry.js`

## Contrat CUO → événements → missions
Le CUO ne sert pas uniquement au rendu 3D. Les définitions normalisées exposent :
- actions ;
- états ;
- familles ;
- tags ;
- connaissances ;
- recherche ;
- ressources ;
- progression ;
- rareté ;
- biomes ;
- spawn.

Ces métadonnées sont projetées dans `userData` puis réinjectées dans les événements consommés par le Runtime Bible.

## Contrat des micro-scènes CUSTOM
- CUO Lab enregistre les transformations locales.
- MAP_Test et le jeu doivent interpréter exactement les mêmes données.
- `ObjectSpawner` ne réécrit pas les pivots internes.
- Une MSC peut avoir trois rôles missionnels indépendants :
  - `triggerContext`
  - `objectiveSubject`
  - `scenarioSupport`
- Une MSC associée à une mission n'est donc pas automatiquement un objectif.
- Les trois MSC `MSC-CUSTOM-CORAILBIOLUMINESCENT1/2/3` restent intégrées pour les traitements underwater bioluminescents.
- Les transformations sauvegardées restent intouchables.

## Contrat population / îlots
- `floating_islands` : îlot suspendu garanti.
- Désert avec roches en lévitation : îlot suspendu garanti.
- Marais avec îles flottantes : îlot suspendu garanti.
- Autres contextes magnétiques : probabilité renforcée, sans garantie générale.
- Les cartes tutoriel / départ restent protégées par leurs règles existantes.

## RuntimeBudget
`engine/runtime-budget.js` est l'unique budget adaptatif de runtime.

Principes :
- cadence modulée par distance ;
- adaptation au niveau de performance / FPS ;
- quotas par catégorie et par frame ;
- anti-starvation intégré.

Catégories existantes réutilisées :
- `passive`
- `npc`
- `fauna`
- `flora`
- `phenomenon`

`engine/special-object-runtime.js` ne crée aucun second système :
- `npc_translucent`, `npc_rocky` → `npc`
- `nocturnal_animal` → `fauna`
- `carnivorous_plant` → `flora`
- autres objets spéciaux animés → `phenomenon`

Le second passage à 1 Hz pour respawns et drones reste logique métier et n'est pas remplacé par le RuntimeBudget.

## Sauvegarde / dirty-state
Chaîne d'autosave :
```text
persistRuntime()
→ captureState()
→ stateSignature()
→ comparaison à lastAutoStateSignature
→ écriture seulement si nécessaire
```

Règle :
- `persistRuntime()` ne doit pas produire artificiellement un changement d'état.
- `BF.progression.save()` ne doit donc pas être appelé par ce pré-flush, car `ProgressionRegistry.save()` met à jour `updatedAt`.
- Les vraies mutations du registre de progression se sauvegardent déjà à leur source.
- `MissionMemory` conserve son mécanisme dirty/flush.

## Discipline de modification de fichiers
Règle renforcée après l'incident du 17 août 2026 :
- toujours partir du fichier complet du HEAD courant ;
- ou du fichier complet explicitement fourni par l'utilisateur ;
- ne jamais reconstruire un fichier destiné au dépôt à partir d'un extrait de lecture partielle ;
- vérifier le diff exact avant livraison ;
- un fichier modifié doit conserver tout le contenu hors lignes réellement visées ;
- aucun bridge parallèle ou fichier versionné ne doit être créé pour un correctif local.

## Contrat missionnel actuel
Le moteur possède déjà :
- missions simultanément actives ;
- mission primaire / secondaires ;
- prérequis ;
- persistance ;
- séquences d'objectifs ;
- triggers interaction, mouvement, exploration et progression ;
- filtres `objectId`, `family`, `subject`, `mapId`, `zoneId`, `biome`, tags ;
- `uniqueOnly` sur les triggers ;
- `targetBinding = instance | definition` dans le contrat ;
- mission instanciable par map ;
- fan-out passif d'une action vers plusieurs missions actives.

### Ciblage exact d'instance
Le Runtime mémorise `instanceId` et le contrat autorise `targetBinding=instance`, mais l'ActionBridge doit garantir que la cible choisie est précisément cette instance.

Chaîne visée :
```text
bibleTarget.instanceId
→ MissionPlanner
→ ActionBridge
→ candidat interactable exact
```

### Distinction sur objectifs actifs
Extension requise :
- `distinctBy: instanceId`
- `distinctBy: mapId`
- `distinctBy: biomeId`
- `distinctBy: speciesId`

avec mémoire persistante des valeurs déjà comptées.

### Portée
Paramètre commun recommandé :
- `local`
- `map`
- `global`

### Spawn MSC missionnel
L'infrastructure `site.establish` reste la preuve de chaîne :
```text
mission effect
→ placement
→ ObjectSpawner.spawnMicroScene()
→ rattachement map
→ persistance
→ restauration
```

À généraliser en effet de type `microScene.spawn` si nécessaire pendant l'intégration P01→P012.

## Non-régression
Tout correctif missionnel doit préserver :
- un événement révèle au plus une mission ;
- une action peut progresser plusieurs missions actives ;
- commandes joueur prioritaires ;
- MSC identiques entre CUO Lab / MAP_Test / jeu ;
- camps jamais spontanés ;
- navigation persistante ;
- aucune logique objet dans `map-registry.js` ;
- aucun second système de throttling ;
- aucun faux dirty-state provoqué par l'autosave ;
- aucun fichier complet reconstruit depuis un extrait partiel.
