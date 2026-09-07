# BLUEFOX ODYSSEY — DEV HISTORIQUE

## Sessions du 3 au 8 septembre 2026 — industrialisation massive puis passerelle Civilisation / Engineering / Workbench

### Base finale de référence
- HEAD moteur : `1f20ba014686f5f6eadac78a22b89077bca8e380`
- Parent : `3705d40399437058fcc62a9bc99f2ee96defc75e` — Missions FAUNA R2
- Commit final : `/!\ GAME CIVilisation ENINERING + Etabli+feu +fichiers sensibles /!\ GROS LOT`
- Contrôle post-commit : 7 fichiers attendus, aucun parasite, blobs conformes au candidat livré.

### Industrialisation réalisée depuis la référence du 2 septembre
Lots successifs à préserver :
- FLO et réordonnancement de chaîne ;
- GEO-01→07 ;
- COL puis ENV ;
- LOC ;
- SUR et passes de correction de régression 2A/2B/2C ;
- GAME R1 et R2 ;
- FAUNA R1/R2 ;
- ENE-01→10 ;
- lot final GAME Civilisation / Engineering / Workbench.

### GAME R1 / R2
R1 :
- GAME-flora ;
- GAME-research_initial ;
- GAME-research_hypothesis ;
- GAME-special_investigator ;
- GAME-special_archivist.
Archiviste : 5 familles différentes observées historiquement.

R2 :
- GAME-energy ;
- GAME-engineering_1 ;
- GAME-engineering_2.
Aucun axe Engineering parallèle n'a été créé : l'ingénierie reste dans Recherche/BibleRuntime.

### FAUNA
- FAU-01→12 industrialisées.
- Runtime FAUNA R2 préservé.
- FAU-09/10 disposent de comportements runtime dédiés déjà validés.
- Le lot final Civilisation/Engineering ne modifie pas le runtime FAUNA.

### ENE-01→10
- ENE-01→10 intégrées.
- ENE-08 utilise le retour dynamique vers la map mémorisée du Giant Tree.
- Aucun faux état/bridge énergétique parallèle.
- ENE-11→14 volontairement différées jusqu'à présence réelle d'un établi.

### Lot Civilisation / réserve
- GAME-civilization_1→5 intégré.
- Départ après Refuge + 10 stèles observées historiquement.
- Trois nouvelles maps successives avec une nouvelle stèle garantie sur chacune.
- Troisième map : `MSC-CUSTOM-RESERVE-ABANDONEE`.
- Réserve persistante : 350 `fiber` + 175 `azure_ferrite` + 175 `magnetic_ore`.
- Prélèvement limité à la capacité réelle du sac ; reliquat conservé pour les visites suivantes.
- Crédit via `ProgressionRegistry.grantInventory()`, sans faux `RESOURCE_COLLECTED` et donc sans gonfler les compteurs COL historiques.

### GAME-base
- Sémantique corrigée : les objectifs fibres/minéraux représentent le stock physique courant.
- Réconciliation seulement sur événements d'inventaire pertinents ; pas de polling.
- Les slots stock-backed peuvent redescendre si le stock est dépensé avant construction.
- Les 100 études rocheuses restent historiques.
- Finalisation/consommation réelles et idempotentes conservées.

### Engineering / feu / établi
- GAME-engineering_3→6 intégré.
- GAME-fire générique répétable ; 8 bois par occurrence.
- GAME-fire ne provoque pas seule un retour au camp.
- MissionManager reçoit uniquement la primitive générique `rearmRepeatableMission()`.
- Blueprint Établi débloqué via Recherche.
- Construction uniquement sur Crystal après Base.
- Coût : 20 `magnetic_ore` + 20 `azure_ferrite` + 20 `resonant_basalt` + 20 `stellar_iridium` + 25 `fiber` + 10 `parts` + 20 `wood`.
- `MSC-CUSTOM-ETABLI-VIDE` implantée par placement joueur.
- `ui-enhancements.js` généralise le consommateur historique de placement à CAMP / REFUGE / WORKBENCH.
- Anchor et rotation réels du workbench sont persistés pour les futures missions de retour à l'établi.

### Demandes/suggestions utilisateur encore ouvertes identifiées
1. **ENE-11→14** : prochaine passe missionnelle ; l'établi nécessaire existe désormais.
2. **Console drone joueur** : à construire dans Recherche en réutilisant le runtime scout/harvest existant.
3. **Kit d'expédition générique** : accumulateur puis futurs objets fabriqués transportables/activables, par exemple une balise.
4. **Journal évolutif** : calcul uniquement à l'ouverture ; briques persistantes/stables ; enrichissement seulement des branches ayant réellement évolué de façon majeure.
5. **ENE-15** : différé jusqu'à industrialisation réelle de ses prérequis documentaires.
6. **CPU/cadence, autorité missionnelle, cohérence Survival et IMI** : restent à revalider/clôturer au HEAD courant.
7. **Scouting drone inter-map** : idée future séparée ; ne pas l'introduire implicitement avec ENE-13.
8. **Console drone** : doit préserver le mode autonome et ne donner priorité à l'ordre joueur que lorsqu'il existe réellement.
9. **Objets activables depuis le Kit** : balise et futurs objets possibles uniquement si leur propriétaire expose une action d'activation canonique.

