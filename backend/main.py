from datetime import datetime, timezone

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from database import Base, SessionLocal, engine
from models import Meeting, Message, Participant
from routes.meetings import router as meetings_router
from seed import seed_if_empty
from ws_manager import ConnectionManager

app = FastAPI(title="Zoom Clone API")
connection_manager = ConnectionManager()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(meetings_router)


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

    await connection_manager.connect(code, participant_id, websocket)
    try:
        while True:
            incoming = await websocket.receive_json()
            if not isinstance(incoming, dict) or incoming.get("type") != "chat":
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
        await connection_manager.disconnect(code, participant_id, websocket)
        participant.left_at = datetime.now(timezone.utc).replace(tzinfo=None)
        db.commit()
        db.close()
