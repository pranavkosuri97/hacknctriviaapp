from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from backend.connection_manager import ConnectionManager
from backend.connection_manager import ConnectionType
from backend.game_manager import GameManager
from backend.lobby_manager import LobbyManager
app = FastAPI()

connection_manager = ConnectionManager()
game_manager = GameManager()
room_manager = LobbyManager()
@app.websocket("/lobby/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
     # Connect (accept and store)
    await connection_manager.connect(user_id, websocket)

    try:
        while True:
            # THIS is where you receive messages from client!
            data = await websocket.receive_json()
            # ↑ Blocks until client sends something
            
            # Handle different message types
            if data["type"] == "submit_answer":
                # User selected answer choice
                game = room_manager.get_game(game_id)
                await game.submit_answer(player_id, data["answer"])
            
            elif data["type"] == "chat_message":
                # Handle chat
                pass
    
    except WebSocketDisconnect:
        # Client disconnected - clean up
        await connection_manager.disconnect(user_id)

@app.websocket("/ws/game/{game_id}")
async def game_websocket(websocket: WebSocket, game_id: str, player_id: str):
    # Connect (accept and store)
    await connection_manager.connect(game_id, websocket, type=ConnectionType.GAME)
    
    try:
        while True:
            # THIS is where you receive messages from client!
            data = await websocket.receive_json()
            # ↑ Blocks until client sends something
            
            # Handle different message types
            if data["type"] == "submit_answer":
                # User selected answer choice
                await game_manager.get_game(game_id)

            
            elif data["type"] == "chat_message":
                # Handle chat
                pass
    
    except WebSocketDisconnect:
        # Client disconnected - clean up
        await connection_manager.disconnect(game_id)