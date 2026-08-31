# BlueFox Odyssey — Roadmap et TODO

Mise à jour : **30 août 2026**

Cette page est la **seule TODO active**.

## Base de reprise

- [x] Checkpoint courant : `c75fa77b2afe59a0d3dc41fc00453c3dc47a1d64`.
- [x] Cumulatifs intermédiaires 1→4 abandonnés comme base de confiance.
- [x] MissionManager restauré comme propriétaire du lifecycle et du choix missionnel.
- [x] Suppression du choix missionnel concurrent dans `behavior-arbitration-integration.js`.
- [x] BibleRuntime ramené à l’interprétation/effets/gates, sans propriété lifecycle.
- [x] `bible-map-prescription-v19.js` ne relance plus un second retour connu.
- [x] Directive joueur de navigation persistante dans WorldEngine ; règle B validée.
- [x] Absence de chemin distinguée d’un chemin valide ; `navigation-failed` produit par CharacterController.
- [x] Flush des mémoires différées avant snapshot.
- [x] Un seul nouveau dévoilement par réévaluation causale.
- [x] Unicité étude nœud × instance et fan-out ObjectM0 préservés.
- [x] Documentation architecture/propriétaires mise à jour.

## P0 — Chantiers bloquants immédiats

### T11 — retour autonome historiquement validé
- [ ] Retrouver le dernier commit/patch réellement validé où le cycle T11 revenait physiquement à l’abri.
- [ ] Comparer la chaîne historique au HEAD `c75fa77`.
- [ ] Identifier le maillon disparu sans reconstruire un nouveau système de retour.
- [ ] Vérifier que Shelter ne reprend aucune collecte locale une fois le retour décidé.
- [ ] Préserver le différé seulement pour une mission réellement utile sur la même map.
- [ ] Valider route connue → gate → transition → abri → completion.
- [ ] Réfuter sur une mission fictive `FUTURE-RETURN`.

### T13 — autocraft ration générique
- [ ] Tracer `CRAFT → MissionPlanner → BAC → propriétaire craft → inventaire → événement → progression`.
- [ ] Vérifier `allowsAutonomousRationCraft` et capacité `ration-craft` au bon moment.
- [ ] Vérifier ressources réelles et accès inventaire/camp.
- [ ] Vérifier production réelle de ration et incrément `rations.craftedTotal`.
- [ ] Vérifier progression du nœud missionnel depuis l’événement/compteur canonique.
- [ ] Réfuter avec une future mission de craft sans branche T13.

## P1 — Non-régression du checkpoint
- [ ] T01→T10 : conserver les comportements historiques validés.
- [ ] Navigation joueur règle B après action atomique.
- [ ] Reload de la directive joueur.
- [ ] Pas de collecte/repos parasite sous mission prioritaire.
- [ ] CUO même instance et fan-out.
- [ ] LOC map-scopé.
- [ ] Recherche et Inventaire sans superposition/écran noir.
- [ ] Traveling intro et locomotion inchangés hors chantier dédié.
- [ ] MSC persistantes après reload.
- [ ] Save/reload missions, exploration, topologie, recherche et ration.

## P2 — Recherche / craft / logistique
- [ ] Recette acquise visible uniquement après unlock.
- [ ] Ressources vérifiées dans les vrais inventaires.
- [ ] Consommation réelle.
- [ ] Production objet réel dans le compartiment prévu.
- [ ] Aucun slot vide parasite.
- [ ] Aucun deuxième moteur de craft.

## P3 — Industrialisation missions
- [ ] Affecter les missions à des patrons génériques.
- [ ] Paramétrer plutôt que coder par ID.
- [ ] Conserver fan-out et max 1 révélation par événement.
- [ ] Réutiliser les MSC existantes avant création nouvelle.
- [ ] Valider chaque nouvelle primitive sur mission fictive `FUTURE-*`.
- [ ] Industrialiser par lots seulement après T11/T13.

## P4 — Population / maps / MSC
- [ ] Préserver protections maps tutoriel.
- [ ] Préserver fallback textures 028_1/_2/_3.
- [ ] Préserver règles rareté/faune/îlots.
- [ ] Continuer validation MAP_Test / CUO Lab / jeu sur mêmes données.

## P5 — Audio
- [x] Moteur adaptatif unique.
- [x] Volumes musique / sons séparés.
- [x] Silence musique adaptative pendant intro.
- [x] Fondus de cues validés, notamment fin de `drift_note_D2_18-3s`.
- [ ] Geler après dernière validation d’écoute globale.

## Discipline de livraison
- [x] HEAD courant seule base technique.
- [x] Aucun bridge parallèle si un propriétaire existe.
- [x] Aucun fichier reconstruit depuis un extrait partiel.
- [x] Diff exact avant livraison.
- [x] Tests producteurs + propriétaires + runtime final + consommateurs.
- [x] Les symptômes servent de réfutation, pas de design.
- [ ] Ne déclarer PASS gameplay qu’après preuve observable correspondante.


