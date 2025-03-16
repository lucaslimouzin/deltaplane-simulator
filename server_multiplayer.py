import os
import json
import asyncio
import websockets
import http.server
import socketserver
import threading
from urllib.parse import urlparse, parse_qs
from aiohttp import web
import aiohttp

# Configuration
PORT = int(os.environ.get('PORT', 8000))
MAX_PLAYERS = 1000000

# Player storage
connected_players = {}
player_count = 0

# WebSocket handler
async def websocket_handler(request):
    global player_count
    player_id = None
    player_name = None
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    
    try:
        # Wait for authentication message
        auth_message = await ws.receive_str()
        auth_data = json.loads(auth_message)
        
        # Register new player
        player_id = auth_data.get("id", str(id(ws)))
        player_name = auth_data.get("name", f"Player_{player_id}")
        
        print(f"New player connected: {player_name} (ID: {player_id})")
        
        # Store player connection
        connected_players[player_id] = {
            "websocket": ws,
            "name": player_name,
            "position": auth_data.get("position", {"x": 0, "y": 100, "z": 0}),
            "rotation": auth_data.get("rotation", {"x": 0, "y": 0, "z": 0})
        }
        
        player_count += 1
        print(f"Number of connected players: {player_count}")
        
        # Inform player they are connected
        await ws.send_str(json.dumps({
            "type": "connected",
            "id": player_id,
            "name": player_name,
            "playerCount": player_count
        }))
        
        # Inform all players about new player
        await broadcast_player_joined(player_id)
        
        # Send existing player list to new player
        await send_player_list(ws)
        
        # Main loop for position updates
        async for msg in ws:
            if msg.type == web.WSMsgType.TEXT:
                data = json.loads(msg.data)
                
                if data["type"] == "position":
                    # Update player position
                    connected_players[player_id]["position"] = data["position"]
                    connected_players[player_id]["rotation"] = data["rotation"]
                    
                    # Broadcast update to all other players
                    await broadcast_position_update(player_id, data["position"], data["rotation"])
            elif msg.type == web.WSMsgType.ERROR:
                print(f'WebSocket connection closed with exception {ws.exception()}')
    
    except Exception as e:
        print(f"Error: {e}")
    finally:
        # Cleanup when player disconnects
        if player_id and player_id in connected_players:
            del connected_players[player_id]
            player_count -= 1
            print(f"Player disconnected: {player_name} (ID: {player_id})")
            print(f"Number of connected players: {player_count}")
            
            # Inform other players about disconnection
            await broadcast_player_left(player_id, player_name)
    
    return ws

# Send player list to a client
async def send_player_list(ws):
    players_info = []
    
    for pid, player in connected_players.items():
        if player["websocket"] != ws:  # Don't include the player themselves
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

# Broadcast position update to all players except sender
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
            except:
                pass  # Ignore broadcast errors

# Broadcast when a player joins
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
            except:
                pass  # Ignore broadcast errors

# Broadcast when a player leaves
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
        except:
            pass  # Ignore broadcast errors

# Create and configure the application
app = web.Application()

# Configure static files with correct path
static_path = os.path.join(os.path.dirname(__file__), 'public')
print(f"Serving static files from: {static_path}")

# Add routes
app.router.add_get('/ws', websocket_handler)  # WebSocket endpoint
app.router.add_static('/', path=static_path)  # Serve static files from 'public' directory

if __name__ == '__main__':
    print(f"Server starting on port {PORT}")
    web.run_app(app, host='0.0.0.0', port=PORT) 