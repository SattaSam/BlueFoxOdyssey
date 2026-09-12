# BlueFox Odyssey — Roadmap et TODO

Mise à jour : **13 septembre 2026**

Cette page est la **seule TODO active**.

## Base courante

- [x] Checkpoint moteur R-HEALTH audité : `560249fb91ed2d5c719a4aafa5eabe88b6ee1e46` — `fix Save`.
- [x] HEAD missionnel vérifié pour la présente synchronisation : `ca619120c502ff6b122d69ad3ed15d0e8dc8a1d0` — `ANN 01-07`.
- [x] HEAD GitHub courant = seule base technique ; le checkpoint R-HEALTH reste une référence de santé, pas une base alternative.
- [x] MissionManager reste propriétaire du lifecycle et du choix missionnel.
- [x] BibleRuntime reste propriétaire des effets/gates/sites sans reprendre le lifecycle.
- [x] BAC reste arbitre comportemental.
- [x] WorldEngine reste propriétaire monde/navigation/directive joueur.
- [x] ProgressionRegistry reste propriétaire du stock physique.
- [x] RuntimeBudget reste l'unique throttling adaptatif.
- [x] `map-registry.js` reste protégé.
- [x] R-HEALTH : 13 VERT + 3 VERT ÉVOLUÉ + 4 ORANGE + 0 ROUGE systémique démontré.
- [x] Bible documentaire synchronisée : **255/255 définitions moteur représentées et cochées** au HEAD `ca619120…`.

## Acquis désormais clôturés / à préserver

- [x] FLO-01→07.
- [x] GEO-01→07.
- [x] COL + ENV.
- [x] LOC-01→17.
- [x] SUR-01/02/03/05/06/07 + SURPLUS.
- [x] GAME R1/R2.
- [x] GAME-civilization_1→5.
- [x] FAU-01→12 + extensions FAUNA validées.
- [x] Templates FAUNA répétables par espèce : FAU-01A / FAU-03A / FAU-05A / FAU-11A.
- [x] ENE-01→14 + ENE-15-A/B/C.
- [x] GAME-engineering_1→6 + GAME-fire.
- [x] Réserve abandonnée + `grantInventory()` sans faux historique COL.
- [x] WORKBENCH sur Crystal et placement joueur persistant.
- [x] BAL-01→03.
- [x] DRN-01→05.
- [x] `GAME-collection_samples`, `GAME-collection_variety`, `GAME-collection_reserves`, `GAME-exploration_cartographer`, `GAME-exploration_complete`, `GAME-travel_biomes`, `GAME-exploration_total`, `GAME-exploration_total_20`, `GAME-travel_short`, `GAME-travel_long`.
- [x] Fauna réputation répétable.
- [x] R-STAB : runnabilité missionnelle, transitions géographiques, libération des primaires stériles, retry causal.
- [x] Journal lazy/persistant : consolidation à l'ouverture uniquement, sans polling.
- [x] ARCH-01→40 présentes au HEAD.
- [x] CONTACT-01→15 présentes au HEAD.
- [x] DIP-01→03 présentes au HEAD.
- [x] `GAME-contact_first`, `GAME-contact_cautious`, `GAME-contact_ambassador`.
- [x] ANN-01→07 industrialisées ; chaîne canonique : `ANN-04 → ANN-06 → ANN-03 → ANN-02 → ANN-05 → ANN-01 → ANN-07`.
- [x] SMART-CAMP ANN-06 : Camp réel, placement joueur, stockage partagé, coût 10 bois + 10 fibres, distance >10 maps de l'infrastructure la plus proche.
- [x] ANN-01 : seuils d'exploration 10 % → 25 % → 60 % ; ancienne valeur 44 supprimée.
- [x] ANN-07 : historique réel de faune nocturne, sans réobservation artificielle.
- [x] Protection d'hydratation missionnelle au reload (`560249…`).
- [x] R-HEALTH transversal : aucune panne systémique démontrée.

## P0 — Prochaine industrialisation

