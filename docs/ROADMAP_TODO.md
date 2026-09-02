# BlueFox Odyssey — Roadmap et TODO

Mise à jour : **2 septembre 2026**

Cette page est la **seule TODO active**.

## Base courante

- [x] Commit moteur validé : `8b34d8912667f02140c0c2999b1dfa3f37a8e9ee` — `spawn base fix`.
- [x] HEAD GitHub courant = seule base technique.
- [x] Aucun nouveau recovery checkpoint pour cette clôture.
- [x] MissionManager reste propriétaire du lifecycle et du choix missionnel.
- [x] BibleRuntime reste propriétaire des effets/gates/sites sans reprendre le lifecycle.
- [x] BAC reste arbitre comportemental, sans moteur missionnel parallèle.
- [x] Directive joueur de navigation persistante dans WorldEngine ; règle B conservée.
- [x] IMI : distinction `REVEAL-ONLY / SAME-DEFINITION / SAME-INSTANCE`.
- [x] Migration automatique de vieux bindings rejetée et non réintroduite.

## Acquis validés — Camp / Shelter / Base renforcée

- [x] Camp `MSC-CUSTOM-CAMP` conservé.
- [x] Shelter activable après Camp et progression missionnelle préservée.
- [x] Double interaction missionnelle préservée pour les plantes concernées.
- [x] Fin Shelter automatique : pas d'action BlueFox finale fictive.
- [x] Refuge `MSC-CUSTOM-CAMP-BASE` spawn au preset canonique dès le premier rendu.
- [x] Base `GAME-base` activable après completion Shelter.
- [x] Base : 500 fibres + 500 minéraux/cristaux + 100 études rocheuses.
- [x] Matching `subject:mineral` raccordé aux propriétaires existants.
- [x] Progression historique et stock physique courant distingués.
- [x] Stock insuffisant : mission reste active, réévaluation événementielle, pas de polling ajouté.
- [x] Spawn avant consommation ; échec spawn = aucune consommation.
- [x] Consommation unique/idempotente.
- [x] Preset canonique prioritaire sur l'autonomous placement lorsqu'il existe.
- [x] Faux positif du gate Base éliminé : finalisation prouvée par le site réellement établi par la mission.
- [x] Base crystal : `(-2.7567, 0.25, 4.768)`.
- [x] Au succès Base : Refuge autonome supprimé visuellement, colliders retirés et `sites.refuge` supprimé.
- [x] Reload final : Camp + Base renforcée, sans retour du Refuge autonome.
- [x] Spawn final validé en jeu puis commit moteur vérifié bit-for-bit.

## P0 — Performance / cadence décisionnelle

- [ ] Profiler le coût CPU global sur map connue et map dense.
- [ ] Mesurer la fréquence réelle des évaluations BAC et MissionManager.
- [ ] Vérifier les rescans d'intérêt / ObjectEvents pendant une décision et mutualiser uniquement si le coût est confirmé.
- [ ] Vérifier les recalculs de voyage inconnu tant qu'une intention mémorisée reste valide.
- [ ] Mesurer `retryAfter`, `lastPlanAt`, primaire courante et secondaires runnables sur les pauses anormales entre actions.
- [ ] Conserver le garde-fou existant de shortlist/cache de route ; ne pas créer un deuxième RuntimeBudget.

## P0 — Autorité missionnelle / continuité d'activité

- [ ] Reproduire les cas où plusieurs missions restent actives mais BlueFox retombe sur des actions locales non prioritaires.
- [ ] Distinguer : primaire non-runnable, arbre terminé en attente de gate, secondaire runnable, retard de réévaluation.
- [ ] Vérifier qu'une mission prioritaire ne perd pas son autorité lors d'une réévaluation ou d'une pause.
- [ ] Réduire les attentes uniquement après localisation du propriétaire fautif ; ne pas supprimer globalement les gardes de cadence.

## P1 — Survival / cohérence énergie

- [ ] Conserver `survival-ai-bridge.js` comme propriétaire.
- [ ] Documenter/tester le calcul agrégé énergie à partir de rest / food / safety.
- [ ] Vérifier l'effet réel des rations, micro-pauses et repos longs sur les composantes utilisées par Survival/BAC.
- [ ] Rendre la barre Énergie cohérente avec les décisions sans fusionner les besoins.
- [ ] Réévaluer `preventiveMicroRest` uniquement sur preuve runtime.

## P1 — Trigger/cible missionnelle / IMI

- [ ] Couvrir le cycle complet `chargement → MissionManager → Planner → ObjectM0 → ActionBridge → interaction → progression`.
- [ ] Préserver les vrais cas `SAME-DEFINITION` et `SAME-INSTANCE`.
- [ ] Valider une mission `REVEAL-ONLY` multi-définition.
- [ ] Ne pas compenser par une retouche manuelle massive du corpus documentaire.
- [ ] Ne pas réintroduire de migration runtime de sauvegarde sans preuve complète.

## P1 — Non-régression gameplay

- [ ] T01→T10 : conserver les comportements historiques validés.
- [ ] Navigation joueur règle B après action atomique + reload.
- [ ] Pas de collecte/repos parasite sous mission prioritaire.
- [ ] CUO même instance et fan-out.
- [ ] LOC map-scopé.
- [ ] Recherche et Inventaire sans superposition/écran noir.
- [ ] Traveling intro et locomotion inchangés hors chantier dédié.
- [ ] MSC/sites persistants après reload.
- [ ] Save/reload missions, exploration, topologie, recherche et ration.

## P2 — Recherche / craft / logistique

- [ ] Recette acquise visible uniquement après unlock.
- [ ] Ressources vérifiées dans les vrais inventaires.
- [ ] Consommation réelle et production dans le compartiment prévu.
- [ ] Aucun slot vide parasite.
- [ ] Aucun deuxième moteur de craft.

## P3 — Industrialisation missions

- [ ] Affecter les missions aux patrons génériques existants.
- [ ] Paramétrer plutôt que coder par ID.
- [ ] Conserver fan-out et max 1 révélation par événement.
- [ ] Réutiliser les MSC existantes avant création nouvelle.
- [ ] Valider les nouvelles primitives génériques sur mission fictive `FUTURE-*`.
- [ ] Industrialiser par lots seulement après preuve des consommateurs réels.

## P4 — Population / maps / MSC

- [ ] Préserver protections maps tutoriel.
- [ ] Préserver fallback textures 028_1/_2/_3.
- [ ] Préserver règles rareté/faune/îlots.
- [ ] Continuer validation MAP_Test / CUO Lab / jeu sur les mêmes données.

## P5 — Audio

- [x] Moteur adaptatif unique.
- [x] Volumes musique / sons séparés.
- [x] Silence musique adaptative pendant intro.
- [x] Fondus de cues validés.
- [ ] Geler après dernière validation d'écoute globale.

## Discipline de livraison

- [x] HEAD courant seule base technique.
- [x] Aucun bridge parallèle si un propriétaire existe.
- [x] Aucun fichier reconstruit depuis un extrait partiel.
- [x] Diff exact avant livraison.
- [x] Tests producteurs + propriétaires + runtime final + consommateurs.
- [x] Les symptômes servent de réfutation, pas de design.
- [ ] Ne déclarer PASS gameplay qu'après preuve observable correspondante.
