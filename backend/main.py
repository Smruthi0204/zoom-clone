from datetime import datetime, timezone
import os

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from database import Base, SessionLocal, engine
from models import Meeting, Message, Participant
from routes.meetings import router as meetings_router
from seed import seed_if_empty
from ws_manager import ConnectionManager

app = FastAPI(title="Zoom Clone API")
connection_manager = ConnectionManager()
frontend_url = (os.getenv("FRONTEND_URL") or "http://localhost:3000").rstrip("/")
allowed_origins = {frontend_url, "http://localhost:3000"}
allowed_origins.update(
    origin.strip().rstrip("/")
    for origin in os.getenv("ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(allowed_origins),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(meetings_router)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    seed_if_empty()


@app.websocket("/ws/meetings/{code}")
async def meeting_chat(websocket: WebSocket, code: str, participant_id: int):
    db = SessionLocal()
    meeting = db.query(Meeting).filter(Meeting.meeting_code == code).first()
    if meeting is None:
        db.close()
        await websocket.close(code=1008)
        return

    participant = db.query(Participant).filter(
        Participant.id == participant_id,
        Participant.meeting_id == meeting.id,
        Participant.left_at.is_(None),
    ).first()

    if participant is None:
        db.close()
        await websocket.close(code=1008)
        return

    connected = False
    try:
        peers = await connection_manager.connect(code, participant_id, websocket)
        connected = True
        await websocket.send_json({"type": "peers", "peers": peers})
        await connection_manager.broadcast(
            code,
            {"type": "peer-joined", "participant_id": participant_id},
            exclude_id=participant_id,
        )
        while True:
            incoming = await websocket.receive_json()
            if not isinstance(incoming, dict):
                continue

            message_type = incoming.get("type")
            if message_type == "mute-all":
                if participant.role == "host":
                    await connection_manager.broadcast(code, {"type": "mute-all"}, exclude_id=participant.id)
                continue

            if message_type == "remove":
                target_id = incoming.get("target_id")
                if participant.role != "host" or not isinstance(target_id, int) or target_id == participant.id:
                    continue
                target = db.query(Participant).filter(
                    Participant.id == target_id,
                    Participant.meeting_id == meeting.id,
                    Participant.left_at.is_(None),
                ).first()
                if target is None:
                    continue
                await connection_manager.send_to(code, target_id, {"type": "removed"})
                target.left_at = datetime.now(timezone.utc).replace(tzinfo=None)
                db.commit()
                await connection_manager.close_participant(code, target_id)
                # The closed socket broadcasts peer-left from its disconnect handler.
                continue

            if message_type in {"offer", "answer", "ice-candidate"}:
                target_id = incoming.get("target_id")
                if isinstance(target_id, int):
                    await connection_manager.send_to(code, target_id, {
                        "type": message_type,
                        "from_id": participant.id,
                        "payload": incoming.get("payload"),
                    })
                continue

            if message_type != "chat":
                continue
            text = incoming.get("text")
            if not isinstance(text, str) or not text.strip():
                continue

            sent_at = datetime.now(timezone.utc)
            message = Message(
                meeting_id=meeting.id,
                participant_id=participant.id,
                text=text.strip(),
                sent_at=sent_at,
            )
            db.add(message)
            db.commit()
            db.refresh(message)
            await connection_manager.broadcast(code, {
                "type": "chat",
                "id": message.id,
                "participant_id": participant.id,
                "sender_name": participant.display_name,
                "text": message.text,
                "sent_at": sent_at.isoformat(),
            })
    except WebSocketDisconnect:
        pass
    finally:
        if connected:
            await connection_manager.disconnect(code, participant_id, websocket)
            await connection_manager.broadcast(
                code,
                {"type": "peer-left", "participant_id": participant_id},
                exclude_id=participant_id,
            )
            participant.left_at = datetime.now(timezone.utc).replace(tzinfo=None)
            db.commit()
        db.close()
