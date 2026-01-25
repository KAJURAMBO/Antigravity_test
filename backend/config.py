from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    PROJECT_NAME: str = "To-Do App"
    APP_DATABASE_URL: str = "sqlite:///database.db"

    # Google OAuth
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_CONF_URL: str = (
        "https://accounts.google.com/.well-known/openid-configuration"
    )

    # JWT
    SECRET_KEY: str = "supersecretkey"  # Change in production
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
