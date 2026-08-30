# BlueFox Odyssey — Addendum gameplay opérationnel — 28 août 2026

Complète le Contrat Gameplay Opérationnel V2 au checkpoint `c75fa77`.

## Architecture gameplay effective
- lifecycle / choix missionnel : `mission-manager.js`
- planification : `mission-planner.js`
- exécution mission : `action-bridge.js`
- CUO / même instance / fan-out : `object-m0-bridge.js`
- BAC : `behavior-arbitration-core.js` + `behavior-arbitration-integration.js`
- monde / transitions / directive joueur : `world-engine.js`
- chemins : `path-planner.js` + `character-controller.js`
- Bible : `bible-runtime-v0-1-unified.js`
- sauvegarde : `save-ui-bridge.js`
- ration mécanique : `survival-rations-v0-3.js`
- IA ration : `survival-rations-ai-v0-3.js`

## Navigation joueur
Règle B validée : la suggestion est persistée immédiatement, n’interrompt pas l’action atomique, puis prend la main avant toute nouvelle décision.

## Tutoriel
- T11 : contrat inchangé, retour physique autonome encore NON VALIDÉ au checkpoint.
- T13 : contrat inchangé, autocraft de 10 rations encore NON VALIDÉ au checkpoint.
- Le checkpoint n’est donc pas une validation complète T01→T13.


---

## Addendum de reprise — 30 août 2026

### Survie — représentation et décision
Le propriétaire reste `survival-ai-bridge.js`.

Le calcul courant de l’énergie agrégée est :
`energy = 0,55 × rest + 0,32 × food + 0,13 × safety`.

Règles à préserver lors du prochain chantier :
- `rest`, `food` et `safety` restent des composantes distinctes ;
- l’énergie affichée ne doit pas devenir un deuxième état autoritaire ;
- une amélioration de lisibilité doit refléter les valeurs réellement utilisées par Survival/BAC ;
- le lissage demandé concerne la cohérence d’évolution des composantes, pas leur fusion ;
- le seuil de micro-pause préventive ne doit être modifié qu’après preuve runtime.

### Missions / BAC — autorité
Contrat inchangé :
- `MissionManager` possède la sélection missionnelle ;
- BAC ne doit pas détourner une mission prioritaire lorsqu’une action missionnelle doit prendre la main ;
- un temps de réflexion/attente n’autorise pas à créer un second propriétaire missionnel.

Point ouvert à diagnostiquer :
des observations runtime montrent des actions locales aléatoires alors que plusieurs missions restent actives. Le prochain chantier doit identifier l’état exact de la primaire, des secondaires et des temporisations avant toute correction.

### Performance
Le `RuntimeBudget` reste l’unique système de throttling adaptatif.
Le prochain chantier doit mesurer avant de modifier :
- scans BAC des interactables et de l’historique ObjectEvents ;
- calculs de coûts de route et portée effective du cache d’approche ;
- planification de voyage missionnelle répétée ;
- politique ration après T12/T13 ;
- timers/observers existants.

Aucun nouveau budget CPU, cache global ou bridge de performance ne doit être ajouté sans preuve que les propriétaires actuels ne peuvent pas porter le correctif.
