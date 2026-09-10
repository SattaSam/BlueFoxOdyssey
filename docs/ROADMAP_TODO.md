# BlueFox Odyssey — Roadmap et TODO

Mise à jour : **11 septembre 2026**

Cette page est la **seule TODO active**.

## Base courante

- [x] HEAD technique de référence : `296c048c0846198bf6326924ea4d3a9483907f68` — ARCH-R4 19→29.
- [x] Parent : `017d646f6e861840b22a63a0a39e69aa231d5b7c` — ARCH 13→18.
- [x] HEAD GitHub courant = seule base technique.
- [x] MissionManager reste propriétaire du lifecycle et du choix missionnel.
- [x] BibleRuntime reste propriétaire des effets/gates/sites sans reprendre le lifecycle.
- [x] BAC reste arbitre comportemental.
- [x] WorldEngine reste propriétaire monde/navigation/directive joueur.
- [x] ProgressionRegistry reste propriétaire du stock physique.
- [x] RuntimeBudget reste l’unique throttling adaptatif.
- [x] `map-registry.js` reste protégé.

## Acquis désormais clôturés

- [x] FLO-01→07.
- [x] GEO-01→07.
- [x] COL + ENV.
- [x] LOC.
- [x] SUR.
- [x] GAME R1/R2.
- [x] FAU-01→12 + runtime FAUNA validé.
- [x] ENE-01→14.
- [x] GAME-civilization_1→5.
- [x] GAME-engineering_3→6 + GAME-fire.
- [x] Réserve abandonnée + `grantInventory()` sans faux historique COL.
- [x] WORKBENCH sur Crystal et placement joueur persistant.
- [x] BAL-01→03.
- [x] DRN-01→04.
- [x] `GAME-collection_samples`, `GAME-collection_variety`, `GAME-travel_biomes`, `GAME-travel_short`, `GAME-travel_long`.
- [x] Fauna réputation répétable.
- [x] R-STAB : runnabilité missionnelle, transitions géographiques, libération des primaires stériles, retry causal.
- [x] Journal lazy/persistant : consolidation à l’ouverture uniquement, sans polling.
- [x] ARCH-R1 : ARCH-01→06.
- [x] ARCH-R2 : ARCH-07→12.
- [x] ARCH-R3 : ARCH-13→18 + `cuoTypes` M0 chirurgical.
- [x] ARCH-R4 : ARCH-19→29 + quatre MSC composites d’habitation + habitat complet final.

## P0 — Suite de l’industrialisation ARCH

- [ ] Auditer la continuité documentaire à partir de **ARCH-30**.
- [ ] Définir le prochain lot uniquement après confrontation des objectifs avec les CUO/MSC/propriétaires du HEAD.
- [ ] Réutiliser les MSC existantes avant création de nouvelles compositions.
- [ ] Si une composition visuelle doit compter comme une seule unité missionnelle, préférer une MSC composite data-only plutôt qu’un moteur de groupement.
- [ ] Préserver le contrat `cuoTypes` sans l’élargir tant qu’un nouveau besoin n’est pas prouvé.
- [ ] Tester runnabilité géographique, présence réelle des cibles et fermeture des dépendances avant livraison.

## P0 — ENE-15 / dépendances

- [x] ARCH-17 est industrialisée.
- [ ] Vérifier les autres prérequis réels d’ENE-15, notamment la chaîne documentaire/runtime associée à DIP-02, avant toute intégration.
- [ ] Ne pas contourner un prérequis absent par un trigger artificiel.

## P1 — Drones / balise / réseau

- [x] Balise déployable et missions BAL-01→03.
- [x] Blueprints Scout/Harvest et chaîne DRN-01→04.
- [x] Console réseau côté Recherche.
- [x] Récolte distante et dépôt cargo raccordés au runtime existant.
- [ ] Revalider en jeu les usages multi-map longue durée, reload et cas de plusieurs drones simultanés avant d’étendre davantage le réseau.
- [ ] Toute nouvelle capacité drone doit rester dans `special-object-runtime.js` ou ses propriétaires existants, jamais dans un runtime parallèle.

## P1 — Kit d’expédition

