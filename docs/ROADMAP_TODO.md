# BlueFox Odyssey — Roadmap et TODO

Mise à jour : **23 août 2026**

Cette page est la **seule TODO active**.

## Base de reprise

* [x] Base courante auditée : `b757aa457ce5eca4a994ff8f35dcc482aca5c77f`.
* [x] Restauration complète de `save-ui-bridge.js` après troncature accidentelle.
* [x] Correction dirty-state autosave.
* [x] Raccord `special-object-runtime.js` au `RuntimeBudget` existant.
* [x] Règle îlots : garantie ciblée / probabilité magnétique renforcée.
* [x] MSC coralliennes underwater conservées.
* [x] Stabilisation fatigue / BAC.
* [x] Nettoyage `game.js` du 18 août.
* [x] Fondation UI tutoriel non destructive.
* [x] Routage Bible narration / bulles / journal / 50 actions.
* [x] Timer / queue des bulles narratives V5.3.
* [x] Restauration après régression du précrédit inventaire et de `mission_revealed`.
* [x] Double interaction missionnelle : observation(s) réellement due(s) puis collecte de la même instance.
* [x] Réobservation missionnelle possible d'une instance déjà connue.
* [x] Unicité nœud d'étude × instance ; `GAME-shelter / plantStudy` ne peut plus compter plusieurs fois la même plante.
* [x] Fan-out observation et collecte conservé.
* [x] Annulation transactionnelle propre pendant les études intermédiaires.

## P0 — Intégration missions tutoriel

### P01→P04 — VALIDÉ EN JEU
* [x] P01 — Reconnaître le Site du crash.
* [x] P02 — Prélever les premiers échantillons.
* [x] P03 — Établir le premier Camp.
* [x] P04 — Comprendre qu’un projet peut progresser en parallèle.
* [x] `GAME-shelter` disponible en parallèle après P03.
* [x] Matching CUO plante / bois / minerai.
* [x] Fan-out d'une collecte vers T04 + Refuge.
* [x] P03 : bois déjà en inventaire crédité à l'activation.
* [x] P03 : consommation des 10 bois + `MSC-CUSTOM-CAMP`.
* [x] Narrations `revealed/progress/completed` raccordées au chemin Bible courant.
* [x] `mission_revealed` garanti à l'activation réelle, y compris sortie de pending.
* [x] Guidage UI P01.
* [x] Guidage Vue P03 après 90 s.
* [x] Guidage missions parallèles T04 + Refuge.
* [x] Durée des aides portée à 14 s.
* [x] Validation en jeu du lot P01→P04.

### P05→P012 — PROCHAINE TRANCHE
* [ ] Repartir strictement du HEAD courant.
* [ ] Auditer les définitions canoniques P05→P012 avant modification moteur.
* [ ] Affecter chaque mission à un patron existant ou à une famille générique réellement nécessaire.
* [ ] Ne créer aucun code spécifique à une mission si un paramètre générique suffit.
* [ ] Préserver intégralement les comportements P01→P04.
* [ ] Propager `targetBinding=instance` jusqu'à ActionBridge uniquement si requis.
* [x] Raccord `distinctBy` générique disponible ; distinct implicite `instanceId` validé pour les nœuds d'étude.
* [ ] Supporter agrégation multi-map / multi-biome / multi-instance si le lot l'exige.
* [ ] Généraliser le spawn missionnel si nécessaire.
* [ ] Ajouter présence/proximité/durée/délai si nécessaire.
* [ ] Ajouter cycle excursion → changement de map → retour si nécessaire.
* [ ] Valider sauvegarde/reprise à chaque étape.
* [ ] Vérifier fan-out multi-missions sans révélation multiple.
* [ ] Vérifier priorité commande joueur / autonomie.
* [ ] Auditer le lot complet avant passage aux missions suivantes.

