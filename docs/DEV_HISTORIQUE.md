# BLUEFOX ODYSSEY — DEV HISTORIQUE

## Session du 23 août 2026 — Double interaction missionnelle / unicité nœud × instance

### Base finale de session
- HEAD validé et commité : `b757aa457ce5eca4a994ff8f35dcc482aca5c77f` — `double action observe`.
- Blob final `engine/object-m0-bridge.js` : `54a7d25041878109c448ccbba0577f8c6d487a20`.
- Base avant chantier : `b5375d820833d93c180797b44c0700a92cb5ab1d`.
- Blob avant : `ce8ef38a8f67faf6a0f392a501d02f782bed156e`.

### Besoin fonctionnel
Sur un objet collectable, une mission peut imposer une observation avant la collecte, même lorsque l'instance avait déjà été observée historiquement.

Les termes narratifs `observer`, `inspecter` et `analyser` restent une seule action physique : `observe`.

Le comportement final validé est :

```text
collectable
→ 0..N observations missionnelles réellement dues
→ même instance
→ collect/extract
```

### Chaînage multi-études
Plusieurs nœuds distincts peuvent demander successivement une observation de la même instance :

```text
S1 narratif observe
→ OBSERVE I1
S2 narratif inspect
→ OBSERVE I1
S3 narratif analyze
→ OBSERVE I1
→ COLLECT I1
```

La nuance est portée par `missionNarrativeVerb`, pas par trois gestes physiques différents.

### Identité transactionnelle
Pendant une étude intermédiaire :
- `missionId / missionNodeId` peuvent désigner la mission d'étude momentanée ;
- `acquisitionMissionId / acquisitionMissionNodeId` restent ceux de l'acquisition initiale.

Cette séparation est obligatoire pour reprendre correctement la collecte finale et préserver le fan-out.

### Annulation
`cancelMissionInteraction()` résout prioritairement l'identité persistante de l'acquisition lorsque la transaction contient une étude momentanée issue d'une autre mission.

Une annulation pendant ou entre deux observations nettoie :
- `pendingInteraction`;
- `requestedInteraction*`;
- `mission*`;
- `acquisition*`.

Aucune observation orpheline ne doit être exécutée après annulation.

### Unicité nœud × instance
Le défaut final observé en jeu concernait `GAME-shelter / plantStudy` (« Observer, inspecter ou analyser 100 plantes ») : le même nœud pouvait réutiliser la même plante et provoquer une boucle d'observation.

Décision durable :
- `MissionNode` reste propriétaire de `distinctValues`, `incrementDistinct()` et `hasDistinctValue()`;
- pour un nœud d'étude sans `distinctBy` explicite, `object-m0-bridge.js` applique un distinct effectif `instanceId`;
- une même instance ne peut créditer qu'une fois le même nœud ;
- une autre instance peut progresser ce nœud ;
- un autre nœud peut réobserver la même instance ;
- `distinctBy` explicite `instanceId`, `objectId` ou `none` reste prioritaire ;
- les nœuds non-study ne reçoivent aucun distinct implicite.

### Fan-out
Une seule `PHENOMENON_OBSERVED` reste disponible à tous les nœuds compatibles des missions actives.

Chaque nœud crédité enregistre indépendamment la même `instanceId` dans ses propres `distinctValues`, ce qui évite de rejouer inutilement l'observation pour une seconde mission déjà satisfaite par fan-out.

La collecte finale reste elle aussi disponible au fan-out générique.

### Validation
Réfutation exhaustive du candidat final :
- unicité nœud × instance : PASS ;
- réobservation inter-nœud : PASS ;
- instance historiquement connue : PASS ;
- multi-observations : PASS ;
- même instance : PASS ;
- identité transactionnelle : PASS ;
- fan-out observation : PASS ;
- fan-out collecte : PASS ;
- annulation : PASS ;
- distinct explicite/implicite : PASS ;
- aucun FAIL technique démontré ;
- aucune régression technique démontrée.

Validation runtime en jeu :
- T06 : `PHENOMENON_OBSERVED` puis `RESOURCE_COLLECTED` sur la même plante ;
- `GAME-shelter` : plusieurs instances distinctes de plante fibreuse sont chacune observées une fois puis collectées ;
- aucune boucle de réobservation de la même instance constatée.

