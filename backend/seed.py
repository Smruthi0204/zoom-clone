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
        # Keep the example schedule at recognizable UTC clock times.
        def at_time(day_offset, hour, minute):
            return now.replace(hour=hour, minute=minute, second=0, microsecond=0) + timedelta(days=day_offset)

        upcoming = [
            ("Weekly Team Sync", "Share team updates and discuss current priorities.", 1, 10, 0, 30),
            ("Design Review", "Review the latest product designs and feedback.", 2, 14, 30, 45),
            ("Client Onboarding", "Welcome the client and review onboarding steps.", 3, 16, 0, 60),
            ("Sprint Planning", "Plan work and priorities for the next sprint.", 4, 11, 0, 45),
            ("Product Roadmap", "Review upcoming milestones and roadmap priorities.", 5, 14, 30, 60),
        ]
        past = [
            ("1:1 with Manager", "Discuss goals, progress, and next steps.", -1, 10, 0, 30),
            ("Client Onboarding", "Review the client's setup and first milestones.", -2, 14, 30, 45),
            ("Weekly Team Sync", "Share team updates and discuss current priorities.", -3, 16, 0, 30),
            ("Design Review", "Review design changes and agree on follow-up work.", -5, 11, 0, 60),
            ("Sprint Planning", "Estimate work and set sprint priorities.", -7, 14, 30, 45),
        ]

        for index, (title, description, day_offset, hour, minute, duration) in enumerate(upcoming, start=1):
            db.add(
                Meeting(
                    meeting_code=f"100000000{index}",
                    title=title,
                    description=description,
                    host_id=host.id,
                    start_time=at_time(day_offset, hour, minute),
                    duration_minutes=duration,
                    is_instant=False,
                    status="scheduled",
                )
            )

        for index, (title, description, day_offset, hour, minute, duration) in enumerate(past, start=1):
            start_time = at_time(day_offset, hour, minute)
            ended_at = start_time + timedelta(minutes=duration)
            meeting = Meeting(
                meeting_code=f"200000000{index}",
                title=title,
                description=description,
                host_id=host.id,
                start_time=start_time,
                duration_minutes=duration,
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
                        left_at=ended_at,
                        last_seen_at=ended_at,
                    ),
                    Participant(
                        meeting_id=meeting.id,
                        display_name="Jordan Lee",
                        role="participant",
                        left_at=ended_at,
                        last_seen_at=ended_at,
                    ),
                    Participant(
                        meeting_id=meeting.id,
                        display_name="Taylor Kim",
                        role="participant",
                        left_at=ended_at,
                        last_seen_at=ended_at,
                    ),
                ]
            )

        db.commit()
    finally:
        db.close()