- [ ] Choisir le prochain lot parmi les **projets encore sans coche / sans définition moteur** de la Bible documentaire synchronisée, et non parmi des missions déjà présentes au catalogue.
- [ ] Confronter le lot choisi au HEAD courant : propriétaires, prérequis, déclencheurs, CUO/MSC, événements et consommateurs.
- [ ] Réutiliser les mécanismes existants avant toute extension moteur.
- [ ] Si une capacité moteur manque réellement, arrêter l'intégration missionnelle et ouvrir un chantier moteur séparé selon l'IMI.
- [ ] Préserver toutes les branches déjà intégrées, notamment ARCH / CONTACT / DIP / ENE / ANN / FAUNA / BAL / DRN.

## P0 — Barrière de validation / tests historiques

- [x] Abandonner le nombre brut de tests rouges comme indicateur unique de santé.
- [ ] Lors d'un échec préexistant pertinent, classer avant correction :
  - test/API/fixture obsolète ;
  - harness incomplet ;
  - contrat historique remplacé ;
  - panne runtime/gameplay actuelle reproduite.
- [ ] Ne jamais modifier le moteur uniquement pour satisfaire un attendu historique devenu faux.
- [ ] Pour chaque ZIP, vérifier d'abord la préservation de la carte R-HEALTH du HEAD et l'absence de nouvelle panne observable.
- [ ] Si une panne actuelle est reproduite, ouvrir un chantier ciblé sur son propriétaire réel.

## P1 — Domaines ORANGE R-HEALTH

Ces éléments ne sont pas déclarés cassés ; leur validation complète reste insuffisante.

- [ ] Rejouer/observer un parcours tutoriel T01→T13 complet lorsque le prochain chantier traverse ce périmètre.
- [ ] Revalider génération/population des maps et protections tutoriel lorsque le chantier touche maps/biomes/population.
- [ ] Revalider visuellement l'UI réelle : Recherche, Inventaire, Journal, overlays et transitions de panneaux.
- [ ] Revalider en jeu audio / caméra / déplacement / physique lors d'une passe globale adaptée.

## P1 — Relations / civilisations

- [x] Réactions NPC à l'approche raccordées au runtime relationnel.
- [x] Dialogue/contact actif protégé contre fuite automatique concurrente.
- [x] Réputation et commerce consomment les propriétaires canoniques.
- [x] Récompenses relationnelles peuvent produire connaissances/blueprints réels.
- [x] CONTACT-10→15 définies pour la seconde civilisation avec sélection persistante et retour vers CONTACT-10 en cas d'échec significatif.
- [ ] Continuer à tester les raccords CONTACT/DIP lors des prochains lots sans déplacer le comportement NPC dans le moteur de mission.

## P1 — Drones / balise / réseau

- [x] Balise déployable et missions BAL-01→03.
- [x] Blueprints Scout/Harvest et chaîne DRN-01→05.
- [x] Console réseau côté Recherche.
- [x] Récolte distante et dépôt cargo raccordés au runtime existant.
- [ ] Revalider en jeu les usages multi-map longue durée, reload et cas de plusieurs drones simultanés avant d'étendre davantage le réseau.
- [ ] Toute nouvelle capacité drone doit rester dans `special-object-runtime.js` ou ses propriétaires existants, jamais dans un runtime parallèle.

## P1 — Save / reload

- [x] Protection contre l'écrasement d'une mission sauvegardée dont la définition n'est pas encore chargée.
- [x] Hydratation conservée dans MissionManager.
- [ ] Revalider lors des prochains chantiers Save : changement de slot, reload avec plusieurs missions actives, sites/MSC persistants, constructions, directive joueur et réseau drone/balise.
- [ ] Ne pas réintroduire de migration artificielle d'états rejetée par le runtime.

## P1 — Kit d'expédition

- [x] Le Kit n'est plus limité aux seules rations : accumulateur et balise peuvent être représentés comme objets transportables.
- [x] L'activation reste déléguée au propriétaire métier.
- [x] Aucun slot vide pour un item absent.
- [ ] Toute nouvelle famille d'objet activable doit être ajoutée par généralisation minimale, uniquement lorsqu'un consommateur réel l'exige.

## P1 — Journal

