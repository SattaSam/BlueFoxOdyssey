# BLUEFOX ODYSSEY — MASTER

## État de référence

Dernière mise à jour : **13 septembre 2026**

### Version de travail
- HEAD missionnel/documentaire courant vérifié : commit `ca619120c502ff6b122d69ad3ed15d0e8dc8a1d0` — `ANN 01-07`.
- Checkpoint moteur R-HEALTH sain conservé : commit `560249fb91ed2d5c719a4aafa5eabe88b6ee1e46` — `fix Save`.
- Le HEAD GitHub courant reste la seule base technique de reprise ; le checkpoint R-HEALTH sert de référence de santé, jamais de base de codage à la place du HEAD.
- Les recovery checkpoints existants restent historiques et ne priment pas sur le HEAD courant.
- `ROADMAP_TODO.md` reste la seule TODO active.
- Le DOCX Bible présent dans `docs/` est une source documentaire de contenu ; il doit rester synchronisé avec les définitions moteur effectivement confirmées.

## Gouvernance documentaire officielle

Les documents maintenus sont ceux désignés par `docs/README.txt`.

Règle de priorité :
1. décision utilisateur la plus récente ;
2. validation runtime / comportement observable ;
3. Contrat Gameplay Opérationnel V2 + addendum courant ;
4. MASTER / ARCHITECTURE / ROADMAP / DEV_HISTORIQUE ;
5. documents historiques.

Le code courant prouve le comportement actuel, pas à lui seul l'intention gameplay. Une attente historique peut devenir obsolète si une évolution plus récente a été validée comme nouvelle vérité moteur.

## Checkpoint R-HEALTH — 12 septembre 2026

Audit transversal réalisé sur `560249fb91ed2d5c719a4aafa5eabe88b6ee1e46`.

Verdict : **base saine pour poursuivre l'industrialisation**.

Carte synthétique :
- **13 domaines VERT** ;
- **3 domaines VERT ÉVOLUÉ** ;
- **4 domaines ORANGE de validation incomplète** ;
- **0 domaine ROUGE systémique démontré**.

VERT ÉVOLUÉ signifie qu'un comportement actuel diverge d'une ancienne attente mais constitue désormais une vérité moteur cohérente et contractuelle. Ce statut ne doit pas être ramené artificiellement à une ancienne implémentation pour faire passer un test historique.

Domaines ORANGE à surveiller lors des chantiers concernés :
- parcours tutoriel T01→T13 complet de bout en bout ;
- génération/population maps et protections de contenu ;
- UI visuelle en conditions réelles ;
- audio / caméra / déplacement / physique en observation jeu.

### Nouvelle règle de lecture des tests

Le nombre brut de tests rouges n'est plus un indicateur suffisant de santé moteur.

Un test rouge préexistant doit être classé avant toute correction :
- dette de test / API ou fixture obsolète ;
- harness de test incomplet ;
- contrat historique remplacé par une vérité moteur plus récente ;
- panne runtime/gameplay réellement reproduite.

Une non-régression de ZIP doit prioritairement prouver :
1. préservation des capacités R-HEALTH du HEAD ;
2. absence de nouvelle panne gameplay démontrée ;
3. absence de nouveau nom d'échec pertinent ;
4. conformité au contrat actuel des propriétaires et consommateurs.

On ne modifie jamais le moteur uniquement pour faire repasser un test ancien dont l'attendu n'est plus contractuel.

## Architecture de référence

Le registre détaillé des propriétaires est dans `ARCHITECTURE_TECHNIQUE.md`.

Principes majeurs :
- `MissionManager` : lifecycle + sélection canonique de l'action missionnelle ;
- BAC : arbitrage comportemental, jamais propriétaire parallèle du choix missionnel ;
- `WorldEngine` : monde, transitions, navigation et directive joueur persistante ;
- `MissionPlanner` : traduction des objectifs vers des actions et contraintes géographiques ;
- `ObjectM0` : matching CUO, même-instance, fan-out et critères missionnels génériques ;
- `BibleRuntime` : interprétation Bible, effets, gates, bindings, sites et compteurs sans posséder le lifecycle ;
- `ProgressionRegistry` : progression centrale et inventaires canoniques ;
- `MicroScenes` : identité et composition des micro-scènes ; les MSC custom restent des données ;
- `RuntimeBudget` : unique propriétaire du throttling adaptatif ;
- `SpecialObjectRuntime` : runtime métier des drones, balises et objets spéciaux ;
- UI : jamais propriétaire du gameplay ;
- `map-registry.js` : protégé.

## Contrat gameplay durable

### Relation joueur / BlueFox
Le joueur exprime une intention ; BlueFox conserve une marge de décision sauf ordre explicitement prioritaire.

Suggestion de changement de map — règle B :
- mémorisée immédiatement ;
- n'interrompt pas l'action atomique en cours ;
- reprise après cette action avant une nouvelle décision missionnelle/BAC ;
- persistée au reload.

