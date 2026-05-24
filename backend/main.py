from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlmodel import Session, select, or_
from typing import List, Optional
from datetime import datetime, timezone
from .database import smart_initialize_db, get_session, engine
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
from .notifications import notify_task_assigned, notify_daily_digest


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
    return {"Hello": "World", "Service": "AI-Smart Todo Backend"}


@app.get("/health")
def health_check(session: Session = Depends(get_session)):
    """Health check endpoint that also verifies database connectivity."""
    try:
        # Check database connectivity
        from sqlmodel import text
        session.exec(text("SELECT 1")).first()
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        print(f"Health Check Failure: {e}")
        return {"status": "error", "database": "disconnected", "detail": str(e)}, 500


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

    # Notify assignee if it's not the creator
    if db_task.assignee_id and db_task.assignee_id != current_user.id:
        assignee = session.get(User, db_task.assignee_id)
        print(f"DEBUG: Task assigned to {assignee.id if assignee else 'None'}. FCM Token: {assignee.fcm_token if assignee else 'None'}")
        if assignee and assignee.fcm_token:
            print(f"DEBUG: Sending notification to token: {assignee.fcm_token[:10]}...")
            notify_task_assigned(
                assignee_fcm_token=assignee.fcm_token,
                assigner_name=current_user.full_name or "Someone",
                task_title=db_task.title,
                task_id=db_task.id,
                due_date=db_task.due_date
            )
        else:
            print("DEBUG: Notification NOT sent because assignee or fcm_token is missing.")

    return db_task


