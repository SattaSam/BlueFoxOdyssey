# Système de géographie de BlueFox Odyssey

## Hiérarchie

- La planète mémorise une succession ordonnée de **maps**.
- Une map contient de **1 à 6 zones distinctes**.
- Les zones d’une même map partagent une seule image de fond et sont reliées par des chemins clairement identifiables.
- Un changement de map change l’image de fond et reconstruit l’assemblage de zones.

## Progression narrative

- Map 1 : 1 zone — abri et épave de la capsule.
- Map 2 : 2 zones.
- Map 3 : 4 zones.
- Map 4 : 6 zones.
- Ensuite : 1 à 6 zones générées de façon semi-aléatoire à partir d’une graine persistante, des contraintes narratives et du biome.

Chaque création mémorise au minimum son identifiant, son ordre de découverte, sa graine, son fond, ses zones, ses chemins et ses points narratifs imposés. Le menu Planète ajoute progressivement ces maps à la sphère.

## Règles d’exploration

1. BlueFox peut agir librement dans une map connue.
2. Il ne peut rejoindre une map jamais visitée qu’après une suggestion du joueur ou une injonction narrative, pendant que le jeu est ouvert.
3. Dès cette première visite enregistrée, il peut revenir vers cette map de manière autonome.
4. La simulation hors ligne peut collecter, observer, se reposer et progresser sans risque dans les maps déjà connues.
5. La simulation hors ligne ne peut ni créer, ni révéler, ni inaugurer une map.

Ces règles séparent la progression narrative irréversible des activités autonomes sûres.

## Autonomie utilitaire

BlueFox ne choisit plus une cible au hasard. À chaque nouveau cycle, il classe les
actions disponibles dans les maps mémorisées selon :

- les six priorités réglées par le joueur ;
- son niveau d’énergie et son besoin de repos ;
- la distance à parcourir ;
- la nouveauté d’une observation ;
- le type d’objet : ressource, structure, découverte ou relation.

Le joueur donne une impulsion, jamais un ordre strict. BlueFox peut la différer.
Sous un seuil critique d’énergie, la sécurité devient prioritaire et provoque
une pause courte sans mort ni fin de partie.

## Sauvegarde

La sauvegarde locale versionnée conserve les ressources, l’énergie, les
priorités, la personnalité, les 50 dernières actions et la mémoire ordonnée des
maps. Chaque map mémorise sa graine reproductible et les zones effectivement
visitées. Une ancienne sauvegarde est complétée automatiquement avec les champs
manquants.

## Directeur de missions local

Les missions ne sont pas imposées par le joueur ni tirées au hasard. BlueFox
les choisit localement à partir de ses priorités, des ressources disponibles,
de ses connaissances et de ses relations. Une mission possède :

- une motivation mémorisée ;
- trois étapes observables ;
- une progression calculée à partir des actions réellement accomplies ;
- une transition automatique vers un nouveau projet lorsqu’elle est terminée.

Les actions d’analyse enrichissent une mémoire scientifique structurée. Les
contacts pacifiques enrichissent une mémoire relationnelle séparée. Ces deux
valeurs alimentent le Journal, la Recherche, l’intention actuelle et les futurs
choix de mission. Le mode hors ligne peut faire progresser des tâches ordinaires
dans une map connue, mais ne valide jamais une découverte décisive.

## Navigation et boussole

La boussole N/O/E/S est une interface d’influence, pas une télécommande. Chaque
direction désigne un chemin nommé et une destination cohérente avec la map
active. BlueFox peut accepter la suggestion immédiatement ou la différer pour
terminer son action.

- Dans une map, les directions relient les zones et les points remarquables.
- Une traversée entre deux maps utilise les mêmes règles de découverte.
- Une map inconnue ne peut jamais être inaugurée hors ligne.
- Chaque zone atteinte est ajoutée à `visitedZones`.
- Le menu Planète et la boussole en jeu utilisent le même graphe de navigation.

La Map 01 conserve une seule zone (« Abri et épave ») avec plusieurs points de
déplacement internes. La Map 02 distingue « Clairière des stèles » et « Ruines
noyées », reliées par le chemin nord-sud.
