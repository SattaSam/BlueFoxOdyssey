# TODO BLUEFOX ODYSSEY

## Priorité absolue — Finaliser le nouveau BlueFox Blender

- [x] Importer `BlueFoxMODE_9-2.glb` dans Blender.
- [x] Isoler un maillage de travail sans l’ancienne armature.
- [x] Redresser le personnage.
- [x] Appliquer rotation et échelle.
- [x] Fixer la hauteur à 2,25 m.
- [x] Centrer l’origine au sol entre les bottes sur les trois axes.
- [x] Créer une copie `BlueFox_Mesh_CLEAN_BACKUP`.
- [x] Construire une nouvelle armature personnalisée.
- [x] Ajouter corps, membres, mains, pouces, pieds, tête et mâchoire.
- [x] Ajouter oreilles, yeux, houpette et queue articulée.
- [x] Fusionner les 6 565 sommets superposés.
- [x] Obtenir une pondération automatique sans erreur.
- [x] Valider un premier test de déformation du maillage.
- [ ] Supprimer ou terminer proprement l’essai de paupière/cercle commencé.
- [ ] Nommer tous les os avec une convention stable compatible Mixamo.
- [ ] Vérifier les parentés de chaque os et désactiver la déformation des os de contrôle si nécessaire.
- [ ] Tester chaque articulation en Mode Pose.
- [ ] Corriger manuellement les poids : épaules, aisselles, hanches, genoux, queue, oreilles, mâchoire et accessoires.
- [ ] Créer de vraies paupières séparées.
- [ ] Créer les expressions : clignements, yeux plissés, sourcils, pommettes et sourires.
- [ ] Vérifier les matériaux et textures.
- [ ] Créer ou importer `Idle`, `Walk`, `Run` et transitions.
- [ ] Ajouter les animations secondaires de queue, oreilles et houpette.
- [ ] Exporter un GLB de test propre avec animations.
- [ ] Remplacer le modèle actuel dans le jeu uniquement après validation Blender.

---

## Reprise immédiate de la prochaine session Blender

1. Ouvrir `BlueFox_MASTER_WORK.blend`.
2. Vérifier que BlueFox est en pose de repos et que le curseur 3D est à `0,0,0`.
3. Enregistrer une nouvelle copie de sécurité avant les corrections de poids.
4. Nettoyer l’essai de paupière interrompu.
5. Nommer l’armature et tous les os.
6. Tester les articulations une par une.

---

## Priorité suivante — Stabilisation V0.12 avec le nouveau GLB

- [ ] Reprendre la dernière base complète.
- [ ] Vérifier la structure réelle des dossiers après décompression.
- [ ] Corriger et intégrer `player_controller.js`.
- [ ] Corriger la caméra troisième personne.
- [ ] Connecter les contrôles à la boucle de rendu.
- [ ] Charger le futur GLB propre exporté depuis Blender.
- [ ] Retirer les compensations runtime devenues inutiles.
- [ ] Utiliser l’origine, l’orientation et l’échelle natives du nouveau modèle.
- [ ] Inspecter les animations disponibles dans le GLB.
- [ ] Afficher un message clair en cas d’échec de chargement.
- [ ] Supprimer OrbitControls lorsque la caméra TPS est active.
- [ ] Tester au clavier : ZQSD et flèches.
- [ ] Ajouter un serveur local simple pour le développement.
- [ ] Produire un build testable complet.

---

## Architecture et autonomie hors ligne

- [ ] Télécharger et intégrer Three.js localement.
- [ ] Supprimer la dépendance obligatoire à `unpkg.com`.
- [ ] Ajouter un service worker PWA.
- [ ] Ajouter un manifeste web.
- [ ] Tester le lancement hors ligne.
- [ ] Définir la stratégie de cache des modèles et textures.

---

## Premier biome

- [ ] Définir le biome de départ.
- [ ] Créer un terrain plus naturel.
- [ ] Ajouter collisions et limites.
- [ ] Ajouter végétation, rochers, cristaux ou éléments narratifs.
- [ ] Ajouter ciel, brouillard et éclairage cohérents.
- [ ] Mettre en place les passages Nord / Sud / Est / Ouest.
- [ ] Préparer la transition entre deux biomes.

---

## BlueFox

- [x] Diagnostiquer l’ancien squelette et décider sa refonte.
- [ ] Finaliser le nouveau squelette et ses poids.
- [ ] Ajouter idle, marche et course.
- [ ] Orienter le renard selon sa direction.
- [ ] Ajouter accélération et ralentissement.
- [ ] Définir une capsule de collision.
- [ ] Préparer les réactions contextuelles.

---

## Système d’intentions

- [ ] Définir les intentions disponibles.
- [ ] Créer un modèle de données d’intention.
- [ ] Ajouter un système de priorités.
- [ ] Préparer une Utility AI locale.
- [ ] Ajouter mémoire courte et mémoire persistante.
- [ ] Ajouter personnalité et conséquences.

---

## Interface

- [ ] Restaurer une interface proche du prototype de référence.
- [ ] Respecter la direction bleu nuit futuriste.
- [ ] Ajouter un HUD minimal.
- [ ] Ajouter l’indication du biome.
- [ ] Ajouter les intentions disponibles.
- [ ] Adapter l’interface au mobile.
- [ ] Tester portrait et paysage.

---

## Outils et qualité

- [ ] Ajouter un script de diagnostic.
- [ ] Ajouter un journal des erreurs visible.
- [ ] Ajouter une procédure de test manuel.
- [ ] Créer un fichier de version.
- [ ] Préparer un workflow Git stable.
- [ ] Créer des tags à chaque build validé.
- [ ] Maintenir MASTER, DEV_HISTORIQUE et TODO.

---

## Étapes ultérieures

- [ ] inventaire ;
- [ ] collecte ;
- [ ] survie légère ;
- [ ] construction ;
- [ ] quêtes ;
- [ ] colonie ;
- [ ] relations ;
- [ ] narration émergente ;
- [ ] sauvegarde de partie ;
- [ ] installation PWA ;
- [ ] publication GitHub Pages.
