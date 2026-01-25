from fastapi import FastAPI
from contextlib import asynccontextmanager
from .database import create_db_and_tables

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

app = FastAPI(lifespan=lifespan)

@app.get("/")
def read_root():
    return {"Hello": "World", "Service": "To-Do Backend"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
