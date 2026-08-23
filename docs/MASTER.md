# BLUEFOX ODYSSEY — MASTER

## État de référence
Dernière mise à jour : 2026-08-23

### Version de travail
- Base GitHub de référence : commit `b757aa457ce5eca4a994ff8f35dcc482aca5c77f`.
- Cette base cumule les travaux validés récents : stabilisation fatigue/BAC, fondations UI tutoriel, routage Bible vers bulles/journal/50 actions, intégration P01→P04, restauration des garanties missionnelles, corrections MSC/camp récentes et correction de la double interaction missionnelle observation→collecte.
- Base PC historique : V16.20.
- Version mobile/APK précédente : V16.14, considérée obsolète.
- Développement mobile à reprendre depuis la base PC stable courante.
- Objectif : builds testables régulièrement, Web puis Android.

## Gouvernance documentaire officielle
Les seuls documents de référence officiels maintenus sont ceux listés dans `docs/README.txt` :
- `MASTER.md`
- `ARCHITECTURE_TECHNIQUE.md`
- `ROADMAP_TODO.md`
- `DEV_HISTORIQUE.md`
- `MUSIC_SYSTEM_V1.md`

Les autres DOCX/MD présents dans `docs/` sont des annexes, archives ou sources historiques et ne doivent pas être utilisés pour piloter le chantier courant.

## Architecture 3D concernée
Fichiers principaux :
- `engine/bluefox3d-core.js`
- `engine/map-registry.js`
- `engine/world-engine.js`
- `engine/object-library.js`
- `engine/object-spawner.js`
- `engine/micro-scenes.js`
- `engine/runtime-budget.js`
- `engine/special-object-runtime.js`
- `engine/save-ui-bridge.js`
- `game.js` uniquement si des réglages restent compilés ou embarqués à la racine.

## Contrat MSC validé
- CUO Lab, MAP_Test et moteur du jeu doivent restituer exactement les mêmes transformations locales enregistrées.
- `ObjectSpawner` choisit uniquement l'ancrage et la rotation globale d'une instance MSC.
- Les trois MSC coralliennes sous-marines bioluminescentes restent intégrées.
- Les rochers blanchis restent exclus de tout contexte non glace/banquise/neige/toundra.
- Les scènes déjà créées et les associations mission↔MSC déjà décidées doivent être réutilisées avant toute création nouvelle.
- Règle îlots suspendus : garantie sur `floating_islands`, les déserts à roches en lévitation et les marais à îles flottantes ; probabilité renforcée seulement sur les autres contextes magnétiques.

## Performance / RuntimeBudget
- `engine/runtime-budget.js` reste l'unique système de throttling adaptatif.
- Flore, faune, PNJ, phénomènes et objets passifs l'utilisent déjà.
- `engine/special-object-runtime.js` est raccordé au même budget.
- La logique métier à 1 Hz (respawns / drones) reste indépendante de l'animation frame par frame.

## BAC / fatigue
- La politique de survie/fatigue appartient au BAC ; l'intégration runtime matérialise les routines décidées.
- Les besoins critiques et micro-pauses sont arbitrés sans recréer un second `updateAutonomy` concurrent.
- Les pauses physiologiques doivent rester possibles même lorsqu'une mission est prioritaire.
- Le correctif stabilisé du 18 août 2026 est la référence comportementale courante pour ce domaine.

## Sauvegarde
- `MissionMemory` conserve son modèle dirty/flush.
- `save-ui-bridge.js` ne force plus `BF.progression.save()` avant la capture d'état.
- Le mécanisme de signature d'autosave peut ainsi réellement ignorer un état inchangé.
- `ProgressionRegistry` continue de sauvegarder ses vraies mutations à leur source.
- `MissionNode` sérialise déjà `distinctValues`; la validation intégrée save → reload → reprise du correctif missionnel du 23 août reste un point de preuve à rejouer.
- Règle renforcée : tout fichier modifié doit être construit depuis le fichier complet du HEAD courant ou depuis un fichier complet fourni par l'utilisateur ; jamais depuis un extrait de lecture partielle.

