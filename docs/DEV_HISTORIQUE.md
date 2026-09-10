# BLUEFOX ODYSSEY — DEV HISTORIQUE

## Sessions du 8 au 11 septembre 2026 — ENE, balise/drones, stabilité, Journal et ARCH-01→29

### Base finale de référence
- HEAD validé pour ARCH-R4 : `296c048c0846198bf6326924ea4d3a9483907f68`
- Parent : `017d646f6e861840b22a63a0a39e69aa231d5b7c` — `ARCH 13-18`
- Commit : `/!\ ARCH R4 19-29     /!\ INDEX.HTML`
- Le correctif ARCH-R4 technique correspond au candidat livré.
- Le même commit contient une modification utilisateur séparée du DOCX Bible, non traitée comme modification technique ARCH-R4.

### ENE-11→14
Commit structurant : `14304c3b00e423df6ba5165b8efc1b91e27eccbf` — `ENE 11-14`.

Acquis :
- ENE-11 : prototype d’accumulateur à l’établi, consommation réelle, recette série ;
- ENE-12 : machine abandonnée, approche puis consommation d’un accumulateur ;
- ENE-13 : Scout existant, accumulateur et balayage current-map ;
- ENE-14 : mesures multi-map, calibration Giant Tree, synthèse Recherche.

### Balise et drones
Commits structurants :
- `4a13bfd4873d27d2e88c9909f6df8531b8ad1c19` — `R2 drone/balise`
- `a9c8e6cbcc8e4ebce33b91fb2a103755c4c53008` — `R3 Drones`
- `49aaf067dcf719fd9f2cd1b9cc6d53e00c980f8e` — `drone repair`
- `f88c222b81220bf1bc19691e3f4df4e76f4daad0` — `Drone repair Fix`

Acquis durables :
- BAL-01→03 ;
- balise déployée portée par le runtime d’objets spéciaux ;
- Kit étendu aux objets transportables concernés sans en devenir propriétaire ;
- DRN-01→04 : Blueprints Scout/Harvest, Harvest distant, priorité, cargo et console Recherche ;
- observation Scout vers historique `OBJECT_SEEN`, sans fan-out missionnel ordinaire implicite.

### Missions GAME complémentaires
Commit `b0479c367e43c3d3e21c8cbfd259b4cd9ebcd82d` — `Game missions+5`.

Ajouts :
- `GAME-collection_samples`
- `GAME-collection_variety`
- `GAME-travel_biomes`
- `GAME-travel_short`
- `GAME-travel_long`

Le runtime a été ajusté pour les activations composites : un trigger ponctuel acquis avant un prérequis lifecycle peut être conservé, tandis que les compteurs multi-événements ne doivent pas être crédités prématurément.

### Stabilité missionnelle R-STAB
Commit `5d83253520e6d4bc07a988214a4d1d2b45eb7589` — `Stabilité - mission runable`.

Décisions validées :
- active/primary ≠ forcément runnable localement ;
- `requiredMapFact` hors-map ne doit pas produire de fausse action ;
- généralisation de `missionTransitionIntent` aux contraintes géographiques missionnelles ;
- secondaire locale perdable : départ différé possible ;
- secondaire terminée/non-runnable : reprise de la transition primaire ;
- transition connue sans route exécutable : pas d’exclusivité stérile ;
- completion gate géographique peut fournir une cible de transition ;
- retry idle réveillable causalement ;
- pas de polling ajouté.

### Journal lazy/persistant
Commit `3000d85dc2a0ea595ddecd1f087d97b621880efe` — `Journal persistant`.

Décisions :
- consolidation uniquement à l’ouverture du Journal ;
- aucune consolidation répétée par scan/mutation DOM ;
- briques persistantes ;
- branche inchangée stable ;
- enrichissement seulement lors d’évolutions significatives ;
- aucun polling.

### ARCH-R1 — ARCH-01→06
Commit `0c15b6c36ef1b657f278505d22d6b5e7a3dbcecf`.

Première passe archéologique ; contextes MSC, observations distinctes et SAME-INSTANCE lorsque requis.

### ARCH-R2 — ARCH-07→12
Commit `a79f8ad5129bcc285cd31e8f1c0f51a5ef7cba05`.

Sites, ruines, strates, carrière et habitat, majoritairement data-only.

### ARCH-R3 — ARCH-13→18
Commit `017d646f6e861840b22a63a0a39e69aa231d5b7c`.

