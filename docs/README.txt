Ces fichiers sont les documents de référence officiels maintenus :
- MASTER.md
- ARCHITECTURE_TECHNIQUE.md
- ROADMAP_TODO.md (seule TODO active)
- DEV_HISTORIQUE.md
- MUSIC_SYSTEM_V1.md
- RECOVERY_CHECKPOINT_2026-08-28.md
- RECOVERY_CHECKPOINT_2026-09-01.md
- GAMEPLAY_CONTRACT_ADDENDUM_2026-08-28.md

Base technique courante au 08/09/2026 :
- HEAD moteur validé avant mise à jour documentaire : 1f20ba014686f5f6eadac78a22b89077bca8e380
- commit : /!\ GAME CIVilisation ENINERING + Etabli+feu +fichiers sensibles /!\ GROS LOT
- parent : 3705d40399437058fcc62a9bc99f2ee96defc75e — Missions FAUNA R2
- le HEAD GitHub courant reste la seule base technique de reprise ;
- ROADMAP_TODO.md reste la seule TODO active ;
- aucun nouveau recovery checkpoint n'est créé pour cette mise à jour.

État validé ajouté à la référence :
- industrialisation missionnelle réalisée depuis le 2 septembre : FLO, GEO-01→07, COL, ENV, LOC, SUR, GAME R1/R2, FAUNA R1/R2 et ENE-01→10 ;
- lot GAME Civilisation/Engineering validé au HEAD : GAME-civilization_1→5, GAME-engineering_3→6 et GAME-fire ;
- réserve abandonnée persistante : 350 fibres + 175 azure_ferrite + 175 magnetic_ore, prélèvement limité par la capacité du sac sans faux RESOURCE_COLLECTED ;
- GAME-base réconciliée sur le stock physique courant par événements d'inventaire, sans polling ;
- missions répétables supportées génériquement par MissionManager ; GAME-fire consomme 8 bois et ne force pas un retour au camp ;
- Blueprint et construction WORKBENCH disponibles uniquement sur Crystal après la Base ; coût réel : 20 magnetic_ore + 20 azure_ferrite + 20 resonant_basalt + 20 stellar_iridium + 25 fiber + 10 parts + 20 wood ;
- placement joueur de l'établi via l'UI existante ; site WORKBENCH persistant avec anchor/rotation réels ;
- ProgressionRegistry expose un crédit d'inventaire canonique sans progression historique de collecte artificielle ;
- FAUNA R2 et ENE-01→10 préservées dans le cumulatif post-commit.

Points explicitement encore ouverts :
- industrialiser ENE-11→14 maintenant que l'établi existe réellement ;
- améliorer la console/commande joueur des drones dans Recherche en réutilisant le runtime drone existant ;
- généraliser le Kit d'expédition aux objets transportables fabriqués (accumulateur, puis futurs objets activables comme une balise) ;
- rendre le Journal évolutif lazy à l'ouverture et persistant par briques stables, sans reconstruction/recalcul continu ;
- ENE-15 reste différé tant que ses prérequis documentaires ne sont pas réellement industrialisés ;
- poursuivre les audits CPU/cadence, autorité missionnelle, Survival et IMI tant qu'une clôture runtime complète n'est pas prouvée.

Règle de priorité documentaire :
1. décision utilisateur la plus récente ;
2. validation runtime en jeu ;
3. Contrat Gameplay Opérationnel V2 + addendum courant ;
4. MASTER / ARCHITECTURE / ROADMAP / DEV_HISTORIQUE ;
5. annexes et documents historiques.

Les DOCX et recovery checkpoints historiques restent des sources utiles de décision et de contexte.
Ils ne remplacent jamais le HEAD courant lorsqu'une décision ou une validation plus récente existe.

Règle spécifique trigger/cible missionnelle :
- conserver la distinction IMI REVEAL-ONLY / SAME-DEFINITION / SAME-INSTANCE ;
- ne pas réintroduire de migration automatique de sauvegarde rejetée ;
- ne déclarer PASS qu'après validation du cycle réel
  chargement → MissionManager → Planner → ObjectM0 → ActionBridge → interaction.
