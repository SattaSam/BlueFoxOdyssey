# BLUEFOX ODYSSEY — MASTER

## État de référence

Dernière mise à jour : **11 septembre 2026**

### Version de travail
- Base GitHub courante validée avant mise à jour documentaire : commit `296c048c0846198bf6326924ea4d3a9483907f68`.
- Commit : `/!\ ARCH R4 19-29     /!\ INDEX.HTML`.
- Parent : `017d646f6e861840b22a63a0a39e69aa231d5b7c` — `ARCH 13-18`.
- Le HEAD GitHub courant reste la seule base technique de reprise.
- Les recovery checkpoints existants restent historiques et ne priment pas sur le HEAD courant.
- `ROADMAP_TODO.md` reste la seule TODO active.
- Le DOCX Bible présent dans `docs/` est une source documentaire de contenu, pas un document de gouvernance technique maintenu par cette mise à jour.

## Gouvernance documentaire officielle

Les documents maintenus sont ceux désignés par `docs/README.txt`.

Règle de priorité :
1. décision utilisateur la plus récente ;
2. validation runtime / comportement observable ;
3. Contrat Gameplay Opérationnel V2 + addendum courant ;
4. MASTER / ARCHITECTURE / ROADMAP / DEV_HISTORIQUE ;
5. documents historiques.

## Architecture de référence

Le registre détaillé des propriétaires est dans `ARCHITECTURE_TECHNIQUE.md`.

Principes majeurs :
- `MissionManager` : lifecycle + sélection canonique de l’action missionnelle ;
- BAC : arbitrage comportemental, jamais propriétaire parallèle du choix missionnel ;
- `WorldEngine` : monde, transitions, navigation et directive joueur persistante ;
- `MissionPlanner` : traduction des objectifs vers des actions et contraintes géographiques ;
- `ObjectM0` : matching CUO, même-instance, fan-out et critères missionnels génériques ;
- `BibleRuntime` : interprétation Bible, effets, gates, bindings, sites et compteurs sans posséder le lifecycle ;
- `ProgressionRegistry` : progression centrale et inventaires canoniques ;
- `MicroScenes` : identité et composition des micro-scènes ; les MSC custom restent des données ;
- `RuntimeBudget` : unique propriétaire du throttling adaptatif ;
- UI : jamais propriétaire du gameplay ;
- `map-registry.js` : protégé.

## Contrat gameplay durable

### Relation joueur / BlueFox
Le joueur exprime une intention ; BlueFox conserve une marge de décision sauf ordre explicitement prioritaire.

Suggestion de changement de map — règle B :
- mémorisée immédiatement ;
- n’interrompt pas l’action atomique en cours ;
- reprise après cette action avant une nouvelle décision missionnelle/BAC ;
- persistée au reload.

### Missions / runnabilité
- plusieurs missions actives peuvent progresser en parallèle ;
- une action réelle peut faire progresser plusieurs missions compatibles ;
- une mission active/primary peut être non-runnable localement sans être artificiellement terminée ;
- une contrainte géographique missionnelle peut produire une transition canonique via TRAVEL explicite, `requiredMapFact`, cible missionnelle mémorisée ou completion gate ;
- une transition connue mais inexécutable ne doit pas conserver une exclusivité qui immobilise BlueFox ;
- une opportunité secondaire locale peut être traitée avant un départ missionnel lorsqu’elle est réellement runnable, puis la transition primaire reprend ;
- une primaire stérile ne bloque pas les secondaires runnables ;
- les réveils de retry restent causaux ; aucun polling parallèle n’est ajouté ;
- une réévaluation causale ne révèle au maximum qu’une nouvelle mission.

### CUO / relation trigger-cible
- observer / inspecter / analyser restent des nuances missionnelles d’une même étude physique lorsque le CUO le prévoit ;
- une acquisition missionnelle conserve la même instance après les études dues ;
- l’IMI distingue `REVEAL-ONLY`, `SAME-DEFINITION` et `SAME-INSTANCE` ;
- `object-m0-bridge.js` conserve le filtre historique `cuoType` et accepte aussi `cuoTypes` comme filtre OR optionnel, cumulatif avec les autres critères ;
- aucune migration automatique de vieux bindings n’est autorisée sans preuve runtime complète.

### Navigation
- trajet connu = déplacement physique ;
- destination inconnue = génération au passage réellement demandé ;
- pas de téléportation comme substitut d’un retour ;
- absence de chemin = échec de navigation, pas marche infinie contre obstacle.

## Sauvegarde / persistance

La sauvegarde doit préserver :
- missions, lifecycles et faits ;
- exploration et topologie ;
- MSC/sites persistants ;
- recettes/research unlocks ;
- ration et compteurs de craft ;
- directive joueur persistante ;
- constructions placées ;
- état du réseau drone/balise lorsqu’il est porté par ses propriétaires canoniques ;
- briques du Journal déjà consolidées.

Les états différés doivent être flushés avant snapshot.
Aucune propagation ou migration artificielle rejetée par le runtime ne doit être réintroduite.

## Industrialisation missionnelle acquise