## P1 — Patrons missionnels mutualisés
* [x] Conserver les familles existantes comme socle.
* [x] `SEQUENCE_ACTIONS` validé sur P03 / Refuge.
* [x] Matching CUO générique validé sur T02.
* [x] Crédit d'inventaire à l'activation validé comme prescription générique.
* [x] `distinctBy` utilisé sur besoin réel : objectifs d'étude à cardinalité multiple.
* [x] Unicité par instance intégrée aux nœuds d'étude sans `distinctBy` explicite ; overrides explicites conservés.
* [ ] Définir seulement les familles supplémentaires réellement nécessaires après P05→P012.
* [ ] Viser un petit nombre de familles génériques plutôt qu'un patron par mission.

## P1 — CUO / factions / réputation
* [ ] Attribuer `speciesId` aux créatures/PNJ pertinents.
* [ ] Attribuer `factionId` aux créatures/PNJ pertinents.
* [ ] Porter `cultureId` au niveau CUO ou MSC/instance selon le contexte.
* [ ] Ajouter réputation simple : agressif / neutre / friendly / friendly++.
* [ ] Raccorder ces identités aux ObjectEvents.
* [ ] Réutiliser les MSC comportementales existantes.

## P2 — Survie / ration
* [ ] Auditer la brique ration existante avant toute création.
* [ ] Identifier sa source de vérité.
* [ ] Vérifier ingrédients, consommation, inventaire et effet.
* [ ] Raccorder la fiche existante au patron approprié.
* [ ] Ne pas créer une recette parallèle si la définition existante suffit.

## P3 — Industrialisation des 182 missions
* [ ] Affecter chaque mission à un patron.
* [ ] Renseigner ses paramètres sans réécrire le sens documentaire.
* [ ] Conserver les associations mission↔MSC déjà décidées.
* [ ] Réutiliser compositions/alias existants.
* [ ] Ne créer une MSC que si aucun contenu existant ne couvre réellement le besoin.
* [ ] Intégrer par lots homogènes.
* [ ] Auditer chaque lot avant le suivant.

## P4 — MAP_Test / CUO Lab / non-régression
* [ ] Continuer la qualification sauvegarde/relecture.
* [ ] Rejouer la preuve intégrée save → reload → reprise de `MissionNode.distinctValues`.
* [ ] Rejouer le banc complet P01→P04 après le commit `b757aa45…`.
* [ ] Vérifier preview vs moteur production.
* [ ] Maintenir le contrat MSC exact.
* [ ] Garder les axes principaux dégagés.
* [ ] Réparer les tests historiques encore pertinents.
* [ ] Ne pas réintroduire de modules hotfix versionnés.

## P5 — Musique adaptative
* [x] Moteur adaptatif raccordé au jeu.
* [x] Volumes musique / sons séparés.
* [x] Développements longs et persistance de thème renforcés.
* [x] Choix modulé par activité/BAC sans changement à chaque action.
* [ ] Finaliser l'écoute des segments encore perfectibles.
* [ ] Vérifier absence totale de silence et impact nul sur changement de map.
* [ ] Geler après validation d'écoute.

## Discipline de livraison
* [x] ZIP contenant uniquement les fichiers réellement modifiés.
* [x] Aucun fichier suffixé/versionné destiné au dépôt.
* [x] Aucun bridge parallèle pour un correctif local.
* [x] Toujours partir du fichier complet courant.
* [x] Vérifier diff exact avant livraison.
* [x] Règle renforcée après V5.3 : un correctif sur fichier partagé doit intégrer toutes les modifications validées apparues depuis la base, sinon il est rejeté.
* [ ] Continuer à appliquer strictement ces règles sur P05→P012.

## Hors priorité immédiate
* Nouvelle vague massive de missions avant validation P05→P012.
* Duplication de missions par espèce avant validation réputation.
* Suite ARCH-40 miroir avant conception narrative dédiée.
* APK Android avant base PC consolidée.
