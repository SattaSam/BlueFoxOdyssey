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
