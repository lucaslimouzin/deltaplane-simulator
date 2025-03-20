import os
import json
import asyncio
import websockets
import mimetypes
from http.server import HTTPServer, SimpleHTTPRequestHandler

# Configuration
PORT = int(os.environ.get('PORT', 8000))
IS_DEVELOPMENT = os.environ.get('NODE_ENV') != 'production'

if IS_DEVELOPMENT:
    PORT = 8000
    WEBSOCKET_PORT = 8001
else:
    WEBSOCKET_PORT = PORT

MAX_PLAYERS = 1000000

# Stockage des joueurs connectés
connected_players = {}
player_count = 0

async def handle_websocket(websocket, path):
    global player_count
    player_id = None
    player_name = None
    
    try:
        # Attendre le message d'authentification
        auth_message = await websocket.recv()
        auth_data = json.loads(auth_message)
        
        if player_count >= MAX_PLAYERS:
            await websocket.send(json.dumps({"error": "Nombre maximum de joueurs atteint"}))
            return
        
        # Enregistrer le nouveau joueur
        player_id = auth_data.get("id", str(id(websocket)))
        player_name = auth_data.get("name", f"Player_{player_id}")
        
        # Stocker la connexion du joueur
        connected_players[player_id] = {
            "websocket": websocket,
            "name": player_name,
            "position": auth_data.get("position", {"x": 0, "y": 100, "z": 0}),
            "rotation": auth_data.get("rotation", {"x": 0, "y": 0, "z": 0})
        }
        
        player_count += 1
        
        # Informer le joueur qu'il est connecté
        await websocket.send(json.dumps({
            "type": "connected",
            "id": player_id,
            "name": player_name,
            "playerCount": player_count
        }))
        
        # Informer tous les joueurs qu'un nouveau joueur a rejoint
        await broadcast_player_joined(player_id)
        
        # Envoyer la liste des joueurs existants au nouveau joueur
        await send_player_list(websocket)
        
        # Boucle principale pour les mises à jour de position
        async for message in websocket:
            data = json.loads(message)
            if data.get("type") == "position":
                # Mettre à jour la position et la rotation du joueur
                connected_players[player_id]["position"] = data["position"]
                connected_players[player_id]["rotation"] = data["rotation"]
                
                # Diffuser la mise à jour à tous les autres joueurs
                await broadcast_position_update(player_id, data["position"], data["rotation"])
    
    except websockets.exceptions.ConnectionClosed:
        print(f"Client disconnected: {player_id}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        # Nettoyage lors de la déconnexion du joueur
        if player_id and player_id in connected_players:
            del connected_players[player_id]
            player_count -= 1
            await broadcast_player_left(player_id, player_name)

# Envoi de la liste des joueurs à un client
async def send_player_list(websocket):
    players_info = []
    for pid, player in connected_players.items():
        if player["websocket"] != websocket:  # Exclure le joueur lui-même
            players_info.append({
                "id": pid,
                "name": player["name"],
                "position": player["position"],
                "rotation": player["rotation"]
            })
    await websocket.send(json.dumps({
        "type": "playerList",
        "players": players_info,
        "playerCount": player_count
    }))

# Diffuser une mise à jour de position à tous les joueurs sauf l'expéditeur
async def broadcast_position_update(sender_id, position, rotation):
    for player_id, player in connected_players.items():
        if player_id != sender_id:
            try:
                await player["websocket"].send(json.dumps({
                    "type": "playerMove",
                    "id": sender_id,
                    "position": position,
                    "rotation": rotation,
                    "playerCount": player_count
                }))
            except Exception:
                pass

# Diffuser l'arrivée d'un nouveau joueur aux autres joueurs
async def broadcast_player_joined(new_player_id):
    new_player = connected_players[new_player_id]
    for player_id, player in connected_players.items():
        if player_id != new_player_id:
            try:
                await player["websocket"].send(json.dumps({
                    "type": "playerJoined",
                    "id": new_player_id,
                    "name": new_player["name"],
                    "position": new_player["position"],
                    "rotation": new_player["rotation"],
                    "playerCount": player_count
                }))
            except Exception:
                pass

# Diffuser la déconnexion d'un joueur aux autres joueurs
async def broadcast_player_left(player_id, player_name):
    for _, player in connected_players.items():
        try:
            await player["websocket"].send(json.dumps({
                "type": "playerLeft",
                "id": player_id,
                "name": player_name,
                "playerCount": player_count
            }))
        except Exception:
            pass

# Serveur HTTP simple pour les fichiers statiques
class StaticHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory="public", **kwargs)

def run_http_server():
    server = HTTPServer(('0.0.0.0', PORT), StaticHandler)
    print(f"=== HTTP Server ===")
    print(f"Host: 0.0.0.0")
    print(f"Port: {PORT}")
    print(f"Status: Online")
    server.serve_forever()

async def main():
    # Start WebSocket server
    async with websockets.serve(handle_websocket, "0.0.0.0", WEBSOCKET_PORT):
        print(f"=== WebSocket Server ===")
        print(f"Host: 0.0.0.0")
        print(f"Port: {WEBSOCKET_PORT}")
        print(f"Status: Online")
        await asyncio.Future()  # run forever

if __name__ == '__main__':
    # Start HTTP server in a separate thread if in development
    if IS_DEVELOPMENT:
        import threading
        http_thread = threading.Thread(target=run_http_server)
        http_thread.daemon = True
        http_thread.start()
    else:
        # In production, start HTTP server in the main thread
        run_http_server()