Réserves de preuve :
- banc intégré P01→P04 complet non rejoué dans l'environnement de réfutation ;
- cycle save → reload → reprise non exécuté avec le candidat non commité au moment de la réfutation.

Ces réserves sont des limites de preuve, pas des régressions techniques démontrées.

---

## Session du 19 août 2026 — P01→P04, narration Bible et sécurisation du cumulatif

### Base finale de session
- HEAD final : `35685c793ecb110bc928e9af0b5b3fecd1658e0b`.
- Commit P02–P04 validées : `650c1a132ddf63f9f84d2775fc48c8b8d70714c0`.
- Commit timer bulles V5.3 : `100aec2d4d70bf945f9961a39b710f4d3ba8d8d6`.
- Commit de restauration de régression : `35685c793ecb110bc928e9af0b5b3fecd1658e0b`.

### P01→P04
Tranche tutorielle intégrée et validée en jeu :
- T01 : reconnaissance de la capsule ;
- T02 : collecte différenciée plante / bois / minerai ;
- T03 : étude du bois, 10 bois, établissement du premier Camp ;
- T04 : démonstration de progression parallèle ;
- `GAME-shelter` activé en parallèle après T03.

Décisions fonctionnelles :
- T04 ne comporte qu'un objectif : `Collecter une ressource utile au Refuge`.
- `GAME-shelter` porte le titre `Construire un refuge`.
- Une collecte utile peut progresser simultanément T04 et Refuge.
- Le bois est exclu du critère plante.
- Le bois déjà présent dans l'inventaire avant l'activation de T03 doit être crédité à l'objectif `Réunir 10 bois`.
- La consommation des 10 bois reste liée à la complétion / effet d'établissement du Camp.

### UI tutorielle
La fondation visuelle avait été intégrée au commit `004fa3acfeb181c3327d3c5731a399e76c9c25fa`.

Le lot P01→P04 valide :
- prescriptions `uiGuidance` dans les fiches ;
- consommation par le bridge UI existant ;
- message P01 ;
- aide Vue pendant P03 après 90 s ;
- surbrillance caméra non destructive ;
- message `Plusieurs missions peuvent évoluer simultanément.` lorsque T04 et Refuge sont actives ensemble ;
- durée d'affichage portée à 14 s.

Aucun nouveau bridge ni fichier parallèle n'a été créé.

### CUO / Object-M0
`object-m0-bridge.js` a été étendu de façon générique pour comparer les critères missionnels aux métadonnées réelles : objectId, cuoType, kind, family, subject, category, tags et exclusions.

But validé :
- permettre à T02 de distinguer plante, bois et minerai ;
- préparer les futures missions sans règle spécifique codée en dur ;
- conserver le fan-out vers plusieurs missions actives.

### Narration Bible
Le commit `595faaa418950256379788db3c2476db7b20289d` a clarifié le routage :
- narration ordinaire → bulle BlueFox + historique d'actions via les callbacks existants ;
- route explicite `journal` → journal dédié.

Les narrations T01→T04 ont été intégrées depuis la Bible documentaire pour les moments `mission_revealed`, `mission_progress` et `mission_completed`.

### Timer bulles V5.3
Le commit `100aec2d4d70bf945f9961a39b710f4d3ba8d8d6` a introduit :
- une file d'attente narrative ;
- une durée calculée selon la longueur du texte ;
- `speechQuietUntil` afin d'éviter qu'une parole autonome écrase une narration encore affichée.

### Incident de cumulatif / régression
Le patch timer a été construit depuis une variante de `bible-runtime-v0-1-unified.js` qui ne contenait pas deux ajouts missionnels déjà validés. Son application a donc retiré accidentellement :
- `activationInventoryCredits` / `applyActivationInventoryCredits()`;
- `emitRevealedOnce()` et la détection du passage réel à `active`.

Le timer ne nécessitait techniquement aucune de ces suppressions.

Correction au commit `35685c793ecb110bc928e9af0b5b3fecd1658e0b` :
- queue/timer V5.3 conservés ;
- précrédit inventaire restauré ;
- `mission_revealed` restauré avec reçu unique ;
- détection à l'état `active` restaurée.

