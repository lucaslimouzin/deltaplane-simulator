import os
import json
import asyncio
import websockets
import http.server
import socketserver
import threading
from urllib.parse import urlparse, parse_qs

# Configuration
PORT = 8000
MAX_PLAYERS = 10
WEBSOCKET_PORT = 8001

# Stockage des joueurs connectés
connected_players = {}
player_count = 0

# Serveur HTTP pour servir les fichiers statiques
class HttpRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        print(f"Requête GET reçue pour: {self.path}")
        
        # Servir le fichier index.html pour la racine
        if self.path == '/':
            self.path = '/public/index.html'
            print(f"Redirection vers: {self.path}")
        # Rediriger bundle.js vers le bon emplacement
        elif self.path == '/js/bundle.js':
            self.path = '/public/js/bundle.js'
            print(f"Redirection vers: {self.path}")
        # Rediriger bundle.js.map vers le bon emplacement
        elif self.path == '/js/bundle.js.map':
            self.path = '/public/js/bundle.js.map'
            print(f"Redirection vers: {self.path}")
        # Rediriger favicon.png vers le bon emplacement
        elif self.path == '/favicon.png':
            self.path = '/public/favicon.png'
            print(f"Redirection vers: {self.path}")
        # Sinon, servir les fichiers normalement
        
        try:
            return http.server.SimpleHTTPRequestHandler.do_GET(self)
        except Exception as e:
            print(f"Erreur lors du traitement de la requête: {e}")
            self.send_error(500, f"Erreur interne du serveur: {e}")

# Démarrer le serveur HTTP dans un thread séparé
def start_http_server():
    # Utiliser "0.0.0.0" pour écouter sur toutes les interfaces réseau
    with socketserver.TCPServer(("0.0.0.0", PORT), HttpRequestHandler) as httpd:
        print(f"Serveur HTTP démarré sur le port {PORT}")
        print(f"Ouvrez votre navigateur à l'adresse: http://localhost:{PORT}")
        print(f"Pour accéder depuis d'autres ordinateurs du réseau local, utilisez l'adresse IP de cet ordinateur")
        httpd.serve_forever()

# Gestionnaire de connexions WebSocket
async def websocket_handler(websocket, path):
    global player_count
    player_id = None
    player_name = None
    
    try:
        # Attendre le message d'authentification
        auth_message = await websocket.recv()
        auth_data = json.loads(auth_message)
        
        # Vérifier si le serveur est plein
        if player_count >= MAX_PLAYERS:
            await websocket.send(json.dumps({
                "type": "error",
                "message": "Le serveur est plein (maximum 10 joueurs)"
            }))
            return
        
        # Enregistrer le nouveau joueur
        player_id = auth_data.get("id", str(id(websocket)))
        player_name = auth_data.get("name", f"Joueur_{player_id}")
        
        print(f"Nouveau joueur connecté: {player_name} (ID: {player_id})")
        
        # Stocker la connexion du joueur
        connected_players[player_id] = {
            "websocket": websocket,
            "name": player_name,
            "position": auth_data.get("position", {"x": 0, "y": 100, "z": 0}),
            "rotation": auth_data.get("rotation", {"x": 0, "y": 0, "z": 0})
        }
        
        player_count += 1
        print(f"Nombre de joueurs connectés: {player_count}")
        
        # Informer le joueur qu'il est connecté
        await websocket.send(json.dumps({
            "type": "connected",
            "id": player_id,
            "name": player_name,
            "playerCount": player_count
        }))
        
        # Informer tous les joueurs du nouveau joueur
        await broadcast_player_joined(player_id)
        
        # Envoyer la liste des joueurs existants au nouveau joueur
        await send_player_list(websocket)
        
        # Boucle principale pour recevoir les mises à jour de position
        async for message in websocket:
            data = json.loads(message)
            
            if data["type"] == "position":
                # Mettre à jour la position du joueur
                connected_players[player_id]["position"] = data["position"]
                connected_players[player_id]["rotation"] = data["rotation"]
                
                # Diffuser la mise à jour à tous les autres joueurs
                await broadcast_position_update(player_id, data["position"], data["rotation"])
    
    except websockets.exceptions.ConnectionClosed:
        print(f"Connexion fermée pour {player_name}")
    except Exception as e:
        print(f"Erreur: {e}")
    finally:
        # Nettoyer lorsque le joueur se déconnecte
        if player_id and player_id in connected_players:
            del connected_players[player_id]
            player_count -= 1
            print(f"Joueur déconnecté: {player_name} (ID: {player_id})")
            print(f"Nombre de joueurs connectés: {player_count}")
            
            # Informer les autres joueurs de la déconnexion
            await broadcast_player_left(player_id, player_name)

# Envoyer la liste des joueurs connectés à un client
async def send_player_list(websocket):
    players_info = []
    
    for pid, player in connected_players.items():
        if player["websocket"] != websocket:  # Ne pas inclure le joueur lui-même
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
    
    print(f"Liste des joueurs envoyée: {len(players_info)} joueurs")

# Diffuser un message à tous les joueurs sauf l'expéditeur
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
            except:
                pass  # Ignorer les erreurs de diffusion

# Diffuser un message quand un joueur rejoint
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
                print(f"Notification de nouveau joueur envoyée à {player['name']}")
            except:
                pass  # Ignorer les erreurs de diffusion

# Diffuser un message quand un joueur quitte
async def broadcast_player_left(player_id, player_name):
    for _, player in connected_players.items():
        try:
            await player["websocket"].send(json.dumps({
                "type": "playerLeft",
                "id": player_id,
                "name": player_name,
                "playerCount": player_count
            }))
            print(f"Notification de départ envoyée à {player['name']}")
        except:
            pass  # Ignorer les erreurs de diffusion

# Démarrer le serveur WebSocket
async def start_websocket_server():
    # Utiliser "0.0.0.0" pour écouter sur toutes les interfaces réseau
    async with websockets.serve(websocket_handler, "0.0.0.0", WEBSOCKET_PORT):
        print(f"Serveur WebSocket démarré sur le port {WEBSOCKET_PORT}")
        print(f"Pour accéder depuis d'autres ordinateurs du réseau local, utilisez l'adresse IP de cet ordinateur")
        await asyncio.Future()  # Exécuter indéfiniment

# Fonction principale
def main():
    # Démarrer le serveur HTTP dans un thread séparé
    http_thread = threading.Thread(target=start_http_server)
    http_thread.daemon = True
    http_thread.start()
    
    # Démarrer le serveur WebSocket dans la boucle principale
    try:
        asyncio.run(start_websocket_server())
    except KeyboardInterrupt:
        print("Serveur arrêté.")

if __name__ == "__main__":
    main() 