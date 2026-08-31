Ces fichiers sont les documents de référence officiels maintenus :
- MASTER.md
- ARCHITECTURE_TECHNIQUE.md
- ROADMAP_TODO.md (seule TODO active)
- DEV_HISTORIQUE.md
- MUSIC_SYSTEM_V1.md
- RECOVERY_CHECKPOINT_2026-08-28.md
- RECOVERY_CHECKPOINT_2026-09-01.md
- GAMEPLAY_CONTRACT_ADDENDUM_2026-08-28.md

Base technique de reprise au 01/09/2026 :
- HEAD de référence avant clôture : e12558f40f38129e4d3b4a3e6d85f54b3a2cac6f
- commit : pass CPU 2 (musique)
- chantier trigger/cible missionnelle : FAIL moteur
- correctifs runtime de la session : rejetés
- seule sortie retenue pour commit : IMI — CONTRAT IA D'INTÉGRATION DES MISSIONS
- prochaine reprise : HEAD GitHub propre après le commit IMI

Règle de priorité documentaire :
1. décision utilisateur la plus récente ;
2. validation runtime en jeu ;
3. Contrat Gameplay Opérationnel V2 + addendum courant ;
4. MASTER / ARCHITECTURE / ROADMAP / DEV_HISTORIQUE ;
5. annexes et documents historiques.

Les DOCX historiques restent des sources utiles de décision, mais une ancienne traduction
technique ne doit pas remplacer le HEAD ou une décision plus récente.

ROADMAP_TODO.md reste la seule TODO active.

Règle spécifique de reprise du chantier trigger/cible :
- ne réutiliser aucun ZIP moteur produit pendant la session du 31/08→01/09 ;
- conserver la distinction IMI REVEAL-ONLY / SAME-DEFINITION / SAME-INSTANCE ;
- ne déclarer PASS qu'après validation du cycle réel
  chargement → MissionManager → Planner → ObjectM0 → ActionBridge → interaction.
