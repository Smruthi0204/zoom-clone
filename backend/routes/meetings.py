import os
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import Meeting, Participant, User
from schemas import (
    JoinMeetingRequest,
    LeaveMeetingRequest,
    MeetingCreate,
    MeetingResponse,
    ParticipantResponse,
)

router = APIRouter(prefix="/meetings", tags=["meetings"])
FRONTEND_URL = (os.getenv("FRONTEND_URL") or "http://localhost:3000").rstrip("/")


def utc_now():
    # SQLite stores UTC timestamps without timezone information.
    return datetime.now(timezone.utc).replace(tzinfo=None)


def make_meeting_code(db: Session) -> str:
    for _ in range(50):
        code = f"{secrets.randbelow(10_000_000_000):010d}"
        if not db.query(Meeting).filter(Meeting.meeting_code == code).first():
            return code
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Could not create a unique meeting code. Please try again.",
    )


def meeting_response(meeting: Meeting) -> MeetingResponse:
    response = MeetingResponse.model_validate(meeting)
    return response.model_copy(
        update={"invite_link": f"{FRONTEND_URL}/join/{meeting.meeting_code}"}
    )


def get_valid_meeting(code: str, db: Session) -> Meeting:
    meeting = db.query(Meeting).filter(Meeting.meeting_code == code).first()
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if meeting.status == "ended":
        raise HTTPException(status_code=400, detail="This meeting has ended")
    return meeting


@router.get("/upcoming", response_model=list[MeetingResponse])
def get_upcoming_meetings(db: Session = Depends(get_db)):
    now = utc_now()
    meetings = (
        db.query(Meeting)
        .filter(Meeting.start_time > now)
        .order_by(Meeting.start_time.asc())
        .all()
    )
    return [meeting_response(meeting) for meeting in meetings]


@router.get("/recent", response_model=list[MeetingResponse])
def get_recent_meetings(db: Session = Depends(get_db)):
    now = utc_now()
    meetings = (
        db.query(Meeting)
        .filter((Meeting.start_time < now) | (Meeting.status == "ended"))
        .order_by(Meeting.start_time.desc())
        .all()
    )
    return [meeting_response(meeting) for meeting in meetings]


@router.post("/instant", response_model=MeetingResponse, status_code=201)
def create_instant_meeting(db: Session = Depends(get_db)):
    host = db.get(User, 1)
    if host is None:
        raise HTTPException(status_code=500, detail="Default host user (id=1) is missing")

    meeting = Meeting(
        meeting_code=make_meeting_code(db),
        title="Instant Meeting",
        description="",
        host_id=host.id,
        start_time=utc_now(),
        duration_minutes=40,
        is_instant=True,
        status="live",
    )
    db.add(meeting)
    db.flush()
    db.add(
        Participant(
            meeting_id=meeting.id,
            display_name=host.name,
            role="host",
        )
    )
    db.commit()
    db.refresh(meeting)
    return meeting_response(meeting)


@router.post("/schedule", response_model=MeetingResponse, status_code=201)
def schedule_meeting(
    meeting_data: MeetingCreate,
    db: Session = Depends(get_db),
):
    host = db.get(User, 1)
    if host is None:
        raise HTTPException(status_code=500, detail="Default host user (id=1) is missing")

    meeting = Meeting(
        meeting_code=make_meeting_code(db),
        title=meeting_data.title,
        description=meeting_data.description,
        host_id=host.id,
        # Remove timezone info only after converting the value to UTC.
        start_time=meeting_data.start_time.astimezone(timezone.utc).replace(tzinfo=None),
        duration_minutes=meeting_data.duration_minutes,
        is_instant=False,
        status="scheduled",
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return meeting_response(meeting)


@router.get("/{code}", response_model=MeetingResponse)
def get_meeting(code: str, db: Session = Depends(get_db)):
    return meeting_response(get_valid_meeting(code, db))


@router.post(
    "/{code}/join",
    response_model=ParticipantResponse,
    status_code=201,
)
def join_meeting(
    code: str,
    request: JoinMeetingRequest,
    db: Session = Depends(get_db),
):
    meeting = get_valid_meeting(code, db)
    participant = Participant(
        meeting_id=meeting.id,
        display_name=request.display_name,
        role="participant",
    )
    db.add(participant)
    db.commit()
    db.refresh(participant)
    return participant


@router.post("/{code}/leave", response_model=ParticipantResponse)
def leave_meeting(
    code: str,
    request: LeaveMeetingRequest,
    db: Session = Depends(get_db),
):
    meeting = db.query(Meeting).filter(Meeting.meeting_code == code).first()
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")

    participant = (
        db.query(Participant)
        .filter(Participant.id == request.participant_id, Participant.meeting_id == meeting.id)
        .first()
    )
    if participant is None:
        raise HTTPException(status_code=404, detail="Participant not found")

    if participant.left_at is None:
        participant.left_at = utc_now()
        db.commit()
        db.refresh(participant)
    return participant


@router.get("/{code}/participants", response_model=list[ParticipantResponse])
def get_meeting_participants(code: str, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.meeting_code == code).first()
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return (
        db.query(Participant)
        .filter(Participant.meeting_id == meeting.id, Participant.left_at.is_(None))
        .order_by(Participant.joined_at.asc(), Participant.id.asc())
        .all()
    )
