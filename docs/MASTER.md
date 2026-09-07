# BLUEFOX ODYSSEY — MASTER

## État de référence

Dernière mise à jour : **8 septembre 2026**

### Version de travail
- Base GitHub courante validée avant mise à jour documentaire : commit `1f20ba014686f5f6eadac78a22b89077bca8e380`.
- Commit : `/!\ GAME CIVilisation ENINERING + Etabli+feu +fichiers sensibles /!\ GROS LOT`.
- Parent : `3705d40399437058fcc62a9bc99f2ee96defc75e` — Missions FAUNA R2.
- Le HEAD GitHub courant est la seule base technique de reprise.
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
- `ProgressionRegistry` : progression centrale et inventaires canoniques ;
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
- aucune interaction finale fictive ne doit être ajoutée lorsqu'une mission se termine par un effet automatique réel ;
- une mission explicitement `repeatable` peut être réarmée par MissionManager sans modifier le contrat des missions ordinaires.

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
- directive joueur persistante ;
- sites de construction placés par le joueur, dont le WORKBENCH et son anchor réel.

Les états différés doivent être flushés avant snapshot.
Aucune propagation ou migration artificielle rejetée par le runtime ne doit être réintroduite.

## Tutoriel, missions industrialisées et constructions — état courant

### T01 → T13
- T01→T13 : chaîne tutorielle et comportements historiquement validés à préserver.
- T13 : collecte utile, craft réel de rations et excursion sur nouvelles maps restent des garde-fous de non-régression.
- LOC : map-scopé ; progression conservée hors map, affichage uniquement map active.

### Industrialisation missionnelle acquise
Depuis la dernière référence documentaire, le moteur a été étendu par lots sans nouveau propriétaire parallèle :
- FLO-01→07 ;
- GEO-01→07 ;
- paliers COL et missions ENV ;
- LOC industrialisées ;
- SUR ;
- GAME R1/R2 ;
- FAU-01→12 avec runtime FAUNA R2 ;
- ENE-01→10 ;
- GAME-civilization_1→5 ;
- GAME-engineering_3→6 et GAME-fire.

### Camp → Refuge → Base renforcée
État courant :
- Camp : `MSC-CUSTOM-CAMP` ;
- Refuge : `MSC-CUSTOM-CAMP-BASE` ;
- Base renforcée : `MSC-CUSTOM-CAMP-BASE-REINFORCED` ;
- GAME-base signifie désormais réellement **disposer** de 500 fibres + 500 ressources du pool minéral/cristal au moment de construire ;
- les slots stock-backed sont réconciliés uniquement sur événements d'inventaire pertinents ;
- 100 études rocheuses restent une progression historique distincte ;
- spawn avant consommation, effets idempotents et persistance des sites conservés ;
- au succès Base, le Refuge autonome précédent est retiré et le Camp est conservé.

### Civilisation → réserve → ingénierie → établi
Chaîne désormais intégrée :
- après le Refuge et 10 stèles observées historiquement, GAME-civilization_1→5 mène sur trois nouvelles maps ;
- chaque nouvelle map possède une nouvelle stèle garantie ;
- la troisième map contient `MSC-CUSTOM-RESERVE-ABANDONEE` ;
- la réserve offre 350 fibres + 350 minerais ordinaires répartis en 175 `azure_ferrite` + 175 `magnetic_ore` ;
- le prélèvement respecte la capacité réelle du sac et conserve le reliquat persistant jusqu'à épuisement ;
- le crédit de réserve ne simule pas de `RESOURCE_COLLECTED` et ne gonfle pas les compteurs COL ;
- GAME-engineering_3/4 consomment réellement des ressources et introduisent les limites du feu ;
- GAME-fire est répétable, locale à Crystal/proximité d'un site et consomme 8 bois sans provoquer seule un retour ;
- GAME-engineering_5 débloque le Blueprint Établi ;
- GAME-engineering_6 conduit à l'implantation réelle de `MSC-CUSTOM-ETABLI-VIDE` sur Crystal ;
- le joueur choisit le placement ; anchor et rotation sont persistés pour les futures missions « retour à l'établi ».

## Prochaine continuité explicitement préservée

Le prochain jalon missionnel est ENE-11→14.
La stratégie déjà validée doit être reprise et rebasée sur le HEAD ; elle ne doit pas être redéfinie arbitrairement.
ENE-15 reste différé tant que ses prérequis ARCH-17 / DIP-02 ne sont pas réellement industrialisés.

## Suggestions utilisateur encore ouvertes

- console drone joueur dans le menu Recherche, en réutilisant les drones scout/harvest et leur runtime existant ;
- Kit d'expédition générique pour les objets fabriqués transportables, d'abord l'accumulateur puis de futurs objets activables comme une balise ;
- Journal évolutif calculé à l'ouverture seulement, avec briques persistantes et stables qui ne sont enrichies que lors d'évolutions majeures réelles ;
- éventuel scouting drone inter-map uniquement dans une passe future dédiée, pas implicitement avec ENE-13.

## Industrialisation

Le moteur doit continuer à être généralisé par propriétaires et patrons existants :
- données/contrats plutôt que branches par ID ;
- propriétaires existants plutôt que bridges ;
- tests de réfutation avec missions fictives `FUTURE-*` lorsque la primitive est générique ;
- validation des consommateurs réels avant PASS ;
- BASE partielle exacte limitée au périmètre : ne pas reconstruire le dépôt complet.

Les travaux encore ouverts sont listés uniquement dans `ROADMAP_TODO.md`.