## Système de missions et progression
- Le Runtime missionnel V0.1 / MissionManager M2 reste la fondation fonctionnelle.
- Une action peut faire progresser plusieurs missions déjà actives.
- Un même événement ne peut révéler qu'une seule nouvelle mission.
- Mission principale et missions secondaires coexistent ; les secondaires progressent passivement.
- `MissionMemory` reste la mémoire persistante des lifecycles, faits, historiques, effets et sites.
- Le registre central de progression reste autoritaire pour les quantités d'inventaire.

### Tranche tutorielle validée P01→P04
- P01 `Reconnaître le Site du crash` : observation de la capsule, guidage UI initial et narration.
- P02 `Prélever les premiers échantillons` : plante, bois et minerai distingués par les métadonnées CUO ; le bois ne compte pas comme plante.
- P03 `Établir le premier Camp` : étude du bois, objectif 10 bois, crédit de l'inventaire déjà présent à l'activation, consommation de 10 bois et établissement de `MSC-CUSTOM-CAMP`.
- P04 `Comprendre qu’un projet peut progresser en parallèle` : objectif unique de collecte d'une ressource utile au Refuge ; progression parallèle avec `GAME-shelter`.
- `GAME-shelter` est visible/active en parallèle après P03 sous le titre `Construire un refuge`.
- Le fan-out d'une collecte vers plusieurs missions actives reste un comportement moteur générique.

### Double interaction missionnelle validée
Contrat validé au commit `b757aa457ce5eca4a994ff8f35dcc482aca5c77f` :
- sur un objet collectable, une ou plusieurs études missionnelles réellement dues peuvent précéder la collecte ;
- une instance déjà observée historiquement peut être réobservée si un nœud missionnel le demande ;
- `observer / inspecter / analyser` restent des verbes narratifs d'une même action physique `observe`;
- plusieurs nœuds différents peuvent réobserver la même instance ;
- un même nœud d'étude ne peut créditer une même instance qu'une seule fois ;
- pour les nœuds d'étude sans `distinctBy` explicite, le distinct effectif est `instanceId`;
- `distinctBy` explicite (`instanceId`, `objectId`, `none`) reste prioritaire ;
- après la dernière étude due, `collect/extract` reprend immédiatement sur la même instance ;
- fan-out observation et fan-out collecte restent génériques ;
- l'identité d'acquisition persistante reste séparée de l'identité missionnelle momentanée de l'étude ;
- annuler l'acquisition pendant une étude intermédiaire nettoie la transaction.

Validation runtime en jeu :
- T06 : observation missionnelle d'une plante puis collecte de la même instance, sans boucle ;
- `GAME-shelter / plantStudy` : plusieurs plantes distinctes sont chacune observées une fois puis collectées ; une même instance ne peut pas faire progresser plusieurs fois le même objectif 100 plantes.

### UI tutorielle validée sur P01→P04
- Les prescriptions tutoriel sont portées par les fiches missionnelles et consommées par `mission-ui-bridge.js`.
- La façade `BF.TutorialUI` reste visuelle uniquement : messages, fermeture, résolution de cible et surbrillance non destructive.
- Les aides P01→P04 utilisent une durée de 14 s lorsque spécifiée.
- L'aide caméra de P03 apparaît après 90 s d'activité de la mission et surligne la cible `camera`.
- Le message de missions parallèles apparaît lorsque T04 et `GAME-shelter` sont actives simultanément.

## Principe officiel Bible → moteur
La Bible documentaire reste la source narrative humaine et souveraine.

Chaîne officielle :

```text
BIBLE DOCUMENTAIRE
  ↓
PATRON DE MISSION
  ↓
FICHE DE MISSION PARAMÉTRÉE
  ↓
BibleRuntime
  ↓
MissionManager + ObjectEvents + BAC
  ↓
Moteur du jeu
```

Le patron porte la mécanique commune. La fiche ne contient que les paramètres propres à une mission.