- [x] Le Kit n’est plus limité aux seules rations : accumulateur et balise peuvent être représentés comme objets transportables.
- [x] L’activation reste déléguée au propriétaire métier.
- [x] Aucun slot vide pour un item absent.
- [ ] Toute nouvelle famille d’objet activable doit être ajoutée par généralisation minimale, uniquement lorsqu’un consommateur réel l’exige.

## P1 — Journal

- [x] Calcul/consolidation à l’ouverture uniquement.
- [x] Aucun recalcul par simple événement/mutation UI.
- [x] Briques persistantes.
- [x] Branche inchangée = texte stable.
- [x] Enrichissement seulement après évolution significative.
- [x] Pas de polling ajouté.
- [ ] Continuer à vérifier la stabilité du contenu au fur et à mesure de l’industrialisation des nouvelles branches.

## P2 — Performance globale

R-STAB a fermé la partie runnabilité/retry missionnelle, mais le profilage global reste distinct.

- [ ] Profiler le coût CPU sur map connue et map dense au HEAD courant.
- [ ] Mesurer fréquence BAC/MissionManager/ObjectEvents.
- [ ] Vérifier les rescans d’intérêt et caches d’approche.
- [ ] Vérifier les coûts lorsque plusieurs drones distants et missions actives coexistent.
- [ ] Conserver RuntimeBudget unique ; aucun second système de throttling.

## P2 — Survival / énergie-rest-food

- [ ] Conserver `survival-ai-bridge.js` comme propriétaire.
- [ ] Revalider l’effet réel des rations, micro-pauses et repos longs.
- [ ] Préserver la distinction rest / food / safety.
- [ ] Ne pas transformer l’énergie affichée en deuxième état autoritaire.
- [ ] Aucun changement de seuil sans preuve runtime.

## P2 — IMI / interactions

- [ ] Continuer à revalider le cycle `MissionManager → Planner → ObjectM0 → ActionBridge → interaction → progression` sur les nouveaux lots.
- [ ] Préserver `REVEAL-ONLY / SAME-DEFINITION / SAME-INSTANCE`.
- [ ] Préserver fan-out.
- [ ] Ne pas réintroduire de migration automatique de vieux bindings.
- [x] `cuoTypes` OR optionnel ajouté sans modifier `cuoType` historique.

## P3 — Non-régression permanente

- [ ] T01→T13.
- [ ] Navigation joueur règle B + reload.
- [ ] Pas de collecte/repos parasite sous mission prioritaire.
- [ ] SAME-INSTANCE et fan-out.
- [ ] LOC map-scopé.
- [x] Recherche / Inventaire : correction historique écran noir/superposition à préserver.
- [ ] MSC/sites persistants après reload.
- [ ] WORKBENCH.
- [ ] Accumulateurs / balises / drones / cargo.
- [ ] Journal persistant.
- [ ] ARCH-01→29, notamment ARCH-20 runnabilité et ARCH-29 cinq unités réellement garanties.

## P4 — Maps / MSC

- [ ] Préserver protections maps tutoriel.
- [ ] Préserver rareté/faune/îlots.
- [ ] Continuer MAP Test / CUO Lab lorsque le chantier touche au décor.
- [x] ARCH-29 : quatre MSC composites uniques + `MSC-CUSTOM-HABITAT-RUINE` finale, sans moteur de groupement.

## P5 — Audio

- [x] Moteur adaptatif unique.
- [x] Volumes musique / sons séparés.
- [x] Silence musique adaptative pendant intro.
- [x] Fondus de cues validés.
- [ ] Geler après dernière validation d’écoute globale.

## Discipline de livraison

- [x] HEAD courant seule base technique.
- [x] Aucun bridge parallèle si un propriétaire existe.
- [x] BASE partielle exacte ; ne jamais reconstruire le dépôt complet pour un chantier ciblé.
- [x] Aucun fichier reconstruit depuis un extrait partiel.
- [x] Diff exact avant livraison.
- [x] Tests producteurs + propriétaires + runtime + consommateurs.
- [x] Les symptômes servent de réfutation, pas de design.
- [ ] Ne déclarer PASS gameplay qu’après preuve observable correspondante.
