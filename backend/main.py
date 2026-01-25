from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlmodel import Session, select
from typing import List
from .database import reset_db_and_tables, get_session
from .models import Task, TaskCreate, TaskUpdate, User, UserRead
from .auth import create_access_token, get_current_user, verify_google_token
from pydantic import BaseModel


@asynccontextmanager
async def lifespan(app: FastAPI):
    reset_db_and_tables()
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
    else:
        # Update user info if changed
        user.full_name = name
        user.picture = picture
        session.add(user)
        session.commit()
        session.refresh(user)

    access_token = create_access_token(data={"sub": google_id})
    return {"access_token": access_token, "token_type": "bearer", "user": user}


@app.get("/users/me", response_model=UserRead)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user


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