@app.get("/tasks/", response_model=List[Task])
def read_tasks(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
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

    # Check if assignee changed to notify the new one
    old_assignee_id = task.assignee_id
    
    task_data = task_update.model_dump(exclude_unset=True)
    for key, value in task_data.items():
        setattr(task, key, value)

    session.add(task)
    session.commit()
    session.refresh(task)

    # If assignee changed and it's not the person who made the change
    if task.assignee_id != old_assignee_id and task.assignee_id != current_user.id:
        assignee = session.get(User, task.assignee_id)
        if assignee and assignee.fcm_token:
            print(f"DEBUG: Notifying new assignee after update: {assignee.id}")
            notify_task_assigned(
                assignee_fcm_token=assignee.fcm_token,
                assigner_name=current_user.full_name or "Someone",
                task_title=task.title,
                task_id=task.id,
                due_date=task.due_date
            )
    
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


@app.post("/tasks/bulk-delete", status_code=204)
def bulk_delete_tasks(
    task_ids: List[int],
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete multiple tasks at once. Ensures user has permission for all."""
    # Fetch all requested tasks that belong to the user (or are assigned to them)
    statement = select(Task).where(
        Task.id.in_(task_ids),
        or_(Task.user_id == current_user.id, Task.assignee_id == current_user.id)
    )
    tasks = session.exec(statement).all()
    
    for task in tasks:
        session.delete(task)
    
    session.commit()
    return None


class BulkUpdatePayload(BaseModel):
    task_ids: List[int]
    is_completed: bool

@app.post("/tasks/bulk-update", response_model=List[Task])
def bulk_update_tasks(
    payload: BulkUpdatePayload,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update multiple tasks status at once. Ensures user has permission for all."""
    statement = select(Task).where(
        Task.id.in_(payload.task_ids),
        or_(Task.user_id == current_user.id, Task.assignee_id == current_user.id)
    )
    tasks = session.exec(statement).all()
    
    for task in tasks:
        task.is_completed = payload.is_completed
        session.add(task)
        
    session.commit()
    for task in tasks:
        session.refresh(task)
        
    return tasks


# === AI-Powered Endpoints ===

from .ai_service import parse_task_from_text, get_task_guidance, refine_task_guidance, get_task_guidance_stream, refine_task_guidance_stream


class AIParseRequest(BaseModel):
    message: str
    conversation_history: list = []  # For multi-turn clarification
    local_time: Optional[str] = None # ISO 8601 local time for reference


class AIRefineRequest(BaseModel):
    user_feedback: str


@app.post("/ai/parse-task")
async def ai_parse_task(
    request: AIParseRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Parse natural language into structured task data with team context."""
    try:
        # Fetch team members for context
        my_teams = session.exec(
            select(TeamMember.team_id).where(TeamMember.user_id == current_user.id)
        ).all()
        
        team_members = []
        if my_teams:
            relations = session.exec(
                select(User)
                .join(TeamMember, TeamMember.user_id == User.id)
                .where(TeamMember.team_id.in_(my_teams))
            ).all()
            
            # De-duplicate users and format for AI
            seen_ids = set()
            for user in relations:
                if user.id not in seen_ids:
                    team_members.append({"id": user.id, "name": user.full_name or user.email})
                    seen_ids.add(user.id)

        result = await parse_task_from_text(
            user_message=request.message,
            conversation_history=request.conversation_history or None,
            team_members=team_members,
            local_time=request.local_time
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
    stream: bool = False,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get AI-generated step-by-step guidance for completing a task. Return cached if exists or stream."""
    task = session.get(Task, task_id)
    if not task or (
        task.user_id != current_user.id and task.assignee_id != current_user.id
    ):
        raise HTTPException(status_code=404, detail="Task not found")

    if stream:
        if task.ai_guidance:
            async def cached_generator():
                import json
                yield f"data: {json.dumps({'chunk': task.ai_guidance})}\n\n"
            return StreamingResponse(
                cached_generator(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache, no-transform",
                    "Connection": "keep-alive",
                    "X-Accel-Buffering": "no",
                }
            )

        async def stream_generator():
            import json
            accumulated = []
            try:
                async for chunk in get_task_guidance_stream(
                    task_title=task.title,
                    task_description=task.description,
                ):
                    accumulated.append(chunk)
                    yield f"data: {json.dumps({'chunk': chunk})}\n\n"
                
                # Save to database once completed successfully
                full_guidance = "".join(accumulated).strip()
                if full_guidance:
                    with Session(engine) as db_session:
                        db_task = db_session.get(Task, task_id)
                        if db_task:
                            db_task.ai_guidance = full_guidance
                            db_session.add(db_task)
                            db_session.commit()
            except Exception as exc:
                yield f"data: {json.dumps({'error': str(exc)})}\n\n"

        return StreamingResponse(
            stream_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache, no-transform",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            }
        )

    # Non-streaming fallback
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
    stream: bool = False,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Refine previously generated task guidance based on user feedback."""
    task = session.get(Task, task_id)
    if not task or (
        task.user_id != current_user.id and task.assignee_id != current_user.id
    ):
        raise HTTPException(status_code=404, detail="Task not found")

    if not task.ai_guidance:
        raise HTTPException(status_code=400, detail="No existing guidance to refine")

    # Initialize/Manage History from DB
    raw_history = task.ai_guidance_history
    if isinstance(raw_history, str):
        try:
            import json as _json
            raw_history = _json.loads(raw_history)
        except Exception:
            raw_history = []
    history = list(raw_history) if raw_history else []

    if stream:
        async def stream_generator():
            import json
            accumulated = []
            try:
                async for chunk in refine_task_guidance_stream(
                    task_title=task.title,
                    task_description=task.description,
                    previous_guidance=task.ai_guidance,
                    user_feedback=request.user_feedback,
                    conversation_history=history,
                ):
                    accumulated.append(chunk)
                    yield f"data: {json.dumps({'chunk': chunk})}\n\n"
                
                full_guidance = "".join(accumulated).strip()
                if full_guidance:
                    # Update history
                    updated_history = list(history)
                    updated_history.append({"role": "user", "text": request.user_feedback})
                    updated_history.append({"role": "model", "text": full_guidance})
                    
                    with Session(engine) as db_session:
                        db_task = db_session.get(Task, task_id)
                        if db_task:
                            db_task.ai_guidance = full_guidance
                            db_task.ai_guidance_history = updated_history
                            db_session.add(db_task)
                            db_session.commit()
            except Exception as exc:
                yield f"data: {json.dumps({'error': str(exc)})}\n\n"

        return StreamingResponse(
            stream_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache, no-transform",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            }
        )

    # Non-streaming fallback
    try:
        refined = await refine_task_guidance(
            task_title=task.title,
            task_description=task.description,
            previous_guidance=task.ai_guidance,
            user_feedback=request.user_feedback,
            conversation_history=history,
        )
        
        # Update history with this turn
        history.append({"role": "user", "text": request.user_feedback})
        history.append({"role": "model", "text": refined})
        
        task.ai_guidance = refined
        task.ai_guidance_history = history
        
        session.add(task)
        session.commit()
        return {"task_id": task_id, "guidance": refined}
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        import traceback
        print(f"AI Refine Error: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail="AI service temporarily unavailable")

# === Notification Digest Endpoint ===

@app.post("/notifications/send-digests")
async def send_all_digests(session: Session = Depends(get_session)):
    """
    Endpoint intended to be called by a CRON job (e.g., 4 times a day).
    It sends task summaries to all users who have notifications enabled.
    """
    users = session.exec(select(User).where(User.fcm_token != None, User.notify_daily_digest == True)).all()
    
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start.replace(hour=23, minute=59, second=59)
    
    sent_count = 0
    for user in users:
        all_tasks = session.exec(
            select(Task).where(Task.assignee_id == user.id)
        ).all()
        
        today_tasks = []
        backlog_tasks = []
        future_tasks = []
        done_tasks = []
        
        for t in all_tasks:
            if t.is_completed:
                done_tasks.append(t)
            else:
                if t.due_date:
                    t_due = t.due_date
                    if t_due.tzinfo is None:
                        t_due = t_due.replace(tzinfo=timezone.utc)
                        
                    if t_due < today_start:
                        backlog_tasks.append(t)
                    elif t_due > today_end:
                        future_tasks.append(t)
                    else:
                        today_tasks.append(t)
                else:
                    t_created = t.created_at
                    if t_created.tzinfo is None:
                        t_created = t_created.replace(tzinfo=timezone.utc)
                        
                    if t_created < today_start:
                        backlog_tasks.append(t)
                    elif t_created > today_end:
                        future_tasks.append(t)
                    else:
                        today_tasks.append(t)
                        
        active_tasks = None
        if user.notify_today_tasks:
            active_tasks = [t.title for t in today_tasks]
            
        if user.notify_future_tasks:
            if active_tasks is None: active_tasks = []
            active_tasks.extend([f"[Future] {t.title}" for t in future_tasks])
            
        try:
            notify_daily_digest(
                fcm_token=user.fcm_token,
                today_count=len(today_tasks) if user.notify_today_tasks else None,
                backlog_count=len(backlog_tasks),
                future_count=len(future_tasks) if user.notify_future_tasks else None,
                done_count=len(done_tasks),
                active_tasks=active_tasks
            )
        except Exception as e:
            if "Requested entity was not found" in str(e) or "Unregistered" in str(e):
                user.fcm_token = None
                session.add(user)
                session.commit()
        sent_count += 1
        
    return {"status": "success", "digests_sent": sent_count}