### Narration Bible
- Une narration Bible ordinaire est émise par le runtime vers la bulle BlueFox et l'historique d'actions via les callbacks existants.
- Une route explicite `route: "journal"` est réservée à une entrée de journal dédiée.
- Les `thought — mission_revealed` doivent être émis une seule fois au passage réel de la mission à l'état actif, y compris lorsqu'elle sort d'une attente de prérequis.
- Les bulles narratives Bible passent par une file d'attente dédiée avec une durée calculée selon la longueur du texte ; `speechQuietUntil` empêche une parole ordinaire de les écraser avant leur fin.

### Stratégie de patrons
L'objectif n'est pas de créer un patron par mission, mais un nombre réduit de familles génériques couvrant un maximum de cas avec des interrupteurs.

Interrupteurs de référence :
- `targetBinding = instance | definition`
- `distinctMode = indifferent | unique`
- `scope = local | map | global`
- `sameTarget = true | false`
- `count` / `threshold`
- `duration` / `proximity`
- `direction`
- `contextRole = triggerContext | objectiveSubject | scenarioSupport`
- effets / délai / prérequis

Les trois familles historiques restent le socle : découvrir/comprendre ; accumuler/atteindre un seuil ; préparer→produire/débloquer. `SEQUENCE_ACTIONS` est également utilisé pour les séquences tutoriel comme P03 et `GAME-shelter`.

## CUO → missions
- Le CUO reste source de vérité de l'objet ; aucun catalogue parallèle n'est créé dans le raccord missionnel.
- `object-m0-bridge.js` peut comparer les critères missionnels aux métadonnées disponibles : `objectId`, `cuoType`, `kind`, `family`, `subject`, `category`, tags et exclusions associées.
- Le même raccord assure désormais l'insertion des études missionnelles avant acquisition et applique le distinct d'étude effectif sans créer de mémoire parallèle.
- Cette capacité permet les distinctions génériques plante/bois/minéral et prépare les futures fiches sans règle codée en dur par mission.

## Audit Bible / CUO / moteur — raccords encore ouverts
Déjà disponibles : triggers interaction/exploration/progression ; `instanceId`, `mapId`, `zoneId`, `factionId` dans les événements ; `targetBinding` au contrat ; mission instanciable par map ; `uniqueOnly` ; persistance des faits/historiques ; spawn MSC via `site.establish` ; fan-out multi-missions ; métadonnées CUO riches ; distinct par nœud/instance pour les objectifs d'étude et overrides `distinctBy`.

Raccords à compléter seulement lorsqu'une mission future les exige :
- faire suivre réellement `targetBinding=instance` jusqu'à ActionBridge ;
- agréger plusieurs maps/biomes/instances dans une mission globale ;
- généraliser le spawn MSC missionnel si nécessaire ;
- durée/proximité/délai ;
- cycle excursion→retour ;
- effets génériques de branche, réputation et faits.

## CUO / factions / réputation
- Chaque type de créature/PNJ pertinent doit porter un `speciesId` et un `factionId`.
- `cultureId` peut être porté par la MSC/instance si le contexte l'exige.
- Réputation simple attendue : agressif, neutre, friendly, friendly++.
- Ne pas recréer les PNJ : enrichir leur identité fonctionnelle.

## Ration
La brique de ration existante doit être auditée/raccordée avant toute création parallèle. La fiche `BIBLE-TUTORIAL-RATION-DISCOVERY` reste présente mais ne remplace pas le chantier de validation complet de la mécanique ration.

## Tutoriel
- P01→P04 : intégrées et validées en jeu.
- Prochaine tranche : P05→P012.
- Séquence dirigée au départ, autonomie progressive ensuite.
- Sauvegarde/reprise à valider à chaque étape.
- Le tutoriel reste le banc de validation avant industrialisation des 182 missions.

## Direction actuelle
Priorité immédiate :
1. poursuivre P05→P012 depuis le HEAD courant en conservant les comportements P01→P04 et le contrat observation→collecte validé au 23 août ;
2. n'ajouter que les raccords missionnels génériques réellement exigés par cette tranche ;
3. poursuivre factions/réputation + ration ;
4. industrialiser progressivement les 182 missions ;
5. finaliser gameplay, audio, performances et packaging.
