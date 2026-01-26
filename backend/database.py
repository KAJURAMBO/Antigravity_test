from sqlmodel import SQLModel, create_engine, Session, select, text
from .config import settings
from sqlalchemy.exc import ProgrammingError

# SQLAlchemy requires 'postgresql://' instead of 'postgres://'
database_url = settings.APP_DATABASE_URL
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

# Only use check_same_thread for SQLite
connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}

engine = create_engine(database_url, connect_args=connect_args)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def reset_db_and_tables():
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)


def smart_initialize_db():
    """
    Attempts to initialize the database normally.
    If it detects missing columns (ProgrammingError), it performs a reset.
    """
    try:
        # First, ensure tables exist
        create_db_and_tables()

        # Test if the new columns (e.g., bio, assignee_id) exist
        with Session(engine) as session:
            # Check user.bio (previous change)
            session.exec(text('SELECT bio FROM "user" LIMIT 1'))
            # Check task.assignee_id (new change)
            session.exec(text("SELECT assignee_id FROM task LIMIT 1"))
            print("Database schema verified. (Smart Initialization)")

    except ProgrammingError as e:
        err = str(e).lower()
        if ("undefinedcolumn" in err or "does not exist" in err) and (
            "bio" in err or "assignee_id" in err or "team" in err
        ):
            print(f"Schema mismatch detected: {e}. Resetting database...")
            reset_db_and_tables()
        else:
            # Re-raise if it's a different programming error
            raise e
    except Exception as e:
        # Fallback for other issues (like table not existing at all yet)
        print(f"Initialization notice: {e}. Ensuring tables exist.")
        create_db_and_tables()


def get_session():
    with Session(engine) as session:
        yield session
