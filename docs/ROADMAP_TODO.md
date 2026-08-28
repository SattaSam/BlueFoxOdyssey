# BlueFox Odyssey — Roadmap et TODO

Mise à jour : **28 août 2026**

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