Ajout moteur unique et chirurgical :
- filtre `cuoTypes` OR dans ObjectM0 ;
- `cuoType` historique préservé ;
- autres filtres cumulatifs préservés ;
- ARCH-16 : 18 observations post-activation sur `arch`, `stele`, `tech_relic`, avec au moins une occurrence de chaque catégorie.

### ARCH-R4 — ARCH-19→29
Commit `296c048c0846198bf6326924ea4d3a9483907f68`.

Arbitrages principaux :
- ARCH-19 : machine abandonnée = arme narrative, observation simple ;
- ARCH-20 : nouveau voyage autonome vers la MSC relique pour fermer la runnabilité géographique ;
- ARCH-24 : 15 acquisitions de composants/Core ;
- ARCH-25 : deux nouvelles maps, puis 50 % de la seconde ;
- ARCH-27 : deux objets distincts dans la même MSC foyer ;
- ARCH-29 : cinq unités d’habitation réellement garanties sur trois nouvelles maps.

ARCH-29 :
- les quatre premières unités sont quatre MSC composites distinctes ;
- chaque composite fusionne des briques de ruines existantes dans une **seule identité MSC** ;
- une composition = un objectif ;
- la cinquième unité est `MSC-CUSTOM-HABITAT-RUINE` seule, volontairement gardée pour la fin ;
- aucune généralisation moteur de regroupement de MSC.

### Continuité
- ARCH-01→29 est intégré.
- prochaine continuité ARCH : audit à partir d’ARCH-30.
- ENE-15 doit être réévalué : ARCH-17 est désormais disponible, mais les autres prérequis doivent être prouvés au HEAD.

---

## Historique durable antérieur

### 3 au 8 septembre 2026 — industrialisation massive / Civilisation / Engineering / Workbench
- FLO et réordonnancement de chaîne ;
- GEO-01→07 ;
- COL puis ENV ;
- LOC ;
- SUR et passes anti-régression ;
- GAME R1/R2 ;
- FAUNA ;
- ENE-01→10 ;
- GAME Civilisation / Engineering / Workbench.
- `ProgressionRegistry.grantInventory()` permet un crédit physique sans faux `RESOURCE_COLLECTED`.
- GAME-base reflète le stock physique courant pour les slots stock-backed.
- GAME-fire répétable : 8 bois.
- WORKBENCH sur Crystal : placement joueur, anchor/rotation persistés.

### 2 septembre 2026 — Shelter / Base renforcée
- Camp `MSC-CUSTOM-CAMP`.
- Refuge `MSC-CUSTOM-CAMP-BASE`.
- Base renforcée `MSC-CUSTOM-CAMP-BASE-REINFORCED`.
- Base : 500 fibres + 500 ressources minéral/cristal + 100 études rocheuses.
- spawn avant consommation ; effets idempotents.
- au succès Base, retrait du Refuge autonome précédent, Camp conservé.
- pas de migration automatique de sauvegarde.

### 30 août 2026 — UI / CPU / Survival
- Recherche fenêtrée.
- correction superposition Recherche/Inventaire et écran noir.
- Kit : position ouverte/fermée persistée.
- RuntimeBudget reste l’unique système de throttling.
- Survival conserve rest / food / safety séparés.

### 31 août → 1 septembre 2026 — IMI
Relations durables :
- `REVEAL-ONLY`
- `SAME-DEFINITION`
- `SAME-INSTANCE`

Cycle de preuve à préserver :
`chargement → MissionManager → Planner → ObjectM0 → ActionBridge → interaction → progression`.

### 28 août 2026 — propriétaires
- MissionManager possède le choix missionnel.
- BAC ne le remplace pas.
- BibleRuntime n’écrit pas le lifecycle.
- WorldEngine porte la directive joueur.
- PathPlanner ne force pas une cible directe sans chemin.
- sauvegarde après flush des mémoires différées.

### 23 août 2026 — interaction multi-étapes
- 0..N études dues avant acquisition ;
- acquisition sur la même instance ;
- fan-out conservé ;
- unicité nœud × instance.

### Discipline durable
- HEAD courant seul référentiel technique ;
- BASE partielle exacte ;
- pas de reconstruction du dépôt complet ;
- pas de bridge/propriétaire parallèle ;
- `map-registry.js` protégé ;
- comparaison HEAD/CANDIDAT avant livraison ;
- PASS gameplay uniquement après preuve correspondante.
