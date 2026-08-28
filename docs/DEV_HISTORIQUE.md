# BLUEFOX ODYSSEY — DEV HISTORIQUE

## Session du 28 août 2026 — Recovery checkpoint / clarification des propriétaires

### Base finale
- HEAD : `c75fa77b2afe59a0d3dc41fc00453c3dc47a1d64`
- Commit : `RECOVERY_CHECKPOINT — moteur stabilisé, T11 return + T13 autocraft encore ouverts`
- Parent : `69d35d51d137a324136a7c56bb46857b4a9ec3eb`

### Contexte
Une stratégie de récupération en plusieurs passes avait produit un cumulatif contractuellement cohérent sur des tests isolés mais insuffisant en jeu. Les tests runtime utilisateur ont révélé des régressions et des comportements non restaurés.

Décision :
- ne plus considérer les cumulatifs 1→4 comme base de confiance ;
- conserver uniquement les modifications prouvées ;
- rétablir les propriétaires effectifs du runtime final chargé par `index.html`.

### Changements structurants du checkpoint
- `MissionManager` reste propriétaire de `chooseRunnableMissionAction()`.
- `behavior-arbitration-integration.js` ne remplace plus ce choix par une shortlist concurrente.
- `BibleRuntime` ne réécrit plus le lifecycle ; il interprète effets, compteurs et gates.
- `bible-map-prescription-v19.js` ne relance plus un second exécuteur du retour connu.
- `WorldEngine` porte une directive joueur de navigation réellement persistante.
- Règle B validée : terminer l’action atomique, puis exécuter la directive avant toute nouvelle décision.
- `PathPlanner` ne transforme plus l’absence de chemin en cible directe.
- `CharacterController` émet un échec de navigation explicite.
- `save-ui-bridge.js` force le flush des mémoires différées avant snapshot.
- une réévaluation causale ne révèle au maximum qu’une nouvelle mission.
- nettoyage UI ajouté pour éviter la conservation de contenu Recherche dans Inventaire.

### Tests de réfutation
Le candidat a été testé avec des contrats génériques incluant des missions `FUTURE-*` afin d’éviter les branches T11/T13.
Les consommateurs ObjectM0, travel-cycle, explore-scope, target arbitration et fallback V19 ont été contrôlés.

Limite de preuve : l’environnement de travail n’a pas permis de cloner le dépôt complet par réseau pour relancer toute la suite historique ; aucun PASS n’a été inventé pour cette partie.

### Résultats runtime après commit
Deux défauts restent ouverts :
1. **T11 — Comprendre comment préparer une ration** : après les collectes, BlueFox continue des collectes locales pour Shelter au lieu d’effectuer le retour autonome vers un abri. Ce cycle avait déjà été historiquement validé.
2. **T13 — Préparer une excursion prolongée** : BlueFox ne fabrique pas les rations de façon autonome malgré la présence de la mécanique ration.

Décision de reprise :
- T11 et T13 deviennent deux chantiers séparés ;
- le checkpoint est conservé afin de ne pas élargir à nouveau la surface de régression ;
- T11 sera traité par récupération différentielle du dernier flux historiquement fonctionnel ;
- T13 sera traité par traçage générique de la chaîne CRAFT/BAC/propriétaire réel.

---

## Session du 23 août 2026 — Double interaction missionnelle / unicité nœud × instance

### Base finale de session
- HEAD validé et commité : `b757aa457ce5eca4a994ff8f35dcc482aca5c77f` — `double action observe`.

### Décision durable
- sur un objet collectable, 0..N études missionnelles réellement dues peuvent précéder la collecte ;
- `observer`, `inspecter`, `analyser` restent des verbes narratifs d’une même action physique lorsque le CUO le prévoit ;
- l’acquisition reprend sur la même instance ;
- `MissionNode.distinctValues` porte l’unicité nœud × instance ;
- fan-out observation et collecte conservé ;
- annulation nettoie toute la transaction.

Validation en jeu : T06 et `GAME-shelter / plantStudy`.

---

## Session du 19 août 2026 — P01→P04, narration Bible et sécurisation du cumulatif

- P01→P04 intégrées et validées en jeu.
- `GAME-shelter` actif en parallèle après P03.
- CUO/ObjectM0 étendu génériquement pour le matching missionnel.
- narration Bible vers bulles/journal, queue narrative et `speechQuietUntil`.
- incident de cumulatif : un patch thématique avait supprimé des comportements déjà validés.
- règle renforcée : tout patch partagé doit partir du HEAD complet et préserver tout comportement validé.

---

## Session du 17 août 2026 — CPU / sauvegarde / population

- `special-object-runtime.js` raccordé au RuntimeBudget existant.
- retrait du pré-flush artificiel de progression.
- `MissionMemory` conserve dirty/flush.
- incident de troncature `save-ui-bridge.js` : interdiction de reconstruire un fichier depuis un extrait.
- protections population/MSC conservées.

---

## Session du 15 août 2026 — Audit Bible / CUO / moteur

- Bible principale : corpus massif destiné à l’industrialisation.
- narration souveraine ; technique traduit sans réécrire.
- MSC : rôles `triggerContext`, `objectiveSubject`, `scenarioSupport`.
- décision : limiter les patrons, mutualiser par paramètres, développer les raccords seulement sur besoin réel.