Lots déjà intégrés et à préserver :
- T01→T13 ;
- FLO-01→07 ;
- GEO-01→07 ;
- paliers COL et missions ENV ;
- LOC ;
- SUR ;
- GAME R1/R2 ;
- FAU-01→12 puis extensions FAUNA validées ;
- ENE-01→14 ;
- GAME-civilization_1→5 ;
- GAME-engineering_3→6 et GAME-fire ;
- chaîne balise `BAL-01→03` ;
- chaîne drones `DRN-01→04` ;
- cinq missions GAME supplémentaires : `GAME-collection_samples`, `GAME-collection_variety`, `GAME-travel_biomes`, `GAME-travel_short`, `GAME-travel_long` ;
- ARCH-01→29, industrialisées en quatre passes successives.

## Énergie / balise / drones

### ENE-11→14
- ENE-11 : prototype réel à l’établi, consommation de ressources et déblocage de la recette d’accumulateur ;
- ENE-12 : approche de la machine abandonnée puis consommation réelle d’un accumulateur ;
- ENE-13 : réutilise le Scout existant et valide son balayage sur la map courante ;
- ENE-14 : mesures multi-map + calibration Giant Tree + synthèse Recherche.
Aucun second moteur énergétique ou drone n’est créé.

### Balise et drones
- la balise déployée appartient au runtime d’objets spéciaux existant ;
- le Kit d’expédition sait transporter les objets concernés sans devenir leur propriétaire métier ;
- `BAL-01→03` formalise analyse, fabrication/déploiement et usage de la balise ;
- `DRN-01→04` formalise les Blueprints Scout/Harvest, la récolte distante et le pilotage du réseau depuis Recherche ;
- les observations du Scout utilisent le chemin canonique `OBJECT_SEEN` pour l’historique global, sans produire d’observations missionnelles ordinaires non demandées.

## Journal évolutif

Le Journal est désormais lazy et persistant :
- la consolidation narrative est demandée uniquement à l’ouverture du menu Journal ;
- les scans/mutations DOM ne déclenchent pas de consolidation répétitive ;
- les briques déjà écrites sont conservées ;
- une branche sans évolution majeure reste stable ;
- seules les évolutions significatives enrichissent la synthèse ;
- aucun polling n’a été ajouté.

## ARCH-01→29

### ARCH-R1 — ARCH-01→06
Première tranche archéologique, avec observation distincte, contextes MSC et SAME-INSTANCE lorsque requis.

### ARCH-R2 — ARCH-07→12
Sites, ruines, strates, carrière et habitat ; réutilisation des MSC et des contrats de contexte existants.

### ARCH-R3 — ARCH-13→18
- ajout chirurgical de `cuoTypes` à ObjectM0 pour les ensembles de types ;
- ARCH-16 : 18 observations post-activation parmi `arch`, `stele`, `tech_relic`, avec présence des trois catégories ;
- aucune autre sémantique M0 modifiée.

### ARCH-R4 — ARCH-19→29
- ARCH-19 : `MSC-CUSTOM-MACHINE-ABANDONNEE`, observation de `ancient_machine_wreck`, interprété narrativement comme l’arme ;
- ARCH-20 : possède un vrai voyage autonome vers une nouvelle map garantissant `MSC-CUSTOM-HAUTEL-STELL-RELIC-COMP`, afin d’éviter un trou de runnabilité ;
- ARCH-21→23 : réutilisent les supports cristallins, l’astrologie et la balise/relais existants ;
- ARCH-24 : objectif ramené à **15 acquisitions** de composants/Core parmi `relay_block`, `pulse_core`, `memory_capsule`, `logic_prism` ;
- ARCH-25 : deux nouvelles maps puis exploration à 50 % de la seconde map, liée par son binding d’activation ;
- ARCH-26 : foyer ancien réel ;
- ARCH-27 : deux objets distincts sur le même foyer ;
- ARCH-28 : habitat occupé traduit par signes physiques dans la MSC ;
- ARCH-29 : cinq unités d’habitation réelles sur trois nouvelles maps : quatre MSC composites distinctes puis `MSC-CUSTOM-HABITAT-RUINE` seule comme cinquième et dernière unité.

Les quatre MSC composites ARCH-29 sont des **données de scène** construites à partir de briques de ruines existantes. Une composition entière possède une seule identité MSC et compte donc comme une seule unité d’habitation. Aucun moteur de regroupement parallèle n’a été ajouté.

## Continuité

- ARCH-01→29 est désormais intégré ; la prochaine tranche ARCH doit repartir de **ARCH-30** après audit documentaire/technique ciblé.
- ENE-15 n’est plus bloqué par ARCH-17 ; ses autres prérequis documentaires/runtime doivent être vérifiés avant intégration.
- Les chantiers encore ouverts sont listés uniquement dans `ROADMAP_TODO.md`.

## Discipline d’industrialisation

- données/contrats plutôt que branches par ID ;
- propriétaires existants plutôt que bridges ;
- réutiliser les MSC/CUO existants avant création nouvelle ;
- une nouvelle MSC composite reste une donnée si le moteur sait déjà l’instancier comme une scène unique ;
- tests de réfutation et consommateurs réels avant PASS ;
- BASE partielle exacte limitée au périmètre : ne jamais reconstruire le dépôt complet.
