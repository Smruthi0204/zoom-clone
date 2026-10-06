from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.connections: dict[str, list[tuple[int, WebSocket]]] = {}

    async def connect(self, meeting_code: str, participant_id: int, websocket: WebSocket):
        peers = list(dict.fromkeys(
            connected_id
            for connected_id, _ in self.connections.get(meeting_code, [])
            if connected_id != participant_id
        ))
        await websocket.accept()
        self.connections.setdefault(meeting_code, []).append((participant_id, websocket))
        return peers

    async def disconnect(self, meeting_code: str, participant_id: int, websocket: WebSocket):
        meeting_connections = self.connections.get(meeting_code, [])
        self.connections[meeting_code] = [
            connection for connection in meeting_connections
            if connection != (participant_id, websocket)
        ]
        if not self.connections[meeting_code]:
            self.connections.pop(meeting_code, None)

    async def broadcast(self, meeting_code: str, message: dict, exclude_id: int | None = None):
        for participant_id, websocket in list(self.connections.get(meeting_code, [])):
            if participant_id == exclude_id:
                continue
            try:
                await websocket.send_json(message)
            except Exception:
                # A disconnected tab should not block messages to the others.
                continue

    async def send_to(self, meeting_code: str, participant_id: int, message: dict):
        for connected_id, websocket in list(self.connections.get(meeting_code, [])):
            if connected_id == participant_id:
                try:
                    await websocket.send_json(message)
                except Exception:
                    continue

    async def close_participant(self, meeting_code: str, participant_id: int):
        for connected_id, websocket in list(self.connections.get(meeting_code, [])):
            if connected_id == participant_id:
                try:
                    await websocket.close(code=1008)
                except Exception:
                    continue
