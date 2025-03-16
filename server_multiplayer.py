import os
import json
from aiohttp import web
import mimetypes

# Configuration
PORT = int(os.environ.get('PORT', 8000))
MAX_PLAYERS = 1000000  # Limite de joueurs, à utiliser si nécessaire

# Affichage des informations d'environnement
print("=== Environment Information ===")
print(f"Current working directory: {os.getcwd()}")
print(f"Directory contents: {os.listdir('.')}")
print(f"PORT: {PORT}")
print("============================")

# Stockage des joueurs connectés
connected_players = {}
player_count = 0

# WebSocket handler
async def websocket_handler(request):
    global player_count
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    
    player_id = None
    player_name = None
    
    try:
        # Attendre le message d'authentification
        auth_message = await ws.receive_str()
        auth_data = json.loads(auth_message)
        
        # Optionnel : vérifier la limite de joueurs
        if player_count >= MAX_PLAYERS:
            await ws.send_str(json.dumps({"error": "Nombre maximum de joueurs atteint"}))
            await ws.close()
            return ws
        
        # Enregistrer le nouveau joueur
        player_id = auth_data.get("id", str(id(ws)))
        player_name = auth_data.get("name", f"Player_{player_id}")
        print(f"New player connected: {player_name} (ID: {player_id})")
        
        # Stocker la connexion du joueur
        connected_players[player_id] = {
            "websocket": ws,
            "name": player_name,
            "position": auth_data.get("position", {"x": 0, "y": 100, "z": 0}),
            "rotation": auth_data.get("rotation", {"x": 0, "y": 0, "z": 0})
        }
        
        player_count += 1
        print(f"Number of connected players: {player_count}")
        
        # Informer le joueur qu'il est connecté
        await ws.send_str(json.dumps({
            "type": "connected",
            "id": player_id,
            "name": player_name,
            "playerCount": player_count
        }))
        
        # Informer tous les joueurs qu'un nouveau joueur a rejoint
        await broadcast_player_joined(player_id)
        
        # Envoyer la liste des joueurs existants au nouveau joueur
        await send_player_list(ws)
        
        # Boucle principale pour les mises à jour de position
        async for msg in ws:
            if msg.type == web.WSMsgType.TEXT:
                data = json.loads(msg.data)
                if data.get("type") == "position":
                    # Mettre à jour la position et la rotation du joueur
                    connected_players[player_id]["position"] = data["position"]
                    connected_players[player_id]["rotation"] = data["rotation"]
                    
                    # Diffuser la mise à jour à tous les autres joueurs
                    await broadcast_position_update(player_id, data["position"], data["rotation"])
            elif msg.type == web.WSMsgType.ERROR:
                print(f"WebSocket connection closed with exception {ws.exception()}")
    
    except Exception as e:
        print(f"Error: {e}")
    finally:
        # Nettoyage lors de la déconnexion du joueur
        if player_id and player_id in connected_players:
            del connected_players[player_id]
            player_count -= 1
            print(f"Player disconnected: {player_name} (ID: {player_id})")
            print(f"Number of connected players: {player_count}")
            await broadcast_player_left(player_id, player_name)
    
    return ws

# Envoi de la liste des joueurs à un client
async def send_player_list(ws):
    players_info = []
    for pid, player in connected_players.items():
        if player["websocket"] != ws:  # Exclure le joueur lui-même
            players_info.append({
                "id": pid,
                "name": player["name"],
                "position": player["position"],
                "rotation": player["rotation"]
            })
    await ws.send_str(json.dumps({
        "type": "playerList",
        "players": players_info,
        "playerCount": player_count
    }))
    print(f"Player list sent: {len(players_info)} players")

# Diffuser une mise à jour de position à tous les joueurs sauf l'expéditeur
async def broadcast_position_update(sender_id, position, rotation):
    for player_id, player in connected_players.items():
        if player_id != sender_id:
            try:
                await player["websocket"].send_str(json.dumps({
                    "type": "playerMove",
                    "id": sender_id,
                    "position": position,
                    "rotation": rotation,
                    "playerCount": player_count
                }))
            except Exception as e:
                print(f"Error broadcasting to {player_id}: {e}")

