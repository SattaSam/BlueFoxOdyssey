# BlueFox Odyssey — Addendum gameplay opérationnel

Ce document complète les contrats gameplay historiques. Les sections ci-dessous consolident les règles toujours applicables au **11 septembre 2026**, sur la base du HEAD `296c048c0846198bf6326924ea4d3a9483907f68`.

## Architecture gameplay effective

- lifecycle / choix missionnel : `mission-manager.js`
- planification : `mission-planner.js`
- exécution : `action-bridge.js`
- CUO / même-instance / fan-out : `object-m0-bridge.js`
- contexte MSC : `context-msc-bridge.js`
- Bible : `bible-runtime-v0-1-unified.js`
- BAC : `behavior-arbitration-core.js` + `behavior-arbitration-integration.js`
- monde / transitions : `world-engine.js`
- chemins : `path-planner.js` + `character-controller.js`
- progression / inventaire : `progression-registry.js`
- objets spéciaux / drones / balise : `special-object-runtime.js`
- sauvegarde : `save-ui-bridge.js`
- Journal UI : `ui-enhancements.js`
- ration mécanique : `survival-rations-v0-3.js`
- IA ration : `survival-rations-ai-v0-3.js`

## Navigation joueur

Règle B :
- suggestion persistée immédiatement ;
- action atomique non interrompue ;
- directive reprise avant nouvelle décision ;
- persistance au reload.

## Addendum — runnabilité missionnelle R-STAB

Une mission peut être active et primary sans être localement runnable.

Règles :
- une feuille géographiquement distante ne produit pas de fausse action locale ;
- `requiredMapFact`, cible missionnelle mémorisée, completion gate et TRAVEL explicite peuvent déclencher une transition canonique ;
- si une transition n’est pas exécutable, elle ne doit pas conserver l’autorité exclusive ;
- une secondaire locale runnable peut être exécutée avant départ si le contrat l’autorise ;
- après disparition de cette opportunité, la transition primaire reprend ;
- une primaire active mais stérile ne doit pas immobiliser BlueFox ;
- les retries sont réveillés causalement, sans polling.

## Addendum — triggers différés

Lorsqu’un événement ponctuel arrive avant la complétion d’un prérequis lifecycle, le runtime peut en mémoriser le contexte et déléguer l’activation différée à MissionManager.

Interdit :
- créditer rétroactivement un compteur `count > 1` avec des événements antérieurs au prérequis ;
- créer une seconde file d’activation parallèle.

## Addendum — CUO / ObjectM0

Relations IMI :
- `REVEAL-ONLY`
- `SAME-DEFINITION`
- `SAME-INSTANCE`

`cuoTypes` est un filtre OR optionnel ajouté chirurgicalement pour les missions nécessitant un ensemble explicite de types. Il reste cumulatif avec les autres filtres et ne remplace pas `cuoType`.

Observer / inspecter / analyser restent des nuances d’une même étude physique quand le CUO le prévoit.

## Addendum — ENE / balise / drones

ENE-11→14 est industrialisé :
- accumulateur fabriqué à l’établi ;
- consommation réelle des ressources ;
- machine abandonnée alimentée par consommation d’un accumulateur ;
- Scout existant réutilisé ;
- mesures énergétiques multi-map et calibration Giant Tree.

Balise :
- runtime réel dans `special-object-runtime.js`;
- BAL-01→03 consomme les primitives existantes ;
- le Kit transporte, mais ne devient pas propriétaire de l’activation.

Drones :
- DRN-01→04 formalise Scout/Harvest et le réseau ;
- la console joueur reste côté Recherche ;
- la récolte distante et le cargo utilisent le runtime existant ;
- `OBJECT_SEEN` produit l’historique global d’observation du Scout ;
- le Scout ne progresse pas silencieusement des observations missionnelles ordinaires non explicitement prévues.

## Addendum — Journal

La consolidation du Journal est lazy :
- déclenchement uniquement à l’ouverture ;
- aucune consolidation du seul fait d’un scan/mutation DOM ;
- une ouverture ne consolide qu’une fois ;
- les briques persistent ;
- une branche sans évolution majeure reste stable ;
- aucun polling.

## Addendum — MSC composites / ARCH-29

Une liste de plusieurs `requiredMicroScenes` ne constitue pas automatiquement une scène composée.

Quand plusieurs fragments doivent visuellement représenter **une seule unité missionnelle**, la solution validée est :
- créer une MSC composite de données ;
- fusionner les CUO/transformations des fragments existants dans cette scène ;
- donner au composite une seule identité MSC ;
- faire progresser la mission sur la découverte/proximité de cette identité unique.

ARCH-29 utilise quatre composites puis `MSC-CUSTOM-HABITAT-RUINE` seule comme cinquième unité finale.

Aucun moteur de regroupement, bridge ou registre missionnel parallèle n’est autorisé pour ce besoin.

## Survie

Le propriétaire reste `survival-ai-bridge.js`.

Le calcul agrégé historique reste basé sur rest / food / safety ; l’énergie affichée ne doit pas devenir un deuxième état autoritaire.

Toute modification de seuil de repos/ration nécessite une preuve runtime.

## Performance

`RuntimeBudget` reste l’unique throttling adaptatif.

R-STAB ferme la partie retry/runnabilité missionnelle, mais le profilage global CPU reste un chantier distinct.
Aucun nouveau cache global, budget CPU ou polling ne doit être ajouté sans preuve.

## Discipline

- HEAD courant seule base technique ;
- preuve avant correction ;
- propriétaires existants avant toute abstraction nouvelle ;
- BASE partielle exacte ;
- mêmes tests BASE/CANDIDAT ;
- pas de migration automatique rejetée ;
- pas de PASS gameplay sans preuve observable.