- [x] Calcul/consolidation à l'ouverture uniquement.
- [x] Aucun recalcul par simple événement/mutation UI.
- [x] Briques persistantes.
- [x] Branche inchangée = texte stable.
- [x] Enrichissement seulement après évolution significative.
- [x] Pas de polling ajouté.
- [x] ANN-07 raccorde son premier catalogue à la branche Faune/Nature sans créer de journal parallèle.
- [ ] Continuer à vérifier la stabilité du contenu au fur et à mesure de l'industrialisation des nouvelles branches.

## P2 — Performance globale

R-STAB et R-HEALTH ne remplacent pas un profilage global.

- [ ] Profiler le coût CPU sur map connue et map dense au HEAD courant.
- [ ] Mesurer fréquence BAC/MissionManager/ObjectEvents.
- [ ] Vérifier les rescans d'intérêt et caches d'approche.
- [ ] Vérifier les coûts lorsque plusieurs drones distants et missions actives coexistent.
- [ ] Conserver RuntimeBudget unique ; aucun second système de throttling.

## P2 — Survival / énergie-rest-food

- [ ] Revalider l'effet réel des rations, micro-pauses et repos longs lors d'une passe gameplay adaptée.
- [ ] Préserver la distinction rest / food / safety.
- [ ] Ne pas transformer l'énergie affichée en deuxième état autoritaire.
- [ ] Aucun changement de seuil sans preuve runtime.

## P2 — IMI / interactions

- [ ] Continuer à revalider le cycle `MissionManager → Planner → ObjectM0 → ActionBridge → interaction → progression` sur les nouveaux lots.
- [x] SAME-INSTANCE encore présent au checkpoint R-HEALTH.
- [x] Fan-out encore présent au checkpoint R-HEALTH.
- [ ] Préserver `REVEAL-ONLY / SAME-DEFINITION / SAME-INSTANCE`.
- [ ] Ne pas réintroduire de migration automatique de vieux bindings.
- [x] `cuoTypes` OR optionnel préserve `cuoType` historique.

## P3 — Non-régression permanente

- [ ] T01→T13.
- [ ] Navigation joueur règle B + reload.
- [ ] Pas de collecte/repos parasite sous mission prioritaire.
- [x] SAME-INSTANCE et fan-out présents au R-HEALTH.
- [ ] LOC map-scopé.
- [x] Recherche / Inventaire : correction historique écran noir/superposition à préserver.
- [ ] MSC/sites persistants après reload.
- [ ] WORKBENCH.
- [ ] Accumulateurs / balises / drones / cargo.
- [x] Journal lazy/persistant confirmé structurellement.
- [ ] ARCH-01→40.
- [ ] CONTACT/DIP.
- [ ] ENE-15-A/B/C.
- [ ] ANN-01→07, notamment placement manuel SMART-CAMP, consommation réelle des expérimentations et fallback faune nocturne.

## P4 — Maps / MSC

- [ ] Préserver protections maps tutoriel.
- [ ] Préserver rareté/faune/îlots.
- [ ] Continuer MAP Test / CUO Lab lorsque le chantier touche au décor.
- [ ] Conserver le principe : une composition qui doit compter comme une unité missionnelle utilise une MSC composite unique, pas un moteur de groupement parallèle.
- [x] `MSC-CUSTOM-SMART-CAMP` enregistrée comme donnée MSC ; le comportement de Camp reste porté par le site `kind:"camp"`.

## P5 — Audio

- [x] Moteur adaptatif unique.
- [x] Volumes musique / sons séparés.
- [x] Silence musique adaptative pendant intro.
- [x] Fondus de cues validés historiquement.
- [ ] Revalidation globale d'écoute avant gel définitif.

## Discipline de livraison

- [x] HEAD courant seule base technique.
- [x] Aucun bridge parallèle si un propriétaire existe.
- [x] BASE partielle exacte ; ne jamais reconstruire le dépôt complet pour un chantier ciblé.
- [x] Aucun fichier reconstruit depuis un extrait partiel.
- [x] Diff exact avant livraison.
- [x] Tests producteurs + propriétaires + runtime + consommateurs.
- [x] Les symptômes servent de réfutation, pas de design.
- [x] Les tests historiques rouges ne définissent pas à eux seuls l'état de santé.
- [ ] Ne déclarer PASS gameplay qu'après preuve observable correspondante.