### Missions / runnabilité
- plusieurs missions actives peuvent progresser en parallèle ;
- une action réelle peut faire progresser plusieurs missions compatibles ;
- une mission active/primary peut être non-runnable localement sans être artificiellement terminée ;
- une contrainte géographique missionnelle peut produire une transition canonique via TRAVEL explicite, `requiredMapFact`, cible missionnelle mémorisée ou completion gate ;
- une transition connue mais inexécutable ne doit pas conserver une exclusivité qui immobilise BlueFox ;
- une opportunité secondaire locale peut être traitée avant un départ missionnel lorsqu'elle est réellement runnable, puis la transition primaire reprend ;
- une primaire stérile ne bloque pas les secondaires runnables ;
- les réveils de retry restent causaux ; aucun polling parallèle n'est ajouté ;
- une réévaluation causale ne révèle au maximum qu'une nouvelle mission.

### BAC / prérequis expérimentaux
Une expérimentation nécessaire à l'activation ou à la progression d'une mission peut être portée comme intention persistante et candidate pondérée du BAC.

Règles actuelles :
- le poids missionnel et l'axe thématique sont conservés ;
- le BAC reste souverain face aux autres candidats, notamment Survival ;
- une directive joueur persistante bloque la candidate expérimentale ;
- une mission primaire réellement runnable conserve son autorité ;
- si la prochaine étape expérimentale est distante, la navigation existante rejoint le site requis ;
- sans ressources suffisantes, aucune expérience fictive ni déplacement inutile n'est déclenché.

### CUO / relation trigger-cible
- observer / inspecter / analyser restent des nuances missionnelles d'une même étude physique lorsque le CUO le prévoit ;
- une acquisition missionnelle conserve la même instance après les études dues ;
- l'IMI distingue `REVEAL-ONLY`, `SAME-DEFINITION` et `SAME-INSTANCE` ;
- `object-m0-bridge.js` conserve le filtre historique `cuoType` et accepte aussi `cuoTypes` comme filtre OR optionnel, cumulatif avec les autres critères ;
- aucune migration automatique de vieux bindings n'est autorisée sans preuve runtime complète.

### Navigation
- trajet connu = déplacement physique ;
- destination inconnue = génération au passage réellement demandé ;
- pas de téléportation comme substitut d'un retour ;
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
- état du réseau drone/balise lorsqu'il est porté par ses propriétaires canoniques ;
- briques du Journal déjà consolidées.

Les états différés doivent être flushés avant snapshot.

Depuis le checkpoint `560249…`, MissionManager protège aussi l'hydratation différée d'une sauvegarde : si une mission sauvegardée est connue dans l'état mais que sa définition n'est pas encore chargée, la restauration attend la disponibilité de la définition au lieu d'écraser prématurément l'état sauvegardé. Cette protection reste dans le propriétaire canonique du lifecycle ; aucun second moteur de restauration missionnelle n'est créé.

Aucune propagation ou migration artificielle rejetée par le runtime ne doit être réintroduite.

## Industrialisation missionnelle acquise

Lots intégrés au HEAD `ca619120…` et à préserver :
- T01→T13 ;
- FLO-01→07 ;
- GEO-01→07 ;
- paliers COL et missions ENV ;
- LOC-01→17 ;
- SUR-01/02/03/05/06/07 + SURPLUS et missions de site associées ;
- GAME R1/R2 et missions GAME complémentaires ;
- GAME-civilization_1→5 ;
- FAU-01→12 + templates répétables par espèce `FAU-01A`, `FAU-03A`, `FAU-05A`, `FAU-11A` ;
- ENE-01→14 + sous-branche ENE-15-A/B/C ;
- GAME-engineering_1→6 et GAME-fire ;
- chaîne balise `BAL-01→03` ;
- chaîne drones `DRN-01→05` ;
- ARCH-01→40 ;
- CONTACT-01→15 ;
- DIP-01→03 ;
- chaîne GAME contact : `GAME-contact_first`, `GAME-contact_cautious`, `GAME-contact_ambassador` ;
- chaîne ANN industrialisée au commit `ca619120…` : `ANN-04 → ANN-06 → ANN-03 → ANN-02 → ANN-05 → ANN-01 → ANN-07`.

La Bible documentaire synchronisée avec ce HEAD représente désormais **255/255 définitions moteur du catalogue** avec une coche ✅. Les projets documentaires sans définition moteur restent volontairement sans coche.

La présence au catalogue ne dispense jamais de vérifier le raccord runtime, les prérequis et les consommateurs lorsqu'un nouveau chantier touche ces branches.

## Lot ANN — contrat acquis

Commit de référence : `ca619120c502ff6b122d69ad3ed15d0e8dc8a1d0` — `ANN 01-07`.

