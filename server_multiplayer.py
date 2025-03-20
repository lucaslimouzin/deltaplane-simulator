import os
import json
from aiohttp import web

# Configuration
PORT = int(os.environ.get('PORT', 10000))
IS_PRODUCTION = os.environ.get('NODE_ENV') == 'production'

# Player storage
connected_players = {}
player_count = 0
MAX_PLAYERS = 1000000

# Helper functions for broadcasting messages
async def broadcast_position_update(sender_id, position, rotation):
    for player_id, player in connected_players.items():
        if player_id != sender_id:
            try:
                ws = player["websocket"]
                if not ws.closed:
                    await ws.send_json({
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
                ws = player["websocket"]
                if not ws.closed:
                    await ws.send_json({
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
    for player in connected_players.values():
        try:
            ws = player["websocket"]
            if not ws.closed:
                await ws.send_json({
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
        
        if not websocket.closed:
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
    ws = web.WebSocketResponse(heartbeat=55.0)
    await ws.prepare(request)
    
    if not ws.closed:
        global player_count
        player_id = None
        player_name = None
        
        try:
            # Wait for authentication message
            auth_message = await ws.receive_json()
            print("Received auth message:", auth_message)
            
            if auth_message.get('type') != 'auth':
                await ws.send_json({"type": "error", "message": "Invalid authentication message"})
                return ws
            
            if player_count >= MAX_PLAYERS:
                await ws.send_json({"type": "error", "message": "Maximum number of players reached"})
                return ws
            
            # Register new player
            player_id = str(id(ws))
            player_name = auth_message.get("name", f"Player_{player_id}")
            
            # Store player connection
            connected_players[player_id] = {
                "websocket": ws,
                "name": player_name,
                "position": auth_message.get("position", {"x": 0, "y": 100, "z": 0}),
                "rotation": auth_message.get("rotation", {"x": 0, "y": 0, "z": 0})
            }
            
            player_count += 1
            print(f"Player {player_name} connected. Total players: {player_count}")
            
            # Inform player they are connected
            await ws.send_json({
                "type": "connected",
                "id": player_id,
                "name": player_name,
                "playerCount": player_count
            })
            
            # Send existing players list first
            await send_player_list(ws)
            
            # Then broadcast new player joined
            await broadcast_player_joined(player_id)
            
            # Main loop for position updates
            async for msg in ws:
                if msg.type == web.WSMsgType.TEXT:
                    try:
                        data = json.loads(msg.data)
                        print(f"Received message from {player_name}:", data)
                        
                        if data.get("type") == "position":
                            connected_players[player_id]["position"] = data["position"]
                            connected_players[player_id]["rotation"] = data["rotation"]
                            await broadcast_position_update(player_id, data["position"], data["rotation"])
                    except json.JSONDecodeError:
                        print(f"Invalid JSON from {player_name}")
                elif msg.type == web.WSMsgType.ERROR:
                    print(f'WebSocket connection closed with exception {ws.exception()}')
                    break
                elif msg.type == web.WSMsgType.CLOSE:
                    print(f'WebSocket connection closed by client {player_name}')
                    break
        
        except Exception as e:
            print(f"Error handling WebSocket for {player_name}: {e}")
        finally:
            if player_id and player_id in connected_players:
                del connected_players[player_id]
                player_count -= 1
                print(f"Player {player_name} disconnected. Total players: {player_count}")
                await broadcast_player_left(player_id, player_name)
    
    return ws

# Create and configure the application
app = web.Application()
app.add_routes(routes)
app.router.add_static('/', path='./public')

if __name__ == '__main__':
    web.run_app(app, host='0.0.0.0', port=PORT)
