from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)

    meetings = relationship("Meeting", back_populates="host")


class Meeting(Base):
    __tablename__ = "meetings"
    __table_args__ = (
        CheckConstraint(
            "status IN ('scheduled', 'live', 'ended')",
            name="check_meeting_status",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    meeting_code = Column(String(10), unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False, default="")
    host_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    start_time = Column(DateTime(timezone=True), index=True, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    is_instant = Column(Boolean, nullable=False, default=False)
    status = Column(String, nullable=False, default="scheduled")
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    host = relationship("User", back_populates="meetings")
    participants = relationship(
        "Participant",
        back_populates="meeting",
        cascade="all, delete-orphan",
    )
    messages = relationship("Message", back_populates="meeting", cascade="all, delete-orphan")


class Participant(Base):
    __tablename__ = "participants"
    __table_args__ = (
        CheckConstraint(
            "role IN ('host', 'participant')",
            name="check_participant_role",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False)
    display_name = Column(String, nullable=False)
    role = Column(String, nullable=False, default="participant")
    joined_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    last_seen_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    left_at = Column(DateTime(timezone=True), nullable=True)

    meeting = relationship("Meeting", back_populates="participants")
    messages = relationship("Message", back_populates="participant", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False)
    participant_id = Column(Integer, ForeignKey("participants.id"), nullable=False)
    text = Column(Text, nullable=False)
    sent_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    meeting = relationship("Meeting", back_populates="messages")
    participant = relationship("Participant", back_populates="messages")