Acquis à préserver :
- ANN-04 s'ouvre après T13 sur une nouvelle map Ouest et réutilise les phénomènes météo existants ;
- ANN-06 établit un **Camp** réel via le mécanisme générique de site/placement joueur, avec `MSC-CUSTOM-SMART-CAMP`, coût 10 bois + 10 fibres et distance strictement >10 maps du Camp/Refuge/Base le plus proche ;
- `MSC-NOCTURNAL-DEN-001` reste un contexte faune distinct du Camp ;
- ANN-03 utilise l'épave réelle et ses composants physiques ;
- ANN-02 collecte 25 Thermosèves puis consomme réellement 6 plantes + 2 minerais connus ;
- ANN-05 analyse 3 types minéraux, collecte 4 de chacun et consomme réellement les 12 échantillons ;
- ANN-01 remplace tout ancien `signal_strength = 44` par trois seuils d'exploration réels 10 % → 25 % → 60 %, puis observation de 3 éléments du relais et collecte d'un composant réel ;
- ANN-07 consomme l'historique réel `OBJECT_SEEN` / `observations.historical` pour la faune nocturne et n'impose pas de réobservation artificielle ;
- les bulles BlueFox sont spécifiques aux étapes vécues et persistées par les mécanismes existants ;
- aucune couche ANN parallèle n'a été créée.

## Relations / civilisations

Le moteur relationnel a dépassé le simple enchaînement de missions CONTACT :
- les NPC réagissent physiquement à la manière d'approcher ;
- une approche intrusive peut produire une fuite canonique ;
- une approche lente/stable peut permettre une progression prudente ;
- un dialogue/contact déjà engagé reste protégé contre une fuite automatique concurrente ;
- réputation, commerce et déblocages de recherche utilisent les propriétaires canoniques ;
- les coûts de commerce consomment le stock physique et les récompenses produisent des connaissances/blueprints réels ;
- CONTACT-10→15 constitue la minisérie de la seconde civilisation, avec sélection persistante et reprise vers CONTACT-10 en cas d'échec relationnel significatif.

Le raccord CONTACT-10→CONTACT-11 précédemment signalé comme défaut local n'est plus une TODO documentaire générale : les deux définitions sont présentes au HEAD actuel. Toute anomalie future doit être reproduite au runtime avant correction.

## Énergie / balise / drones

### ENE
La chaîne énergétique présente au catalogue va de ENE-01 à ENE-14, puis se prolonge par `ENE-15-A`, `ENE-15-B`, `ENE-15-C`. Les mécanismes continuent de réutiliser l'établi, les accumulateurs, les machines/objets et les propriétaires existants plutôt que de créer un second moteur énergétique.

### Balise et drones
- la balise déployée appartient au runtime d'objets spéciaux existant ;
- le Kit d'expédition sait transporter les objets concernés sans devenir leur propriétaire métier ;
- `BAL-01→03` formalise analyse, fabrication/déploiement et usage de la balise ;
- `DRN-01→05` couvre Scout/Harvest, récolte distante, réseau et dépannage terrain ;
- les observations du Scout utilisent le chemin canonique `OBJECT_SEEN` pour l'historique global, sans produire d'observations missionnelles ordinaires non demandées.

## Journal évolutif

Le Journal est lazy et persistant :
- la consolidation narrative est demandée uniquement à l'ouverture du menu Journal ;
- les scans/mutations DOM ne déclenchent pas de consolidation répétitive ;
- les briques déjà écrites sont conservées ;
- une branche sans évolution majeure reste stable ;
- seules les évolutions significatives enrichissent la synthèse ;
- aucun polling n'a été ajouté.

ANN-07 ajoute un jalon documentaire à la branche Faune/Nature du Journal lorsqu'un premier catalogue du vivant est réellement établi.

## Continuité

- `560249fb91ed2d5c719a4aafa5eabe88b6ee1e46` reste le **checkpoint moteur R-HEALTH sain** ;
- `ca619120c502ff6b122d69ad3ed15d0e8dc8a1d0` est le **HEAD missionnel de référence de cette synchronisation documentaire** ;
- la prochaine industrialisation doit être choisie parmi les projets réellement encore sans définition moteur dans la Bible synchronisée ;
- aucun chantier général de réparation moteur n'est ouvert ;
- les quatre domaines ORANGE restent des zones de validation à compléter quand un chantier les traverse, pas des pannes présumées.

## Discipline d'industrialisation

- données/contrats plutôt que branches par ID ;
- propriétaires existants plutôt que bridges ;
- réutiliser les MSC/CUO existants avant création nouvelle ;
- une nouvelle MSC composite reste une donnée si le moteur sait déjà l'instancier comme une scène unique ;
- tests de réfutation et consommateurs réels avant PASS ;
- BASE partielle exacte limitée au périmètre : ne jamais reconstruire le dépôt complet ;
- un test historique rouge n'autorise une correction moteur qu'après reproduction d'une panne actuelle ou violation d'un contrat encore valide.
