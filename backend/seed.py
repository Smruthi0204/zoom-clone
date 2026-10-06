from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from database import SessionLocal
from models import Meeting, Participant, User


def seed_if_empty():
    db: Session = SessionLocal()
    try:
        has_users = db.query(User).first() is not None
        has_meetings = db.query(Meeting).first() is not None
        has_participants = db.query(Participant).first() is not None
        if has_users or has_meetings or has_participants:
            return

        host = User(id=1, name="Alex Morgan", email="alex.morgan@example.com")
        db.add(host)

        now = datetime.now(timezone.utc).replace(tzinfo=None)
        upcoming = [
            ("Product Planning", "Plan the next product release.", 1),
            ("Design Review", "Review the latest design updates.", 2),
            ("Engineering Sync", "Weekly engineering team sync.", 3),
            ("Project Check-in", "Discuss project progress and blockers.", 5),
        ]
        past = [
            ("Team Standup", "Daily team updates.", 1),
            ("Sprint Planning", "Plan tasks for the sprint.", 2),
            ("Customer Feedback", "Review recent customer feedback.", 3),
            ("Design Workshop", "Collaborative design workshop.", 4),
            ("Release Retrospective", "Discuss lessons from the release.", 7),
        ]

        for index, (title, description, days_ahead) in enumerate(upcoming, start=1):
            db.add(
                Meeting(
                    meeting_code=f"100000000{index}",
                    title=title,
                    description=description,
                    host_id=host.id,
                    start_time=now + timedelta(days=days_ahead),
                    duration_minutes=45,
                    is_instant=False,
                    status="scheduled",
                )
            )

        for index, (title, description, days_ago) in enumerate(past, start=1):
            meeting = Meeting(
                meeting_code=f"200000000{index}",
                title=title,
                description=description,
                host_id=host.id,
                start_time=now - timedelta(days=days_ago),
                duration_minutes=30,
                is_instant=False,
                status="ended",
            )
            db.add(meeting)
            db.flush()
            db.add_all(
                [
                    Participant(
                        meeting_id=meeting.id,
                        display_name=host.name,
                        role="host",
                        left_at=now,
                        last_seen_at=now,
                    ),
                    Participant(
                        meeting_id=meeting.id,
                        display_name="Jordan Lee",
                        role="participant",
                        left_at=now,
                        last_seen_at=now,
                    ),
                    Participant(
                        meeting_id=meeting.id,
                        display_name="Taylor Kim",
                        role="participant",
                        left_at=now,
                        last_seen_at=now,
                    ),
                ]
            )

        db.commit()
    finally:
        db.close()
