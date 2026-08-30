# BLUEFOX ODYSSEY — MASTER

## État de référence

Dernière mise à jour : **30 août 2026**

### Version de travail
- Base GitHub de référence : commit `c75fa77b2afe59a0d3dc41fc00453c3dc47a1d64`.
- Libellé : `RECOVERY_CHECKPOINT — moteur stabilisé, T11 return + T13 autocraft encore ouverts`.
- Ce checkpoint remplace les cumulatifs intermédiaires comme base de reprise.
- Il **ne vaut pas validation gameplay complète T01→T13** : T11 retour autonome et T13 autocraft restent ouverts.
- Base PC historique : V16.20.
- Version mobile/APK V16.14 : obsolète.
- Objectif : consolider la base PC/Web avant reprise Android.

## Gouvernance documentaire officielle

Les documents maintenus sont listés dans `docs/README.txt`.
Depuis le 28 août 2026, les deux addenda de récupération font partie du corpus de reprise :
- `RECOVERY_CHECKPOINT_2026-08-28.md`
- `GAMEPLAY_CONTRACT_ADDENDUM_2026-08-28.md`

Les DOCX historiques restent des sources de décision, mais le HEAD et les documents officiels courants priment lorsqu’une ancienne traduction technique est dépassée.

## Architecture de référence

Le registre complet est dans `ARCHITECTURE_TECHNIQUE.md`.

Principes majeurs :
- `MissionManager` : lifecycle + sélection action missionnelle ;
- BAC : arbitrage comportemental, jamais propriétaire parallèle du choix missionnel ;
- `WorldEngine` : monde, transitions, navigation et directive joueur persistante ;
- `ObjectM0` : CUO, études dues, même instance, fan-out ;
- `BibleRuntime` : interprétation Bible/effets/gates sans posséder le lifecycle ;
- `save-ui-bridge` : snapshot global après flush ;
- UI : jamais propriétaire du gameplay ;
- `map-registry.js` : protégé.

## Contrat gameplay durable

### Relation joueur / BlueFox
Le joueur exprime une intention ; BlueFox conserve une marge de décision sauf ordre explicitement prioritaire.

Suggestion de changement de map — règle B :
- mémorisée immédiatement ;
- n’interrompt pas l’action atomique en cours ;
- reprise immédiatement après cette action, avant toute nouvelle décision missionnelle/BAC ;
- persistée au reload.

### Missions
- plusieurs missions actives peuvent progresser en parallèle ;
- une action réelle peut faire progresser plusieurs missions compatibles ;
- une réévaluation ne révèle au maximum qu’une nouvelle mission ;
- une mission terminée ne reste pas principale ;
- les missions tutoriel servent de banc d’industrialisation d’un moteur générique.

### CUO
Observer/inspecter/analyser restent des nuances missionnelles d’une même étude physique quand le CUO le prévoit.
Une acquisition missionnelle conserve la même instance après les études dues.

### Navigation
- trajet connu = déplacement physique ;
- inconnue = génération au passage réellement demandé ;
- pas de téléportation comme substitut d’un retour ;
- absence de chemin = échec de navigation, pas marche infinie contre obstacle.

### Survie
Pendant les missions tutoriel/prioritaires, un repos autonome ne doit pas détourner la mission sauf déblocage explicitement prévu.
Après T12, les comportements ration autorisés redeviennent progressivement arbitrables par BAC conformément au contrat tutoriel.

## Sauvegarde

La sauvegarde doit préserver le sens du gameplay :
- missions/lifecycles/faits ;
- exploration ;
- topologie ;
- MSC persistantes ;
- recettes/research unlocks ;
- ration et compteurs de craft ;
- directive joueur persistante.

Les états différés doivent être flushés avant snapshot.

## Tutoriel T01→T13 — état de reprise

Les décisions gameplay du Contrat V2 restent la référence.

- T01→T10 : comportements historiques à préserver ; aucune réinterprétation par le checkpoint.
- T11 : **OUVERT** — retour autonome vers un abri non reproduit au runtime c75fa77, malgré validation historique antérieure.
- T12 : preuve joueur de consommation réelle de ration ; autonomie ration ensuite selon déblocages.
- T13 : **OUVERT** — fabrication autonome des 10 rations non déclenchée au runtime c75fa77.
- LOC : map-scopé ; progression conservée hors map, affichage uniquement map active.
- Bosquet_bio : persistant, déclenché dans la séquence T13 prévue.

