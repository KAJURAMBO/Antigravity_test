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
    Ensures tables and columns exist using SQLAlchemy inspector.
    If core columns or tables are missing, it triggers a reset.
    """
    from sqlalchemy import inspect

    try:
        # Ensure basics exist first
        create_db_and_tables()

        inspector = inspect(engine)
        tables = inspector.get_table_names()

        # Check for new tables
        if "team" not in tables or "teammember" not in tables:
            print("Missing collaboration tables. Resetting database...")
            reset_db_and_tables()
            return

        # Check for new columns in Task
        task_columns = [c["name"] for c in inspector.get_columns("task")]
        if "assignee_id" not in task_columns:
            print("Missing 'assignee_id' in task table. Resetting database...")
            reset_db_and_tables()
            return
            
        if "ai_guidance" not in task_columns:
            print("Missing 'ai_guidance' in task table. Adding it gracefully...")
            with Session(engine) as tmp_session:
                tmp_session.execute(text("ALTER TABLE task ADD COLUMN ai_guidance VARCHAR"))
                tmp_session.commit()

        if "ai_guidance_history" not in task_columns:
            print("Missing 'ai_guidance_history' in task table. Adding it gracefully...")
            with Session(engine) as tmp_session:
                tmp_session.execute(text("ALTER TABLE task ADD COLUMN ai_guidance_history TEXT"))
                tmp_session.commit()

        is_postgres = engine.url.drivername.startswith("postgresql")
        dt_type = "TIMESTAMP" if is_postgres else "DATETIME"
        bool_true = "TRUE" if is_postgres else "1"
        bool_false = "FALSE" if is_postgres else "0"

        if "due_date" not in task_columns:
            print("Missing 'due_date' in task table. Adding it gracefully...")
            with Session(engine) as tmp_session:
                tmp_session.execute(text(f"ALTER TABLE task ADD COLUMN due_date {dt_type}"))
                tmp_session.commit()

        # Check for new columns in User
        user_columns = [c["name"] for c in inspector.get_columns("user")]
        
        # Helper to add user columns
        user_new_cols = {
            "fcm_token": "VARCHAR",
            "notify_daily_digest": f"BOOLEAN DEFAULT {bool_true}",
            "notify_today_tasks": f"BOOLEAN DEFAULT {bool_true}",
            "notify_future_tasks": f"BOOLEAN DEFAULT {bool_false}"
        }
        
        for col, col_type in user_new_cols.items():
            if col not in user_columns:
                print(f"Missing '{col}' in user table. Adding it gracefully...")
                with Session(engine) as tmp_session:
                    tmp_session.execute(text(f"ALTER TABLE \"user\" ADD COLUMN {col} {col_type}"))
                    tmp_session.commit()

        if "bio" not in user_columns:
            print("Missing 'bio' in user table. Resetting database...")
            reset_db_and_tables()
            return

        print("Database schema successfully verified.")

    except Exception as e:
        print(f"Smart Initialization error: {e}")
        # Final fallback: just try to create what's missing
        create_db_and_tables()


def get_session():
    with Session(engine) as session:
        yield session
