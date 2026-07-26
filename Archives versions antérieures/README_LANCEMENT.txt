BLUEFOX ODYSSEY — LANCEMENT LOCAL

Le fichier index.html ne doit pas être ouvert directement par double-clic.

Pourquoi :
- le navigateur bloque souvent les modules JavaScript depuis file:// ;
- le navigateur bloque le chargement du fichier GLB depuis file:// ;
- Three.js et GLTFLoader nécessitent ici un serveur HTTP local.

PROCÉDURE

1. Double-clique sur START_BLUEFOX.bat.
2. Une fenêtre PowerShell ou CMD reste ouverte.
3. Le navigateur ouvre automatiquement :
   http://localhost:8000/
4. Pour arrêter le jeu, ferme la fenêtre du serveur ou appuie sur Ctrl+C.

Cette version utilise encore Three.js depuis Internet.
Une future étape intégrera Three.js localement pour permettre un fonctionnement totalement hors ligne.
