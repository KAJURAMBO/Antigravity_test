from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlmodel import Session, select
from typing import List
from .database import smart_initialize_db, get_session
from .models import Task, TaskCreate, TaskUpdate, User, UserRead, UserUpdate
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


# CRUD Endpoints (Protected)
@app.post("/tasks/", response_model=Task, status_code=201)
def create_task(
    task: TaskCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    db_task = Task.model_validate(task)
    db_task.user_id = current_user.id
    session.add(db_task)
    session.commit()
    session.refresh(db_task)
    return db_task


@app.get("/tasks/", response_model=List[Task])
def read_tasks(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    tasks = session.exec(select(Task).where(Task.user_id == current_user.id)).all()
    return tasks


@app.get("/tasks/{task_id}", response_model=Task)
def read_task(
    task_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    task = session.get(Task, task_id)
    if not task or task.user_id != current_user.id:
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
    if not task or task.user_id != current_user.id:
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
    if not task or task.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Task not found")

    session.delete(task)
    session.commit()
    return None
