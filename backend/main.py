from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlmodel import Session, select
from typing import List
from .database import smart_initialize_db, get_session
from .models import (
    Task,
    TaskCreate,
    TaskUpdate,
    User,
    UserRead,
    UserUpdate,
    Team,
    TeamCreate,
    TeamRead,
    TeamInvite,
    TeamMember,
    MemberRead,
)
from .auth import create_access_token, get_current_user, verify_google_token
from pydantic import BaseModel
from fastapi import File, UploadFile
from fastapi.staticfiles import StaticFiles
import shutil
import os


# Ensure upload directory exists
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
UPLOAD_DIR = os.path.join(STATIC_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    smart_initialize_db()
    yield


app = FastAPI(
    title="To-Do API",
    description="A premium To-Do application backend",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust as needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


class GoogleAuthRequest(BaseModel):
    token: str


@app.get("/")
def read_root():
    return {"Hello": "World", "Service": "To-Do Backend"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/auth/google")
async def google_auth(
    request: GoogleAuthRequest, session: Session = Depends(get_session)
):
    user_info = await verify_google_token(request.token)
    if not user_info:
        raise HTTPException(status_code=400, detail="Invalid Google token")

    google_id = user_info.get("sub")
    email = user_info.get("email")
    name = user_info.get("name")
    picture = user_info.get("picture")

    # Check if user exists
    user = session.exec(select(User).where(User.google_id == google_id)).first()

    if not user:
        # Create new user
        user = User(google_id=google_id, email=email, full_name=name, picture=picture)
        session.add(user)
        session.commit()
        session.refresh(user)
    # No else - we don't want to overwrite custom user names and pictures with Google data every login

    access_token = create_access_token(data={"sub": google_id})
    return {"access_token": access_token, "token_type": "bearer", "user": user}


class DevAuthRequest(BaseModel):
    username: str


@app.post("/auth/dev")
async def dev_auth(request: DevAuthRequest, session: Session = Depends(get_session)):
    # This is ONLY for local development testing
    google_id = f"dev_user_{request.username.lower()}"
    email = f"{request.username.lower()}@dev.local"
    name = f"Test Profile: {request.username}"

    user = session.exec(select(User).where(User.google_id == google_id)).first()
    if not user:
        user = User(google_id=google_id, email=email, full_name=name)
        session.add(user)
        session.commit()
        session.refresh(user)

    access_token = create_access_token(data={"sub": google_id})
    return {"access_token": access_token, "token_type": "bearer", "user": user}


@app.get("/users/me", response_model=UserRead)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user


@app.patch("/users/me", response_model=UserRead)
async def update_user_me(
    user_update: UserUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    user_data = user_update.model_dump(exclude_unset=True)
    for key, value in user_data.items():
        setattr(current_user, key, value)
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return current_user


import cloudinary
import cloudinary.uploader
from .config import settings

# Configure Cloudinary
cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True,
)


@app.post("/users/me/picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    try:
        # Use Cloudinary if configured, else fall back to local
        if settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY:
            # Upload to Cloudinary
            result = cloudinary.uploader.upload(
                file.file,
                folder="profiles",
                public_id=f"user_{current_user.id}",
                overwrite=True,
            )
            picture_url = result.get("secure_url")
        else:
            # Local fallback (Temporary/Local testing)
            file_extension = os.path.splitext(file.filename)[1]
            file_name = f"user_{current_user.id}{file_extension}"
            file_path = os.path.join(UPLOAD_DIR, file_name)

            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            picture_url = f"/static/uploads/{file_name}"

        current_user.picture = picture_url
        session.add(current_user)
        session.commit()
        session.refresh(current_user)

        return {"picture_url": picture_url}
    except Exception as e:
        print(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload image")


@app.post("/teams/", response_model=TeamRead)
def create_team(
    team: TeamCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    db_team = Team.model_validate(team)
    db_team.owner_id = current_user.id
    session.add(db_team)
    session.commit()
    session.refresh(db_team)

    # Add owner as member
    member = TeamMember(team_id=db_team.id, user_id=current_user.id, role="owner")
    session.add(member)
    session.commit()

    return db_team


@app.post("/teams/invite")
def invite_member(
    invite: TeamInvite,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    # Check if inviter has a team
    team_link = session.exec(
        select(TeamMember).where(
            TeamMember.user_id == current_user.id, TeamMember.role == "owner"
        )
    ).first()
    if not team_link:
        # Create a default team for the user if they don't have one
        team = Team(name=f"{current_user.full_name}'s Team", owner_id=current_user.id)
        session.add(team)
        session.commit()
        session.refresh(team)
        team_id = team.id
        session.add(TeamMember(team_id=team_id, user_id=current_user.id, role="owner"))
        session.commit()
    else:
        team_id = team_link.team_id

    # Find invitee
    invitee = session.exec(select(User).where(User.email == invite.email)).first()
    if not invitee:
        raise HTTPException(status_code=404, detail="User not found with that email")

    # Check if already member
    exists = session.exec(
        select(TeamMember).where(
            TeamMember.team_id == team_id, TeamMember.user_id == invitee.id
        )
    ).first()
    if exists:
        raise HTTPException(status_code=400, detail="User already in team")

    # Add member - implicitly adding to the owner's team
    new_member = TeamMember(team_id=team_id, user_id=invitee.id, role="member")
    session.add(new_member)
    session.commit()

    return {"status": "invited", "user": invitee.full_name}


@app.get("/teams/members", response_model=List[MemberRead])
def read_members(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    # 1. Identify team owned by current_user (for 'can_remove' logic)
    owned_team = session.exec(
        select(TeamMember.team_id).where(
            TeamMember.user_id == current_user.id, TeamMember.role == "owner"
        )
    ).first()

    # 2. Get all teams I am part of
    my_teams = session.exec(
        select(TeamMember.team_id).where(TeamMember.user_id == current_user.id)
    ).all()

    if not my_teams:
        return []

    # 3. Get all relations where team_id is in any of my teams
    # This ensures we get the role per-team
    relations = session.exec(
        select(TeamMember, User)
        .join(User, TeamMember.user_id == User.id)
        .where(TeamMember.team_id.in_(my_teams))
    ).all()

    # 4. Consolidate into unique users with specific roles
    # Priority: If they are in MY team, role is 'member' (since I am owner)
    # If I am in THEIR team, their role in that team is 'owner'
    member_map = {}
    for rel, user in relations:
        if user.id not in member_map:
            # Default values
            role = "member"
            can_remove = False

            # If this is ME, and I own a team, I am the OWNER of my squad view
            if user.id == current_user.id and owned_team:
                role = "owner"

            # If this user is in the team I OWN, I can remove them
            if owned_team and rel.team_id == owned_team and user.id != current_user.id:
                can_remove = True

            # If I am in a team WHERE THEY ARE OWNER, they should show as OWNER
            if rel.role == "owner" and rel.user_id != current_user.id:
                role = "owner"

            member_map[user.id] = MemberRead(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                picture=user.picture,
                role=role,
                can_remove=can_remove,
            )

    return list(member_map.values())


@app.delete("/teams/members/{user_id}")
def remove_member(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    # Check if inviter has a team where they are owner
    team_link = session.exec(
        select(TeamMember).where(
            TeamMember.user_id == current_user.id, TeamMember.role == "owner"
        )
    ).first()

    if not team_link:
        raise HTTPException(status_code=403, detail="You do not own a team")

    # Person cannot remove themselves (they are owner)
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot remove yourself")

    # Find the member link
    member_link = session.exec(
        select(TeamMember).where(
            TeamMember.team_id == team_link.team_id, TeamMember.user_id == user_id
        )
    ).first()

    if not member_link:
        raise HTTPException(status_code=404, detail="Member not found in your team")

    session.delete(member_link)
    session.commit()
    return {"status": "removed"}


# CRUD Endpoints (Protected)
@app.post("/tasks/", response_model=Task, status_code=201)
def create_task(
    task: TaskCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    db_task = Task(**task.model_dump(exclude_unset=True))
    db_task.user_id = current_user.id

    # If no assignee, assign to self
    if not db_task.assignee_id:
        db_task.assignee_id = current_user.id

    session.add(db_task)
    session.commit()
    session.refresh(db_task)
    return db_task


@app.get("/tasks/", response_model=List[Task])
def read_tasks(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    from sqlmodel import or_

    tasks = session.exec(
        select(Task).where(
            or_(Task.assignee_id == current_user.id, Task.user_id == current_user.id)
        )
    ).all()
    return tasks


@app.get("/tasks/{task_id}", response_model=Task)
def read_task(
    task_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    task = session.get(Task, task_id)
    if not task or (
        task.user_id != current_user.id and task.assignee_id != current_user.id
    ):
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@app.patch("/tasks/{task_id}", response_model=Task)
def update_task(
    task_id: int,
    task_update: TaskUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    task = session.get(Task, task_id)
    if not task or (
        task.user_id != current_user.id and task.assignee_id != current_user.id
    ):
        raise HTTPException(status_code=404, detail="Task not found")

    task_data = task_update.model_dump(exclude_unset=True)
    for key, value in task_data.items():
        setattr(task, key, value)

    session.add(task)
    session.commit()
    session.refresh(task)
    return task


@app.delete("/tasks/{task_id}", status_code=204)
def delete_task(
    task_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    task = session.get(Task, task_id)
    if not task or (
        task.user_id != current_user.id and task.assignee_id != current_user.id
    ):
        raise HTTPException(status_code=404, detail="Task not found")

    session.delete(task)
    session.commit()
    return None


# === AI-Powered Endpoints ===

from .ai_service import parse_task_from_text, get_task_guidance, refine_task_guidance


class AIParseRequest(BaseModel):
    message: str
    conversation_history: list = []  # For multi-turn clarification


class AIRefineRequest(BaseModel):
    previous_guidance: str
    user_feedback: str


@app.post("/ai/parse-task")
async def ai_parse_task(
    request: AIParseRequest,
    current_user: User = Depends(get_current_user),
):
    """Parse natural language into structured task data using Gemini AI."""
    try:
        result = await parse_task_from_text(
            user_message=request.message,
            conversation_history=request.conversation_history or None,
        )
        return result
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        print(f"AI Parse Error: {e}")
        raise HTTPException(status_code=500, detail="AI service temporarily unavailable")


@app.get("/ai/task-guidance/{task_id}")
async def ai_task_guidance(
    task_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get AI-generated step-by-step guidance for completing a task. Return cached if exists."""
    task = session.get(Task, task_id)
    if not task or (
        task.user_id != current_user.id and task.assignee_id != current_user.id
    ):
        raise HTTPException(status_code=404, detail="Task not found")

    if task.ai_guidance:
        return {"task_id": task_id, "guidance": task.ai_guidance}

    try:
        guidance = await get_task_guidance(
            task_title=task.title,
            task_description=task.description,
        )
        task.ai_guidance = guidance
        session.add(task)
        session.commit()
        return {"task_id": task_id, "guidance": guidance}
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        print(f"AI Guidance Error: {e}")
        raise HTTPException(status_code=500, detail="AI service temporarily unavailable")


@app.post("/ai/task-guidance/{task_id}/refine")
async def ai_refine_guidance(
    task_id: int,
    request: AIRefineRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Refine previously generated task guidance based on user feedback."""
    task = session.get(Task, task_id)
    if not task or (
        task.user_id != current_user.id and task.assignee_id != current_user.id
    ):
        raise HTTPException(status_code=404, detail="Task not found")

    try:
        refined = await refine_task_guidance(
            task_title=task.title,
            task_description=task.description,
            previous_guidance=request.previous_guidance,
            user_feedback=request.user_feedback,
        )
        task.ai_guidance = refined
        session.add(task)
        session.commit()
        return {"task_id": task_id, "guidance": refined}
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        print(f"AI Refine Error: {e}")
        raise HTTPException(status_code=500, detail="AI service temporarily unavailable")

