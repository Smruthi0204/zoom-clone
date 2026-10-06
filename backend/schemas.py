from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


def as_utc(value):
    if value is None:
        return value
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


class MeetingCreate(BaseModel):
    title: str = Field(min_length=1)
    description: str = ""
    start_time: datetime
    duration_minutes: int = Field(gt=0)

    @field_validator("title")
    @classmethod
    def clean_title(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("Title cannot be blank")
        return value

    @field_validator("start_time")
    @classmethod
    def normalize_start_time(cls, value):
        return as_utc(value)


class MeetingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    meeting_code: str
    title: str
    description: str
    host_id: int
    start_time: datetime
    duration_minutes: int
    is_instant: bool
    status: str
    created_at: datetime
    invite_link: str = ""

    @field_validator("start_time", "created_at", mode="before")
    @classmethod
    def normalize_times(cls, value):
        return as_utc(value)


class JoinMeetingRequest(BaseModel):
    display_name: str = Field(min_length=1)

    @field_validator("display_name")
    @classmethod
    def clean_display_name(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("Display name cannot be blank")
        return value


class ParticipantIdRequest(BaseModel):
    participant_id: int


class ParticipantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    meeting_id: int
    display_name: str
    role: str
    joined_at: datetime
    left_at: Optional[datetime]

    @field_validator("joined_at", "left_at", mode="before")
    @classmethod
    def normalize_times(cls, value):
        return as_utc(value)


class ChatMessageResponse(BaseModel):
    id: int
    participant_id: int
    sender_name: str
    text: str
    sent_at: datetime

    @field_validator("sent_at", mode="before")
    @classmethod
    def normalize_sent_at(cls, value):
        return as_utc(value)
