Ces fichiers sont les documents de référence officiels maintenus :
- MASTER.md
- ARCHITECTURE_TECHNIQUE.md
- ROADMAP_TODO.md (seule TODO active)
- DEV_HISTORIQUE.md
- MUSIC_SYSTEM_V1.md
- RECOVERY_CHECKPOINT_2026-08-28.md
- RECOVERY_CHECKPOINT_2026-09-01.md
- GAMEPLAY_CONTRACT_ADDENDUM_2026-08-28.md

Base technique courante au 02/09/2026 :
- HEAD validé avant mise à jour documentaire : 8b34d8912667f02140c0c2999b1dfa3f37a8e9ee
- commit : spawn base fix
- le HEAD GitHub courant reste la seule base technique de reprise ;
- aucun nouveau recovery checkpoint n'est créé pour cette clôture ;
- ROADMAP_TODO.md reste la seule TODO active.

État validé ajouté à la référence :
- chaîne Camp → Refuge → Base renforcée raccordée au moteur missionnel ;
- fin Shelter/Base par effet automatique réel, sans interaction BlueFox finale fictive ;
- progression historique distinguée du stock physique courant ;
- réévaluation du manque de stock sur événements d'inventaire pertinents, sans polling ajouté ;
- spawn réussi avant consommation et consommation unique/idempotente ;
- preset canonique propriétaire lorsqu'il existe ;
- Base renforcée sur crystal : x=-2.7567, y=0.25, z=4.768 ;
- après succès Base, Refuge autonome retiré visuellement et de la persistance ; Camp conservé ;
- spawn final validé en jeu puis commit moteur vérifié bit-for-bit.

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
