# BLUEFOX ODYSSEY — DEV HISTORIQUE

## Session du 2 septembre 2026 — Shelter / Base renforcée — validation runtime et commit

### Base finale
- HEAD moteur validé : `8b34d8912667f02140c0c2999b1dfa3f37a8e9ee`
- Commit : `spawn base fix`
- Parent : `4e4c5e47ac5f717aa6c319b6e3b223f2397e23cf`
- Aucun nouveau recovery checkpoint créé.

### Objet du chantier
Finaliser la chaîne `Camp → Refuge → Base renforcée` sans nouveau propriétaire, sans bridge et sans interaction BlueFox finale fictive.

### Corrections validées
- `GAME-shelter` et `GAME-base` restent portées par les propriétaires existants.
- Base renforcée : 500 fibres + 500 ressources du pool minéral/cristal + 100 études rocheuses.
- Progression historique distinguée du stock physique disponible au moment de construire.
- Stock insuffisant : mission active + réévaluation sur événements d'inventaire pertinents, sans polling ajouté.
- Spawn réussi avant consommation ; consommation unique/idempotente.
- Preset canonique propriétaire lorsqu'il existe ; `autonomousPlacement()` reste le fallback des constructions sans preset.
- Faux positif du gate Base corrigé : la finalisation exige le site réellement établi par la mission.
- Position Base renforcée sur crystal : `x=-2.7567, y=0.25, z=4.768`.
- Après succès réel de la Base renforcée, le Refuge autonome est retiré visuellement, ses colliders sont retirés et `sites.refuge` est supprimé ; le Camp reste présent.

### Validation
- batterie dédiée Shelter/Base : PASS ;
- stock insuffisant, reprise événementielle, idempotence, faux gate, fallback sans preset, suppression Refuge et reload couverts ;
- spawn final validé en jeu ;
- commit `8b34d8912667f02140c0c2999b1dfa3f37a8e9ee` vérifié contre le cumulatif livré : les 11 blobs Git correspondent bit-for-bit.

### Décisions durables
- pas de migration automatique de sauvegarde pour compenser ce chantier ;
- pas d'action finale fictive lorsqu'une mission se termine par un effet automatique réel ;
- un changement de stade ne retire le site précédent qu'après succès du nouveau stade ;
- la TODO courante reste `ROADMAP_TODO.md`.

---

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

---

## Session du 30 août 2026 — Passe 4 validée / diagnostic CPU et Survival différé

### Base finale de session
- HEAD : `a62c25ad75fc63dce4546dfe0bd8861d45842376`
- Commit : `Dernier cumulatif Passe 4 ergonomie UI + menu recherche fenetre`
- Parent : `b277d811756e980f4d6cae92c709fe147973ca04`

### Passe 4 — validation runtime
- Recherche reste fenêtrée.
- Recherche et Inventaire ne provoquent plus d’écran noir dans les cycles testés.
- Cause du crash React localisée : des bridges UI retiraient des nœuds que React considérait encore comme siens.
- Correction conservée :
  - Recherche masque `.bluefox-research-runtime` au lieu de le retirer ;
  - Inventaire masque la grille React historique au lieu de `remove()`.
- Kit d’expédition : dernière position ouverte/fermée persistée.
- message de proximité : `Camp hors de portée.`
- T11 : guidance ajoutée via `uiGuidance`.

### T13 — validations de la session précédente conservées
Le cumulatif P1→P3 + compilateur a été validé en jeu sur :
- collecte prioritaire des ingrédients nécessaires ;
- fabrication réelle du lot de rations ;
- déplacement autonome après craft ;
- présence de `MSC-CUSTOM-BOSQUET-BIO` sur la deuxième nouvelle map.

### Diagnostic différé — CPU / cadence décisionnelle
Symptômes runtime utilisateur :
- consommation CPU perçue en hausse, y compris sur maps connues ;
- sur map dense, temps trop long entre actions malgré environ 15 plantes proches et plusieurs missions compatibles ;
- état prolongé « observation du terrain / choix de la prochaine action » ;
- BlueFox peut revenir au camp puis réaliser des observations/collectes locales aléatoires alors que plusieurs missions restent en cours.

Constats confirmés dans le HEAD :
- le garde-fou pathfinding est toujours présent :
  - `TARGET_CANDIDATES = 6` pour le coût de route BAC ;
  - le résultat `interactionApproachPoint()` du candidat choisi est réutilisé pendant 1,2 s si BlueFox n’a pas bougé de plus de 0,5 unité ;
