import os
from sqlmodel import SQLModel, create_engine, Session

# Use DATABASE_URL from environment variables for Aiven/PostgreSQL
# Fallback to local SQLite for development
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///database.db")

# SQLAlchemy requires 'postgresql://' instead of 'postgres://'
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Only use check_same_thread for SQLite
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