### Discipline de reprise
- ne pas reconstruire le dépôt complet : BASE partielle exacte limitée au périmètre et à ses consommateurs ;
- ne pas redéfinir ENE-11→14 : repartir de la stratégie déjà validée puis vérifier sa compatibilité au HEAD ;
- aucun scouting drone inter-map implicite dans ENE-13 ;
- aucun second runtime drone, inventaire Kit, moteur craft ou propriétaire Journal parallèle.

---

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
- Faux positif du gate Base corrigé : finalisation exige le site réellement établi par la mission.
- Position Base renforcée sur crystal : `x=-2.7567, y=0.25, z=4.768`.
- Après succès réel de la Base renforcée, le Refuge autonome est retiré visuellement, colliders retirés et `sites.refuge` supprimé ; Camp conservé.

### Validation
- batterie dédiée Shelter/Base : PASS ;
- stock insuffisant, reprise événementielle, idempotence, faux gate, fallback sans preset, suppression Refuge et reload couverts ;
- spawn final validé en jeu ;
- commit vérifié contre le cumulatif livré.

### Décisions durables
- pas de migration automatique de sauvegarde ;
- pas d'action finale fictive quand effet automatique réel ;
- changement de stade : retrait du précédent uniquement après succès du nouveau ;
- TODO courante = `ROADMAP_TODO.md`.

---

## Session du 30 août 2026 — Passe 4 validée / diagnostic CPU et Survival différé

### Passe 4 — validation runtime
- Recherche reste fenêtrée.
- Recherche et Inventaire ne provoquent plus d’écran noir dans les cycles testés.
- Cause crash React : bridges UI retiraient des nœuds que React considérait encore comme siens.
- Correction : masquer sans retirer.
- Kit d’expédition : dernière position ouverte/fermée persistée.
- message de proximité : `Camp hors de portée.`

### Diagnostic différé — CPU / cadence décisionnelle
Symptômes historiques :
- consommation CPU perçue en hausse ;
- temps trop long entre actions sur map dense ;
- état prolongé « observation du terrain / choix de la prochaine action » ;
- actions locales aléatoires possibles malgré plusieurs missions actives.

À revalider au HEAD courant avant correction.

### Survival — cohérence énergie / repos / alimentation
État historique :
- `energy = 0,55 × rest + 0,32 × food + 0,13 × safety`;
- décisions repos/alimentation utilisent aussi rest et food.
Demande persistante :
- cohérence de la barre Énergie ;
- pas de jauge/moteur parallèle ;
- `survival-ai-bridge.js` reste propriétaire.

---

## Session du 31 août → 1 septembre 2026 — Trigger/cible missionnelle SUR-03 — clôture en FAIL moteur

### Décision durable
IMI conserve trois relations explicites :
- `REVEAL-ONLY`
- `SAME-DEFINITION`
- `SAME-INSTANCE`

### Échec historique
Les migrations automatiques de vieux `bibleTarget` ont échoué en jeu et ont été rejetées.

### Contrat de reprise durable
Le cycle complet doit rester testé :
`chargement → MissionManager → Planner → ObjectM0 → ActionBridge → interaction → progression`

Fausses pistes interdites :
- réarmement artificiel planner/BAC sans preuve ;
- timer/bridge parallèle ;
- migration runtime de sauvegarde sans preuve complète.

---

## Session du 28 août 2026 — Recovery checkpoint / clarification des propriétaires

### Décisions structurantes durables
- MissionManager propriétaire de `chooseRunnableMissionAction()`.
- BAC ne remplace pas ce choix.
- BibleRuntime n'écrit pas le lifecycle.
- Bible-map-prescription ne devient pas second exécuteur du retour connu.
- WorldEngine porte la directive joueur persistante.
- PathPlanner ne force pas une cible directe en absence de chemin.
- CharacterController émet un échec de navigation.
- save-ui-bridge flush les mémoires différées.
- une réévaluation causale révèle au maximum une mission.

---

## Session du 23 août 2026 — Double interaction missionnelle / unicité nœud × instance

### Décision durable
- 0..N études missionnelles réellement dues peuvent précéder la collecte ;
- observer/inspecter/analyser sont des nuances d’une même action physique lorsque CUO le prévoit ;
- acquisition reprend sur la même instance ;
- `MissionNode.distinctValues` porte unicité nœud × instance ;
- fan-out conservé ;
- annulation nettoie la transaction.

Validation historique en jeu : T06 et GAME-shelter / plantStudy.

---

## Session du 19 août 2026 — P01→P04, narration Bible et sécurisation du cumulatif

- P01→P04 intégrées et validées en jeu.
- GAME-shelter actif en parallèle après P03.
- CUO/ObjectM0 étendu génériquement.
- narration Bible vers bulles/journal.
- règle renforcée : tout patch partagé doit partir du HEAD et préserver les comportements validés.

---

## Session du 17 août 2026 — CPU / sauvegarde / population

- `special-object-runtime.js` raccordé au RuntimeBudget existant.
- retrait du pré-flush artificiel de progression.
- MissionMemory conserve dirty/flush.
- incident de troncature `save-ui-bridge.js` : interdiction de reconstruire un fichier depuis un extrait.
- protections population/MSC conservées.

---

## Session du 15 août 2026 — Audit Bible / CUO / moteur

- Bible principale : corpus massif destiné à l’industrialisation.
- narration souveraine ; technique traduit sans réécrire.
- MSC : rôles `triggerContext`, `objectiveSubject`, `scenarioSupport`.
- décision : limiter les patrons, mutualiser par paramètres, développer les raccords seulement sur besoin réel.
