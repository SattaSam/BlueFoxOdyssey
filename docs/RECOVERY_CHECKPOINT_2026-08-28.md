# BlueFox Odyssey — Recovery checkpoint — 28 août 2026

Base technique : `c75fa77b2afe59a0d3dc41fc00453c3dc47a1d64`

## Statut
Checkpoint de reprise après la récupération intégrée. T11 retour autonome et T13 autocraft restent ouverts.

## Règles structurantes
- MissionManager = lifecycle + sélection missionnelle.
- BAC = arbitrage comportemental, sans second choix missionnel.
- WorldEngine = monde/transitions/navigation/directive joueur persistante.
- ObjectM0 = CUO/même instance/fan-out.
- BibleRuntime = interprétation/effets/gates sans lifecycle propriétaire.
- SaveUI = snapshot après flush.
- UI = jamais propriétaire gameplay.
- aucun bridge parallèle.

## Navigation joueur
Règle B : mémorisation immédiate, fin de l’action atomique, puis priorité à la directive avant toute nouvelle décision ; persistance au reload.

## Écarts ouverts
### T11
Retour autonome historiquement validé mais non reproduit au checkpoint. Récupérer le dernier flux fonctionnel, ne pas inventer un nouveau système.

### T13
Autocraft ration non déclenché. Tracer génériquement `CRAFT → planner/BAC → propriétaire craft → inventaire → événement → progression`.
