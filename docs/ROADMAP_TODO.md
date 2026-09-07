# BlueFox Odyssey — Roadmap et TODO

Mise à jour : **8 septembre 2026**

Cette page est la **seule TODO active**.

## Base courante

- [x] HEAD moteur de référence : `1f20ba014686f5f6eadac78a22b89077bca8e380`.
- [x] Parent validé : `3705d40399437058fcc62a9bc99f2ee96defc75e` — Missions FAUNA R2.
- [x] HEAD GitHub courant = seule base technique.
- [x] MissionManager reste propriétaire du lifecycle et du choix missionnel.
- [x] BibleRuntime reste propriétaire des effets/gates/sites sans reprendre le lifecycle.
- [x] BAC reste arbitre comportemental, sans moteur missionnel parallèle.
- [x] WorldEngine reste propriétaire monde/navigation/directive joueur.
- [x] ProgressionRegistry reste propriétaire du stock physique canonique.
- [x] `map-registry.js` reste protégé.

## Acquis industrialisés depuis la référence du 2 septembre

- [x] FLO-01→07.
- [x] GEO-01→07.
- [x] Paliers COL et missions ENV industrialisés.
- [x] LOC industrialisées.
- [x] SUR industrialisé avec corrections de non-régression.
- [x] GAME R1 : `GAME-flora`, `GAME-research_initial`, `GAME-research_hypothesis`, `GAME-special_investigator`, `GAME-special_archivist`.
- [x] GAME R2 : `GAME-energy`, `GAME-engineering_1`, `GAME-engineering_2`.
- [x] FAU-01→12, dont runtime FAUNA R2.
- [x] ENE-01→10.
- [x] GAME-civilization_1→5.
- [x] GAME-engineering_3→6.
- [x] GAME-fire répétable générique, 8 bois, contexte local Crystal, sans retour forcé.
- [x] Réserve abandonnée persistante : 350 fiber + 175 azure_ferrite + 175 magnetic_ore, prélèvement capacité-aware.
- [x] GAME-base réconciliée avec le stock physique courant sur événements d'inventaire, sans polling.
- [x] `grantInventory()` : crédit d'inventaire sans faux historique COL.
- [x] Blueprint WORKBENCH + construction uniquement sur Crystal après Base.
- [x] Coût WORKBENCH : 20 magnetic_ore + 20 azure_ferrite + 20 resonant_basalt + 20 stellar_iridium + 25 fiber + 10 parts + 20 wood.
- [x] Placement joueur WORKBENCH via l'UI historique généralisée CAMP / REFUGE / WORKBENCH.
- [x] Anchor et rotation réels de l'établi persistés pour les futures missions de retour.

## P0 — ENE-11 → ENE-14

Le prérequis « établi réellement construit sur Crystal » existe désormais.

- [ ] ENE-11 — revenir à l'établi et réaliser le premier accumulateur.
- [ ] Prototype ENE-11 : consommer réellement 12 minerais + 8 cristaux + 6 fibres.
- [ ] Les étapes de « charge » du prototype restent narratives ; ne pas créer d'état physique de charge non nécessaire.
- [ ] À la fin ENE-11, retirer le prototype et débloquer le Blueprint/recette Accumulateur.
- [ ] Recette série : 12 minerais + 8 cristaux + 6 fibres → 1 accumulateur réel.
- [ ] ENE-12 — exiger un accumulateur transporté, approche machine abandonnée, consommation de 1 accumulateur.
- [ ] ENE-12 — alimentation de machine narrative uniquement ; pas de faux `machinePowered`.
- [ ] ENE-13 — réutiliser le scout drone existant, coût 1 accumulateur.
- [ ] ENE-13 — utiliser `DRONE_ACTIVATED` et le chemin canonique `OBJECT_SEEN`; aucune progression drone parallèle.
- [ ] ENE-13 reste current-map only ; aucun scouting inter-map implicite.
- [ ] ENE-14 — réutiliser GEO-07 si déjà complete, sinon demander les mêmes mesures.
- [ ] ENE-14 — Giant Tree par proximité + synthèse finale via Recherche.
- [ ] Tester save/reload, inventaire réel, événements canoniques, consommateurs Research/Kit/drone et non-régression ENE-01→10.
- [ ] ENE-15 différé tant que ARCH-17 / DIP-02 et leur chaîne de prérequis ne sont pas réellement industrialisés.

## P1 — Console drone joueur / Recherche

Demande utilisateur ouverte.

- [ ] Auditer `special-object-runtime.js` avant toute UI.
- [ ] Déplacer/installer la commande joueur des drones dans Recherche, pas dans un nouveau menu parallèle.
- [ ] Réutiliser les drones scout/harvest, recettes et événements existants.
- [ ] Permettre sélection du type de drone disponible.
- [ ] Permettre activation joueur et consultation de l'état/temporisation utile.
- [ ] Raccorder observations/analyses aux événements canoniques et missions compatibles.
- [ ] Préserver l'autonomie/BAC quand le joueur ne donne pas d'ordre.
- [ ] Scouting inter-map : chantier futur séparé seulement après validation current-map.

## P1 — Kit d'expédition générique

Demande utilisateur ouverte.

- [ ] Généraliser le Kit actuellement ration-only.
- [ ] Premier nouveau consommateur : accumulateur.
- [ ] Prévoir le contrat générique pour de futurs objets comme une balise.
- [ ] Un objet activable n'est cliquable que si son propriétaire expose réellement l'action.
- [ ] Le Kit reste UI/transport ; aucune logique métier d'objet dans le Kit.
- [ ] Conserver les rations et leur propriétaire inchangés.
- [ ] Aucun slot vide ; afficher uniquement les items réellement possédés.

