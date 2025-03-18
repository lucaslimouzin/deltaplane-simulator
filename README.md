# Hang Glider Simulator

A 3D hang glider simulator created with Three.js and served by a Python server. This simulator uses a low poly style for graphics and features simplified flight physics based solely on sail orientation.

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Python (v3.6 or higher)

## Installation

1. Clone this repository:
```
git clone <repo-url>
cd planeur
```

2. Install Node.js dependencies:
```
npm install
```

3. Install Python dependencies:
```
pip install -r requirements.txt
```

4. Build the application:
```
npm run build
```

## Running the Application

1. Start the Python server:
```
npm start
```
or
```
python server.py
```

2. Open your browser at: [http://localhost:8000](http://localhost:8000)

## Controls

- **Up Arrow**: Pitch down (descend)
- **Down Arrow**: Pitch up (ascend)
- **Left Arrow**: Roll left (turn left)
- **Right Arrow**: Roll right (turn right)
- **R**: Reset position

## Development

For development in "watch" mode (automatic rebuild on changes):
```
npm run watch
```

## Features

- Hang glider flight simulation with simplified physics
- Procedurally generated terrain with low poly style
- Mountains, forests, and water bodies
- Realistically placed trees (touching ground or other trees)
- Low poly clouds
- Wind effects and thermals
- Terrain collision detection
- Smooth camera following the hang glider
- Multiplayer support

## Project Structure

- `public/` : Static files served by the server
  - `index.html` : Main HTML page
  - `js/` : Compiled JavaScript
- `src/` : Source code
  - `index.js` : Application entry point
  - `deltaplane.js` : Hang glider class and physics
  - `terrain.js` : Terrain and environmental elements generation
  - `multiplayer.js` : Multiplayer functionality
- `server_multiplayer.py` : WebSocket server for multiplayer
- `server.py` : HTTP server for serving the application
- `requirements.txt` : Python dependencies

## Dependencies

### Python Dependencies
Listed in requirements.txt:
- websockets>=11.0.3 : For WebSocket connections

### Node.js Dependencies
Listed in package.json:
- three.js : For 3D graphics
- webpack : For bundling
- Other development dependencies

## License

MIT 