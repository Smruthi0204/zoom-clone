from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.connections: dict[str, list[tuple[int, WebSocket]]] = {}

    async def connect(self, meeting_code: str, participant_id: int, websocket: WebSocket):
        await websocket.accept()
        self.connections.setdefault(meeting_code, []).append((participant_id, websocket))

    async def disconnect(self, meeting_code: str, participant_id: int, websocket: WebSocket):
        meeting_connections = self.connections.get(meeting_code, [])
        self.connections[meeting_code] = [
            connection for connection in meeting_connections
            if connection != (participant_id, websocket)
        ]
        if not self.connections[meeting_code]:
            self.connections.pop(meeting_code, None)

    async def broadcast(self, meeting_code: str, message: dict):
        for _, websocket in list(self.connections.get(meeting_code, [])):
            try:
                await websocket.send_json(message)
            except Exception:
                # A disconnected tab should not block messages to the others.
                continue