## P1 — Journal évolutif lazy et persistant

Dernière règle utilisateur non encore appliquée au HEAD.

- [ ] Calculer la synthèse uniquement à l'ouverture du menu Journal.
- [ ] Aucun recalcul à chaque ObjectEvent/mission/progression.
- [ ] Persister les briques déjà écrites.
- [ ] Une branche sans évolution majeure doit rester textuellement inchangée entre deux ouvertures.
- [ ] Enrichir uniquement les branches ayant reçu une évolution réelle significative.
- [ ] Plus une branche est développée, plus sa brique peut s'enrichir, tout en ne gardant que les éléments majeurs.
- [ ] Préserver l'état ouvert/fermé des thèmes et les pensées du jour.
- [ ] Mesurer l'impact CPU avant/après ; aucun polling ajouté.

## P2 — Performance / cadence décisionnelle

- [ ] Profiler le coût CPU global sur map connue et map dense au HEAD courant.
- [ ] Mesurer la fréquence réelle des évaluations BAC et MissionManager.
- [ ] Vérifier les rescans d'intérêt / ObjectEvents et mutualiser uniquement si le coût est confirmé.
- [ ] Vérifier les recalculs de voyage inconnu tant qu'une intention mémorisée reste valide.
- [ ] Mesurer `retryAfter`, `lastPlanAt`, primaire courante et secondaires runnables sur les pauses anormales.
- [ ] Conserver RuntimeBudget unique ; aucun second système de throttling.

## P2 — Autorité missionnelle / continuité d'activité

- [ ] Reproduire les cas où plusieurs missions restent actives mais BlueFox retombe sur des actions locales non prioritaires.
- [ ] Distinguer primaire non-runnable / arbre terminé en attente de gate / secondaire runnable / retard de réévaluation.
- [ ] Vérifier qu'une mission prioritaire ne perd pas son autorité lors d'une réévaluation ou d'une pause.
- [ ] Ne modifier `hasPrimaryMissionAuthority()` qu'après preuve explicite du défaut.

## P2 — Survival / cohérence énergie-rest-food

- [ ] Conserver `survival-ai-bridge.js` comme propriétaire.
- [ ] Revalider le calcul agrégé énergie à partir de rest / food / safety.
- [ ] Vérifier l'effet réel des rations, micro-pauses et repos longs.
- [ ] Vérifier que les rations restaurent food et une part de Rest inférieure à une vraie pause.
- [ ] Préserver la réduction/désactivation des repos autonomes pendant tutoriel.
- [ ] Rendre la barre Énergie cohérente sans jauge/moteur parallèle.

## P2 — Trigger/cible missionnelle / IMI

- [ ] Revalider `chargement → MissionManager → Planner → ObjectM0 → ActionBridge → interaction → progression`.
- [ ] Préserver `REVEAL-ONLY / SAME-DEFINITION / SAME-INSTANCE`.
- [ ] Couvrir un vrai REVEAL-ONLY multi-définition.
- [ ] Ne pas réintroduire de migration automatique de vieux bindings rejetée.
- [ ] Continuer fan-out et same-instance sur les nouveaux lots.

## P3 — Suite de l'industrialisation missionnelle

- [ ] Après ENE-11→14 et les raccords UI nécessaires, sélectionner le prochain lot selon les prérequis réels du HEAD.
- [ ] Préparer les chaînes nécessaires à ENE-15 seulement dans leur ordre documentaire cohérent.
- [ ] Ne pas sauter directement à ARCH-17 / DIP-02 en contournant leurs prérequis.
- [ ] Continuer à affecter les missions aux patrons génériques existants.
- [ ] Paramétrer plutôt que coder par ID.
- [ ] Réutiliser les MSC existantes avant création nouvelle.
- [ ] Tester toute nouvelle primitive générique sur un consommateur `FUTURE-*` lorsque pertinent.

## P3 — Non-régression permanente

- [ ] T01→T13 : préserver les comportements historiques validés.
- [ ] Navigation joueur règle B après action atomique + reload.
- [ ] Pas de collecte/repos parasite sous mission prioritaire.
- [ ] CUO même instance et fan-out.
- [ ] LOC map-scopé.
- [x] Recherche et Inventaire : correction historique superposition/écran noir à préserver.
- [ ] MSC/sites persistants après reload, y compris WORKBENCH.
- [ ] Save/reload missions, exploration, topologie, recherche, ration et nouveaux items ENE.
- [ ] Préserver FAUNA R2, ENE-01→10 et GAME Civilisation/Engineering dans les prochains cumulatifs.

## P4 — Population / maps / MSC

- [ ] Préserver protections maps tutoriel.
- [ ] Préserver fallback textures 028_1/_2/_3.
- [ ] Préserver règles rareté/faune/îlots.
- [ ] Continuer validation MAP Test / CUO Lab / jeu sur les mêmes données.

## P5 — Audio

- [x] Moteur adaptatif unique.
- [x] Volumes musique / sons séparés.
- [x] Silence musique adaptative pendant intro.
- [x] Fondus de cues validés.
- [ ] Geler après dernière validation d'écoute globale.

## Discipline de livraison

- [x] HEAD courant seule base technique.
- [x] Aucun bridge parallèle si un propriétaire existe.
- [x] BASE partielle exacte : ne jamais reconstruire le dépôt complet pour un chantier ciblé.
- [x] Aucun fichier reconstruit depuis un extrait partiel.
- [x] Diff exact avant livraison.
- [x] Tests producteurs + propriétaires + runtime final + consommateurs.
- [x] Les symptômes servent de réfutation, pas de design.
- [ ] Ne déclarer PASS gameplay qu'après preuve observable correspondante.
