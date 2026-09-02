# BLUEFOX ODYSSEY — MASTER

## État de référence

Dernière mise à jour : **2 septembre 2026**

### Version de travail
- Base GitHub courante validée avant mise à jour documentaire : commit `8b34d8912667f02140c0c2999b1dfa3f37a8e9ee`.
- Commit : `spawn base fix`.
- Le HEAD GitHub courant est la seule base technique de reprise.
- Aucun nouveau recovery checkpoint n'est créé pour cette clôture.
- Les recovery checkpoints existants restent historiques et ne priment pas sur le HEAD courant.
- `ROADMAP_TODO.md` est la seule TODO active.

## Gouvernance documentaire officielle

Les documents maintenus sont listés dans `docs/README.txt`.

Règle de priorité :
1. décision utilisateur la plus récente ;
2. validation runtime en jeu ;
3. Contrat Gameplay Opérationnel V2 + addendum courant ;
4. MASTER / ARCHITECTURE / ROADMAP / DEV_HISTORIQUE ;
5. documents historiques.

## Architecture de référence

Le registre complet est dans `ARCHITECTURE_TECHNIQUE.md`.

Principes majeurs :
- `MissionManager` : lifecycle + sélection action missionnelle ;
- BAC : arbitrage comportemental, jamais propriétaire parallèle du choix missionnel ;
- `WorldEngine` : monde, transitions, navigation et directive joueur persistante ;
- `ObjectM0` : CUO, matching missionnel, études dues, même instance, fan-out ;
- `BibleRuntime` : interprétation Bible, effets, gates et sites persistants sans posséder le lifecycle ;
- UI : jamais propriétaire du gameplay ;
- `map-registry.js` : protégé.

## Contrat gameplay durable

### Relation joueur / BlueFox
Le joueur exprime une intention ; BlueFox conserve une marge de décision sauf ordre explicitement prioritaire.

Suggestion de changement de map — règle B :
- mémorisée immédiatement ;
- n'interrompt pas l'action atomique en cours ;
- reprise immédiatement après cette action avant toute nouvelle décision missionnelle/BAC ;
- persistée au reload.

### Missions
- plusieurs missions actives peuvent progresser en parallèle ;
- une action réelle peut faire progresser plusieurs missions compatibles ;
- une réévaluation ne révèle au maximum qu'une nouvelle mission ;
- une mission terminée ne reste pas principale ;
- les missions tutoriel servent de banc d'industrialisation d'un moteur générique ;
- aucune interaction finale fictive ne doit être ajoutée lorsqu'une mission se termine par un effet automatique réel.

### CUO / relation trigger-cible
- observer / inspecter / analyser restent des nuances missionnelles d'une même étude physique lorsque le CUO le prévoit ;
- une acquisition missionnelle conserve la même instance après les études dues ;
- l'IMI distingue explicitement `REVEAL-ONLY`, `SAME-DEFINITION` et `SAME-INSTANCE` ;
- aucune migration automatique de vieux bindings n'est autorisée sans preuve runtime complète.

### Navigation
- trajet connu = déplacement physique ;
- destination inconnue = génération au passage réellement demandé ;
- pas de téléportation comme substitut d'un retour ;
- absence de chemin = échec de navigation, pas marche infinie contre obstacle.

### Survie
Pendant les missions tutoriel/prioritaires, un repos autonome ne doit pas détourner la mission sauf déblocage explicitement prévu.
Après T12, les comportements ration autorisés redeviennent progressivement arbitrables par BAC conformément au contrat tutoriel.

## Sauvegarde

La sauvegarde doit préserver :
- missions/lifecycles/faits ;
- exploration et topologie ;
- MSC/sites persistants ;
- recettes/research unlocks ;
- ration et compteurs de craft ;
- directive joueur persistante.

Les états différés doivent être flushés avant snapshot.
Aucune propagation ou migration artificielle rejetée par le runtime ne doit être réintroduite.

## Tutoriel et constructions — état courant

### T01 → T13
- T01→T10 : comportements historiques validés à préserver.
- T13 : chaîne de craft/excursion validée en jeu : collecte utile, fabrication réelle des rations, déplacement autonome, deuxième nouvelle map et Bosquet bio.
- LOC : map-scopé ; progression conservée hors map, affichage uniquement map active.
- Les points encore ouverts sont suivis exclusivement dans `ROADMAP_TODO.md`.

### Camp → Refuge → Base renforcée
État validé et commité au commit moteur `8b34d8912667f02140c0c2999b1dfa3f37a8e9ee` :
- Camp : `MSC-CUSTOM-CAMP` ;
- Refuge : `MSC-CUSTOM-CAMP-BASE` ;
- Base renforcée : `MSC-CUSTOM-CAMP-BASE-REINFORCED` ;
- Shelter démarre après Camp selon le lifecycle existant ;
- Base renforcée devient activable après completion de Shelter ;
- les objectifs historiques peuvent être complets alors que le stock physique courant reste insuffisant ;
- le moteur attend alors le stock réel et réévalue sur événement d'inventaire, sans polling supplémentaire ;
- Base renforcée consomme 500 fibres + 500 ressources du pool minéral/cristal et requiert 100 études rocheuses ;
- le pool minéral est résolu par le matching sémantique existant ;
- le spawn est tenté avant toute consommation ;
- un échec de spawn ne consomme rien ;
- la consommation est idempotente ;
- les presets canoniques sont propriétaires lorsqu'ils existent et ne sont pas rejetés par l'arbitrage de placement générique ;
- position Base renforcée sur crystal : `x=-2.7567, y=0.25, z=4.768`, rotation canonique inchangée ;
- au succès de la Base renforcée, le Refuge autonome précédent est retiré visuellement et de la persistance ; le Camp reste présent ;
- la composition finale validée en jeu est Camp + Base renforcée, la MSC renforcée embarquant elle-même la partie refuge attendue.

## Industrialisation

Le moteur doit continuer à être généralisé par propriétaires et patrons existants :
- données/contrats plutôt que branches par ID ;
- propriétaires existants plutôt que bridges ;
- tests de réfutation avec missions fictives `FUTURE-*` lorsque la primitive est générique ;
- validation des consommateurs réels avant PASS.

Les travaux encore ouverts sont listés uniquement dans `ROADMAP_TODO.md`.