# Diffuser l'arrivée d'un nouveau joueur aux autres joueurs
async def broadcast_player_joined(new_player_id):
    new_player = connected_players[new_player_id]
    for player_id, player in connected_players.items():
        if player_id != new_player_id:
            try:
                await player["websocket"].send_str(json.dumps({
                    "type": "playerJoined",
                    "id": new_player_id,
                    "name": new_player["name"],
                    "position": new_player["position"],
                    "rotation": new_player["rotation"],
                    "playerCount": player_count
                }))
                print(f"New player notification sent to {player['name']}")
            except Exception as e:
                print(f"Error broadcasting join to {player_id}: {e}")

# Diffuser la déconnexion d'un joueur aux autres joueurs
async def broadcast_player_left(player_id, player_name):
    for _, player in connected_players.items():
        try:
            await player["websocket"].send_str(json.dumps({
                "type": "playerLeft",
                "id": player_id,
                "name": player_name,
                "playerCount": player_count
            }))
            print(f"Leave notification sent to {player['name']}")
        except Exception as e:
            print(f"Error broadcasting leave to a player: {e}")

# Custom static file handler
async def static_file_handler(request):
    print(f"Handling static file request: {request.path}")
    
    # Map root path to index.html
    path = request.path
    if path == '/' or path == '':
        path = '/index.html'
    
    # Remove leading slash
    if path.startswith('/'):
        path = path[1:]
    
    # Construct full file path
    static_path = os.path.join(os.getcwd(), 'public')
    full_path = os.path.join(static_path, path)
    print(f"Full path: {full_path}")
    
    try:
        if not os.path.exists(full_path):
            print(f"File not found: {full_path}")
            raise web.HTTPNotFound()
        
        # Check if path is trying to access parent directories
        if '..' in path:
            print(f"Suspicious path detected: {path}")
            raise web.HTTPForbidden()
        
        # Get file mime type
        content_type = mimetypes.guess_type(full_path)[0]
        if content_type is None:
            content_type = 'application/octet-stream'
        
        # Read and return file
        with open(full_path, 'rb') as f:
            data = f.read()
            
        print(f"Successfully serving {path} ({content_type})")
        return web.Response(body=data, content_type=content_type)
        
    except web.HTTPNotFound:
        print(f"404 Not Found: {path}")
        raise
    except web.HTTPForbidden:
        print(f"403 Forbidden: {path}")
        raise
    except Exception as e:
        print(f"Error serving {path}: {str(e)}")
        raise web.HTTPInternalServerError(text=str(e))

# Create and configure the application
app = web.Application()

# Middleware de débogage pour afficher les requêtes et réponses
@web.middleware
async def debug_middleware(request, handler):
    print(f"\n=== Request Debug ===")
    print(f"Method: {request.method}")
    print(f"Path: {request.path}")
    print(f"Headers: {dict(request.headers)}")
    try:
        response = await handler(request)
        print(f"Response status: {response.status}")
        print(f"Response headers: {dict(response.headers)}")
        return response
    except Exception as e:
        print(f"Error handling request: {e}")
        raise
    finally:
        print("===================\n")

app.middlewares.append(debug_middleware)

# Configuration des routes
app.router.add_get('/ws', websocket_handler)  # Point d'accès WebSocket
app.router.add_get('/{path:.*}', static_file_handler)  # Static files handler

# Configuration du répertoire des fichiers statiques
static_path = os.path.join(os.getcwd(), 'public')
app.router.add_static('/', path=static_path, name='static')

# Vérifier l'existence et le contenu du répertoire "public"
print("\n=== Static Files Configuration ===")
print(f"Static files path: {static_path}")
if os.path.exists(static_path):
    print("Public directory exists")
    print(f"Directory permissions: {oct(os.stat(static_path).st_mode)[-3:]}")
    print(f"Owner UID: {os.stat(static_path).st_uid}")
    print(f"Owner GID: {os.stat(static_path).st_gid}")
    print(f"Contents: {os.listdir(static_path)}")
    
    # List all files recursively
    print("\nAll files in public directory:")
    for root, dirs, files in os.walk(static_path):
        print(f"\nDirectory: {root}")
        print(f"Permissions: {oct(os.stat(root).st_mode)[-3:]}")
        for file in files:
            file_path = os.path.join(root, file)
            print(f"  - {file} (permissions: {oct(os.stat(file_path).st_mode)[-3:]})")
else:
    print(f"Warning: {static_path} does not exist!")
    print(f"Parent directory contents: {os.listdir(os.path.dirname(static_path))}")

if __name__ == '__main__':
    print(f"\nServer starting on port {PORT}")
    web.run_app(app, host='0.0.0.0', port=PORT)
