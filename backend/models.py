from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime


class UserBase(SQLModel):
    email: str = Field(index=True, unique=True)
    full_name: Optional[str] = None
    picture: Optional[str] = None
    google_id: str = Field(index=True, unique=True)
    bio: Optional[str] = None
    theme: Optional[str] = "dark"


class User(UserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.now)
    tasks: List["Task"] = Relationship(back_populates="user")


class TaskBase(SQLModel):
    title: str
    description: Optional[str] = None
    is_completed: bool = False


class Task(TaskBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = Field(default=None)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    user: Optional[User] = Relationship(back_populates="tasks")


class TaskCreate(TaskBase):
    pass


class TaskUpdate(SQLModel):
    title: Optional[str] = None
    description: Optional[str] = None
    is_completed: Optional[bool] = None


class UserUpdate(SQLModel):
    full_name: Optional[str] = None
    bio: Optional[str] = None
    picture: Optional[str] = None
    theme: Optional[str] = None


class UserRead(UserBase):
    id: int
