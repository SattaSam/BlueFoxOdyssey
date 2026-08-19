# BLUEFOX ODYSSEY — DEV HISTORIQUE

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

Écarts génériques historiques :
- targetBinding=instance à propager jusqu'au choix exact d'ActionBridge ;
- `distinctBy` générique ;
- agrégation multi-map/biome ;
- spawn missionnel à généraliser si nécessaire ;
- durée/proximité/délai ;
- excursion/retour ;
- effets réputation/branche/faits.

### Décision architecture missions
- Limiter le nombre de patrons.
- Mutualiser les variantes avec des paramètres.
- Développer chaque raccord seulement lorsqu'un besoin réel le démontre.
- Valider d'abord le tutoriel avant industrialisation des 182 missions.

### Discipline documentaire
Les documents officiels sont ceux de `docs/README.txt`.
Les DOCX et TODO historiques ne doivent pas être utilisés comme sources de pilotage.