- ce garde-fou ne couvre pas les rescans d’intérêt sur tous les interactables, ni les scans répétés de l’historique ObjectEvents, ni une décision suivante ;
- `MissionManager` replannifie au plus tôt après 1,2 s et peut poser des `retryAfter` de 4–5 s ;
- `MissionManager.update()` appelle `ensureMissionTransitionIntent()` à chaque frame ;
- pour un voyage inconnu, le HEAD calcule actuellement `missionUnknownTravelPlan()` avant de confirmer que l’intention mémorisée est encore suffisante ; cette fonction peut parcourir la topologie connue ;
- le cumulatif P1→P3 a fortement étendu `survival-rations-ai-v0-3.js`; après déblocage ration, `RationPolicy.autonomyCandidate()` est consulté depuis le cycle BAC et doit être profilé ;
- Passe 4 n’a ajouté aucune nouvelle boucle, minuterie ni MutationObserver : sa causalité directe sur la hausse CPU n’est pas démontrée.

### Autorité missionnelle — non encore localisée
À reprendre sans correctif prématuré :
- identifier le cas exact où `hasPrimaryMissionAuthority()` devient faux ou insuffisant alors que des missions compatibles restent actives ;
- distinguer :
  - primaire active mais momentanément non-runnable ;
  - arbre terminé mais lifecycle encore actif en attente d’une gate ;
  - secondaire runnable mais primaire non réévaluée ;
  - attente artificielle causée par `retryAfter`.

### Survival — cohérence énergie / repos / alimentation
État confirmé :
- `energy = 0,55 × rest + 0,32 × food + 0,13 × safety`;
- les décisions de repos/alimentation utilisent aussi directement `rest` et `food`;
- `preventiveMicroRest` est actuellement vrai si `rest < 62` ou `energy < 62`.

Demande utilisateur à reprendre :
- rendre la barre Énergie plus cohérente avec l’état réellement utilisé par Survival/BAC ;
- lisser les compteurs énergie/repos/alimentation pour éviter des divergences peu intuitives ;
- ne pas créer de jauge ou moteur parallèle ;
- conserver `survival-ai-bridge.js` comme propriétaire.

---

## Session du 31 août → 1 septembre 2026 — Trigger/cible missionnelle SUR-03 — clôture en FAIL moteur

### Base de référence
- HEAD avant clôture : `e12558f40f38129e4d3b4a3e6d85f54b3a2cac6f`
- Commit : `pass CPU 2 (musique)`

### Cause fonctionnelle démontrée
La sauvegarde contenait un ancien `bibleTarget:SUR-03` :
- `binding:"definition"`
- `instanceId` du premier buisson déclencheur
- `objectId:"doc-bio-bush-m-001"`
- `cuoType:"bush"`
- `mapId:"generated-a2996d72-0005"`

Preuves console :
- MissionManager propose bien `SUR-03:studyPlants` / `analyze`;
- `ActionBridge.execute()` retourne `false`;
- `targetInteraction()` n'est jamais appelé;
- aucune cible n'est sélectionnée tant que le vieux binding est présent;
- binding neutralisé temporairement : ObjectM0 sélectionne immédiatement `DOC-NAT-TREE-L-002` / `crystalline_tree`.

Conclusion prouvée :
le vieux binding implicite de définition rend l'objectif multi-définition impossible.

### Décision durable d'intégration
L'IMI conserve trois relations explicites :
- `REVEAL-ONLY`
- `SAME-DEFINITION`
- `SAME-INSTANCE`

### Échec des correctifs moteur de la session
Les variantes de migration automatique de vieux `bibleTarget` ont réussi des tests isolés mais ont échoué en jeu.
Décision utilisateur :
- rejeter tous les patchs moteur/runtime de ce chantier;
- ne pas les réutiliser à la prochaine session;
- repartir du HEAD GitHub propre;
- seule la mise à jour IMI est retenue pour commit.

### Fausses pistes à éviter
- réarmement artificiel du planner/BAC sans preuve;
- timer/bridge parallèle;
- considérer `bibleTarget === null` comme preuve suffisante;
- protéger un binding sur la seule présence de `mapId`;
- tester la migration sans couvrir les consommateurs réels.

### Contrat de reprise
Le prochain chantier devra couvrir :
`chargement → MissionManager → Planner → ObjectM0 → ActionBridge → interaction → progression`
et préserver les vrais cas `SAME-DEFINITION` / `SAME-INSTANCE`.
