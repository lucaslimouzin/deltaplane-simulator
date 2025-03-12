# Simulateur de Deltaplane

Un simulateur de deltaplane en 3D créé avec Three.js et servi par un serveur Python. Ce simulateur utilise un style low poly pour les graphismes et propose une physique de vol simplifiée basée uniquement sur l'orientation de la voile.

## Prérequis

- Node.js (v14 ou supérieur)
- npm (v6 ou supérieur)
- Python (v3.6 ou supérieur)

## Installation

1. Clonez ce dépôt :
```
git clone <url-du-repo>
cd planeur
```

2. Installez les dépendances :
```
npm install
```

3. Construisez l'application :
```
npm run build
```

## Lancement

1. Démarrez le serveur Python :
```
npm start
```
ou
```
python server.py
```

2. Ouvrez votre navigateur à l'adresse : [http://localhost:8000](http://localhost:8000)

## Contrôles

- **Flèche haut** : Piquer vers l'avant (descendre)
- **Flèche bas** : Cabrer (monter)
- **Flèche gauche** : Incliner à gauche (tourner à gauche)
- **Flèche droite** : Incliner à droite (tourner à droite)
- **R** : Réinitialiser la position

## Développement

Pour développer en mode "watch" (reconstruction automatique lors des modifications) :
```
npm run watch
```

## Fonctionnalités

- Simulation de vol en deltaplane avec physique simplifiée
- Terrain généré procéduralement avec style low poly
- Montagnes, forêts et plans d'eau
- Arbres placés de manière réaliste (touchant le sol ou d'autres arbres)
- Nuages low poly
- Effets de vent et thermiques
- Détection de collision avec le terrain
- Caméra qui suit le deltaplane de manière fluide

## Structure du projet

- `public/` : Fichiers statiques servis par le serveur
  - `index.html` : Page HTML principale
  - `js/` : JavaScript compilé
- `src/` : Code source
  - `index.js` : Point d'entrée de l'application
  - `deltaplane.js` : Classe pour le deltaplane et sa physique
  - `terrain.js` : Génération du terrain et des éléments environnementaux
- `server.py` : Serveur Python pour servir l'application

## Licence

MIT 