Règle renforcée :
> tout patch touchant un fichier partagé doit être construit depuis le HEAD courant et conserver toutes les modifications validées apparues depuis la base ; un patch thématique ne doit jamais remplacer le fichier par une variante antérieure.

### Fatigue / BAC — consolidation du 18 août
Le commit `e22ca2360932439b327915fc6390287a07a781e0` a stabilisé le propriétaire de la politique survie :
- décision fatigue/survie dans le BAC ;
- intégration runtime pour matérialiser les routines ;
- suppression du second overlay d'autonomie concurrent ;
- besoins critiques et micro-pauses conservés même avec mission prioritaire.

### Nettoyage game.js
Le commit `54e2cfb273b93424377a939656e3e036289844d8` a nettoyé `game.js`. Aucun ancien fichier local ne doit servir de source pour réinjecter du contenu supprimé.

### Prochaine étape
P05→P012 devient la prochaine tranche tutorielle.
Le lot doit conserver P01→P04 comme banc de non-régression et n'ajouter de nouveaux raccords génériques que lorsqu'un besoin réel de la Bible le démontre.

---

## Session du 17 août 2026 — Rétablissement V5.2, sécurisation CPU / sauvegarde / population

### Base finale de session
- Commit audité : `cd4a5187e40294b3f6680243af8ae9f997c392a6`.
- Objet principal de la session : rétablir progressivement les comportements validés de la veille et sécuriser la base avant P01→P012.

### RuntimeBudget / CPU
- `special-object-runtime.js` raccordé au `RuntimeBudget` existant.
- Aucun second système de throttling.
- Respawns et logique drones à 1 Hz conservés.

### Sauvegarde / dirty-state
- retrait du `BF.progression.save()` du pré-flush global ;
- les mutations réelles restent sauvegardées à leur source ;
- `MissionMemory` conserve son modèle dirty/flush.

### Incident de livraison `save-ui-bridge.js`
Un patch construit à partir d'un extrait partiel avait tronqué le fichier.
Règle durable : toujours partir du fichier complet du HEAD courant ou d'un fichier complet fourni par l'utilisateur, et vérifier le diff exact.

### Population / MSC
- `floating_islands` : îlot suspendu garanti ;
- désert avec roches en lévitation : garantie ;
- marais avec îles flottantes : garantie ;
- autres contextes magnétiques : probabilité renforcée.

Les MSC coralliennes underwater bioluminescentes restent intégrées.

---

## Session du 15 août 2026 — Audit Bible / CUO / moteur et stratégie de patrons

### Audit documentaire
- Bible principale : 182 missions normalisées.
- La narration reste souveraine ; la technique traduit sans réécrire.
- Les MSC associées distinguent `triggerContext`, `objectiveSubject`, `scenarioSupport`.

### Audit moteur
Présent :
- triggers d'interactions et d'exploration ;
- mémoire persistante ;
- plusieurs missions actives ;
- fan-out passif ;
- un événement révèle au maximum une mission ;
- targetBinding contractuel ;
- instanceId/mapId/zoneId dans les événements ;
- mission instanciable par map ;
- infrastructure de spawn MSC via `site.establish`.

Écarts génériques historiques à cette date :
- targetBinding=instance à propager jusqu'au choix exact d'ActionBridge ;
- `distinctBy` générique ;
- agrégation multi-map/biome ;
- spawn missionnel à généraliser si nécessaire ;
- durée/proximité/délai ;
- excursion/retour ;
- effets réputation/branche/faits.

Note de mise à jour du 23 août 2026 :
- l'écart historique `distinctBy` est désormais partiellement résolu et validé pour les objectifs d'étude : mécanisme `MissionNode.distinctValues`, overrides explicites et distinct implicite `instanceId` pour les nœuds d'étude.

### Décision architecture missions
- Limiter le nombre de patrons.
- Mutualiser les variantes avec des paramètres.
- Développer chaque raccord seulement lorsqu'un besoin réel le démontre.
- Valider d'abord le tutoriel avant industrialisation des 182 missions.

### Discipline documentaire
Les documents officiels sont ceux de `docs/README.txt`.
Les DOCX et TODO historiques ne doivent pas être utilisés comme sources de pilotage.
