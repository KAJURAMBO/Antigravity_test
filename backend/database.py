from sqlmodel import SQLModel, create_engine, Session
from .config import settings

# SQLAlchemy requires 'postgresql://' instead of 'postgres://'
database_url = settings.APP_DATABASE_URL
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

# Only use check_same_thread for SQLite
connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}

engine = create_engine(database_url, connect_args=connect_args)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
