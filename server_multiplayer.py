import os
import json
import asyncio
import websockets
import mimetypes
from aiohttp import web
from aiohttp.web import middleware

# Configuration
PORT = int(os.environ.get('PORT', 10000))
IS_PRODUCTION = os.environ.get('NODE_ENV') == 'production'

# Player storage
connected_players = {}
player_count = 0
MAX_PLAYERS = 1000000

# WebSocket handler
async def handle_websocket(websocket, path):
    global player_count
    player_id = None
    player_name = None
    
    try:
        # Wait for authentication message
        auth_message = await websocket.recv()
        auth_data = json.loads(auth_message)
        
        if player_count >= MAX_PLAYERS:
            await websocket.send(json.dumps({"error": "Maximum number of players reached"}))
            return
        
        # Register new player
        player_id = auth_data.get("id", str(id(websocket)))
        player_name = auth_data.get("name", f"Player_{player_id}")
        
        # Store player connection
        connected_players[player_id] = {
            "websocket": websocket,
            "name": player_name,
            "position": auth_data.get("position", {"x": 0, "y": 100, "z": 0}),
            "rotation": auth_data.get("rotation", {"x": 0, "y": 0, "z": 0})
        }
        
        player_count += 1
        
        # Inform player they are connected
        await websocket.send(json.dumps({
            "type": "connected",
            "id": player_id,
            "name": player_name,
            "playerCount": player_count
        }))
        
        # Broadcast new player joined
        await broadcast_player_joined(player_id)
        
        # Send existing players list
        await send_player_list(websocket)
        
        # Main loop for position updates
        async for message in websocket:
            data = json.loads(message)
            if data.get("type") == "position":
                connected_players[player_id]["position"] = data["position"]
                connected_players[player_id]["rotation"] = data["rotation"]
                await broadcast_position_update(player_id, data["position"], data["rotation"])
    
    except websockets.exceptions.ConnectionClosed:
        print(f"Client disconnected: {player_id}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if player_id and player_id in connected_players:
            del connected_players[player_id]
            player_count -= 1
            await broadcast_player_left(player_id, player_name)

# Helper functions for broadcasting messages
async def broadcast_position_update(sender_id, position, rotation):
    for player_id, player in connected_players.items():
        if player_id != sender_id:
            try:
                await player["websocket"].send_json({
                    "type": "playerMove",
                    "id": sender_id,
                    "position": position,
                    "rotation": rotation,
                    "playerCount": player_count
                })
            except Exception as e:
                print(f"Error broadcasting position update: {e}")

async def broadcast_player_joined(new_player_id):
    new_player = connected_players[new_player_id]
    for player_id, player in connected_players.items():
        if player_id != new_player_id:
            try:
                await player["websocket"].send_json({
                    "type": "playerJoined",
                    "id": new_player_id,
                    "name": new_player["name"],
                    "position": new_player["position"],
                    "rotation": new_player["rotation"],
                    "playerCount": player_count
                })
            except Exception as e:
                print(f"Error broadcasting player joined: {e}")

async def broadcast_player_left(player_id, player_name):
    for _, player in connected_players.items():
        try:
            await player["websocket"].send_json({
                "type": "playerLeft",
                "id": player_id,
                "name": player_name,
                "playerCount": player_count
            })
        except Exception as e:
            print(f"Error broadcasting player left: {e}")

async def send_player_list(websocket):
    try:
        players_info = []
        for pid, player in connected_players.items():
            if player["websocket"] != websocket:
                players_info.append({
                    "id": pid,
                    "name": player["name"],
                    "position": player["position"],
                    "rotation": player["rotation"]
                })
        await websocket.send_json({
            "type": "playerList",
            "players": players_info,
            "playerCount": player_count
        })
    except Exception as e:
        print(f"Error sending player list: {e}")

# HTTP routes
routes = web.RouteTableDef()

@routes.get('/')
async def handle_static(request):
    return web.FileResponse('./public/index.html')

@routes.get('/ws')
async def websocket_handler(request):
    ws = web.WebSocketResponse(heartbeat=55.0)  # Add heartbeat to keep connection alive
    await ws.prepare(request)
    
    if not ws.closed:
        global player_count
        player_id = None
        player_name = None
        
        try:
            # Wait for authentication message
            auth_message = await ws.receive_json()
            print("Received auth message:", auth_message)  # Debug log
            
            if auth_message.get('type') != 'auth':
                await ws.send_json({"type": "error", "message": "Invalid authentication message"})
                return ws
            
            if player_count >= MAX_PLAYERS:
                await ws.send_json({"type": "error", "message": "Maximum number of players reached"})
                return ws
            
            # Register new player
            player_id = str(id(ws))  # Generate unique ID
            player_name = auth_message.get("name", f"Player_{player_id}")
            
            # Store player connection
            connected_players[player_id] = {
                "websocket": ws,
                "name": player_name,
                "position": auth_message.get("position", {"x": 0, "y": 100, "z": 0}),
                "rotation": auth_message.get("rotation", {"x": 0, "y": 0, "z": 0})
            }
            
            player_count += 1
            print(f"Player {player_name} connected. Total players: {player_count}")  # Debug log
            
            # Inform player they are connected
            await ws.send_json({
                "type": "connected",
                "id": player_id,
                "name": player_name,
                "playerCount": player_count
            })
            
            # Broadcast new player joined
            await broadcast_player_joined(player_id)
            
            # Send existing players list
            await send_player_list(ws)
            
            # Main loop for position updates
            async for msg in ws:
                if msg.type == web.WSMsgType.TEXT:
                    try:
                        data = json.loads(msg.data)
                        print(f"Received message from {player_name}:", data)  # Debug log
                        
                        if data.get("type") == "position":
                            connected_players[player_id]["position"] = data["position"]
                            connected_players[player_id]["rotation"] = data["rotation"]
                            await broadcast_position_update(player_id, data["position"], data["rotation"])
                    except json.JSONDecodeError:
                        print(f"Invalid JSON from {player_name}")
                elif msg.type == web.WSMsgType.ERROR:
                    print(f'WebSocket connection closed with exception {ws.exception()}')
                elif msg.type == web.WSMsgType.CLOSE:
                    print(f'WebSocket connection closed by client {player_name}')
                    break
        
        except Exception as e:
            print(f"Error handling WebSocket for {player_name}: {e}")
        finally:
            if player_id and player_id in connected_players:
                del connected_players[player_id]
                player_count -= 1
                print(f"Player {player_name} disconnected. Total players: {player_count}")  # Debug log
                await broadcast_player_left(player_id, player_name)
    
    return ws

# Create and configure the application
app = web.Application()
app.add_routes(routes)
app.router.add_static('/', path='./public')

if __name__ == '__main__':
    web.run_app(app, host='0.0.0.0', port=PORT)