## Deux chantiers immédiats

### 1. T11 — récupérer le retour historiquement validé
Méthode :
- retrouver le dernier cycle réellement validé ;
- comparer `fin collecte → décision retour → BAC/returnPolicy → route connue → gate → transition → abri → completion`;
- rétablir uniquement le maillon perdu dans le propriétaire courant ;
- aucun nouveau système de retour.

### 2. T13 — raccorder le craft autonome générique
Tracer :
`objectif CRAFT → MissionPlanner → BAC → propriétaire réel craft → ressources consommées → ration produite → événement → progression`.
Le correctif doit fonctionner aussi pour une future mission de craft sans ID spécial.

## Industrialisation

Le moteur n’est déclaré prêt pour l’industrialisation massive qu’après validation des primitives génériques dont T11 et T13 sont actuellement les preuves manquantes.
L’objectif reste de brancher les futures missions par patrons/paramètres/données, jamais mission par mission.


---

## Mise à jour de reprise — 30 août 2026

### Base GitHub courante validée
- HEAD de reprise : `a62c25ad75fc63dce4546dfe0bd8861d45842376`.
- Parent avant Passe 4 : `b277d811756e980f4d6cae92c709fe147973ca04`.
- Le checkpoint `c75fa77...` reste la borne documentaire historique du 28 août ; il n’est plus la base technique courante.

### Validations post-checkpoint
- T13 : le cumulatif P1→P3 + correction du compilateur Bible a été validé en jeu sur la chaîne de craft/excursion : collecte des ingrédients utiles, fabrication réelle des rations, déplacement autonome, deuxième nouvelle map et présence de `MSC-CUSTOM-BOSQUET-BIO`.
- Passe 4 UI : commit `a62c25ad...` validé en jeu sur le conflit Recherche/Inventaire ; les cycles Recherche → Inventaire → Recherche et inversement ne provoquent plus d’écran noir ni de `NotFoundError: removeChild`.
- L’UI reste non propriétaire du gameplay ; les bridges doivent masquer leurs injections tardives plutôt que supprimer les nœuds appartenant à React.

### Chantier différé prioritaire — CPU / cadence / autorité missionnelle
Symptômes runtime à reprendre :
- consommation CPU perçue en hausse, y compris sur maps connues ;
- délai anormal entre actions malgré plusieurs cibles proches et plusieurs missions compatibles ;
- état prolongé « observation du terrain / choix de la prochaine action » ;
- retour au camp puis actions locales aléatoires alors que plusieurs missions restent actives.

Constats HEAD déjà établis :
- garde-fou pathfinding encore actif mais limité : shortlist BAC de 6 candidats, puis cache d’approche 1,2 s / déplacement ≤ 0,5 ;
- ce garde-fou ne couvre pas les rescans d’intérêt / ObjectEvents ni les décisions ultérieures ;
- `MissionManager` contient une cadence de planification de 1,2 s et des `retryAfter` pouvant atteindre 4–5 s ;
- pendant un voyage événementiel, `ensureMissionTransitionIntent()` est appelé depuis `MissionManager.update()` à chaque frame et le plan de frontière inconnue peut être recalculé avant validation du contexte mémorisé ;
- le surcoût n’est pas prouvé comme introduit directement par Passe 4.

### Chantier différé — cohérence Survival
Propriétaire inchangé : `survival-ai-bridge.js`.

État actuel :
`énergie = 55 % repos + 32 % alimentation + 13 % sécurité`.

À reprendre :
- rapprocher la perception de la barre Énergie des composantes réellement utilisées par les décisions de repos/alimentation ;
- lisser les divergences excessives `rest / food / energy` sans moteur parallèle ;
- conserver des besoins distincts : la barre agrégée ne doit pas effacer un vrai déficit de repos ou d’alimentation ;
- vérifier la pertinence du seuil `preventiveMicroRest` à partir des composantes réelles.
