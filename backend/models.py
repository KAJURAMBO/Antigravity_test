from sqlmodel import SQLModel, Field, Relationship, Column, JSON
from typing import Optional, List
from datetime import datetime, timezone
from pydantic import field_serializer


class UserBase(SQLModel):
    email: str = Field(index=True, unique=True)
    full_name: Optional[str] = None
    picture: Optional[str] = None
    google_id: str = Field(index=True, unique=True)
    bio: Optional[str] = None
    theme: Optional[str] = "dark"


class TeamMember(SQLModel, table=True):
    team_id: Optional[int] = Field(
        default=None, foreign_key="team.id", primary_key=True
    )
    user_id: Optional[int] = Field(
        default=None, foreign_key="user.id", primary_key=True
    )
    role: str = Field(default="member")  # owner, member


class Team(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    owner_id: int = Field(foreign_key="user.id")

    owner: "User" = Relationship(
        sa_relationship_kwargs={
            "primaryjoin": "Team.owner_id==User.id",
            "lazy": "joined",
        }
    )
    members: List["User"] = Relationship(back_populates="teams", link_model=TeamMember)


class User(UserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    tasks: List["Task"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"primaryjoin": "Task.user_id==User.id"},
    )
    assigned_tasks: List["Task"] = Relationship(
        back_populates="assignee",
        sa_relationship_kwargs={"primaryjoin": "Task.assignee_id==User.id"},
    )
    teams: List[Team] = Relationship(back_populates="members", link_model=TeamMember)

    @field_serializer("created_at")
    def serialize_dt(self, dt: datetime, _info):
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


class TaskBase(SQLModel):
    title: str
    description: Optional[str] = None
    is_completed: bool = False
    assignee_id: Optional[int] = None
    ai_guidance: Optional[str] = None
    ai_guidance_history: Optional[List[dict]] = Field(default=None, sa_column=Column(JSON))


class Task(TaskBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = Field(default=None)

    # The creator of the task
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    user: Optional[User] = Relationship(
        back_populates="tasks", sa_relationship_kwargs={"foreign_keys": "Task.user_id"}
    )

    # The person assigned to do the task
    assignee_id: Optional[int] = Field(default=None, foreign_key="user.id")
    assignee: Optional[User] = Relationship(
        back_populates="assigned_tasks",
        sa_relationship_kwargs={"foreign_keys": "Task.assignee_id"},
    )

    @field_serializer("created_at", "updated_at")
    def serialize_dt(self, dt: Optional[datetime], _info):
        if dt is None:
            return None
        if dt.tzinfo is None:
            # If the DB stored a naive datetime, assume it was UTC (which is how we store it)
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


class TaskCreate(TaskBase):
    created_at: Optional[datetime] = None


class TaskUpdate(SQLModel):
    title: Optional[str] = None
    description: Optional[str] = None
    is_completed: Optional[bool] = None
    created_at: Optional[datetime] = None
    assignee_id: Optional[int] = None
    ai_guidance: Optional[str] = None
    ai_guidance_history: Optional[List[dict]] = None


class UserUpdate(SQLModel):
    full_name: Optional[str] = None
    bio: Optional[str] = None
    picture: Optional[str] = None
    theme: Optional[str] = None


class UserRead(UserBase):
    id: int


class MemberRead(SQLModel):
    id: int
    email: str
    full_name: Optional[str] = None
    picture: Optional[str] = None
    role: str  # owner, member
    can_remove: bool


class TeamBase(SQLModel):
    name: str


class TeamCreate(TeamBase):
    pass


class TeamRead(TeamBase):
    id: int
    owner_id: int


class TeamInvite(SQLModel):
    email: str