---

## Mise à jour 30 août 2026 — base courante et chantiers différés

### Base courante
- [x] HEAD validé : `a62c25ad75fc63dce4546dfe0bd8861d45842376`.
- [x] Passe 4 Recherche/Inventaire : plus d’écran noir / conflit React sur les cycles de panneaux testés en jeu.
- [x] T13 : craft réel + excursion autonome + deuxième nouvelle map + Bosquet bio validés en jeu.

### P0 — Performance / cadence décisionnelle
- [ ] Profiler le coût CPU global sur map connue et map dense.
- [ ] Vérifier la fréquence réelle des évaluations BAC et MissionManager.
- [ ] Éviter le recalcul de `missionUnknownTravelPlan()` tant qu’une intention de voyage mémorisée reste valide.
- [ ] Mesurer les rescans de `ObjectEvents.history()` pendant une décision BAC et mutualiser au niveau de la décision si le coût est confirmé.
- [ ] Conserver le garde-fou existant : shortlist de 6 candidats pour le coût de route + cache d’approche court.
- [ ] Vérifier si `RationPolicy.autonomyCandidate()` contribue au coût après T12/T13.
- [ ] Ne pas créer de deuxième RuntimeBudget : utiliser le propriétaire `runtime-budget.js` si un throttling supplémentaire est réellement nécessaire.

### P0 — Autorité missionnelle / temps entre actions
- [ ] Reproduire le cas : plusieurs missions compatibles + cibles proches, mais délai prolongé « choix de la prochaine action ».
- [ ] Mesurer `retryAfter`, `lastPlanAt`, primaire courante et secondaires runnables.
- [ ] Identifier pourquoi le BAC peut reprendre des actions locales aléatoires alors que des missions restent actives.
- [ ] Distinguer primaire temporairement non-runnable, arbre terminé en attente de gate, secondaire runnable, et retard de réévaluation.
- [ ] Réduire les attentes uniquement après localisation ; ne pas supprimer globalement les gardes de cadence.

### P1 — Survival / cohérence des jauges
- [ ] Conserver `survival-ai-bridge.js` comme propriétaire.
- [ ] Documenter et tester le calcul `energy = 0,55 rest + 0,32 food + 0,13 safety`.
- [ ] Lisser les écarts excessifs entre repos, alimentation et énergie sans fusionner les besoins.
- [ ] Vérifier l’effet réel des rations, micro-pauses, repos et actions sur les trois composantes.
- [ ] Rendre la barre Énergie plus cohérente avec les décisions réellement prises par Survival/BAC.
- [ ] Réévaluer le déclenchement `preventiveMicroRest` seulement sur preuve runtime.

---

## Mise à jour 1 septembre 2026 — chantier trigger/cible missionnelle

### Base de clôture
- [x] HEAD de référence avant clôture : `e12558f40f38129e4d3b4a3e6d85f54b3a2cac6f`.
- [x] Les correctifs moteur/runtime produits pendant le chantier sont rejetés.
- [x] Seule la mise à jour IMI est retenue pour commit.
- [x] Prochaine session : repartir du HEAD GitHub propre après le commit IMI.

### P0 — SUR-03 / relation trigger-cible
- [x] Cause historique démontrée : ancien `bibleTarget:SUR-03` implicite en `binding:"definition"` sur le premier buisson.
- [x] Preuve console : MissionManager propose `SUR-03:studyPlants` / `analyze`.
- [x] Preuve console : `ActionBridge.execute()` retourne `false` avant `targetInteraction()`.
- [x] Preuve console : neutraliser temporairement le binding permet à ObjectM0 de sélectionner une autre définition (`DOC-NAT-TREE-L-002`).
- [x] Les migrations automatiques testées pendant la session ne sont pas validées gameplay.
- [ ] Reprendre depuis le HEAD propre.
- [ ] Couvrir le cycle complet `chargement → MissionManager → Planner → ObjectM0 → ActionBridge → interaction → progression`.
- [ ] Préserver les vrais cas `SAME-DEFINITION` et `SAME-INSTANCE`.
- [ ] Valider aussi une mission `REVEAL-ONLY` multi-définition.
- [ ] Ne déclarer PASS qu'après validation en jeu de la sauvegarde réelle.

### Industrialisation
- [x] IMI : relation explicite `REVEAL-ONLY / SAME-DEFINITION / SAME-INSTANCE`.
- [ ] Ne pas compenser par une retouche manuelle massive du corpus documentaire.
- [ ] Ne pas réintroduire de migration runtime sans preuve complète du cycle de chargement.
