"""Application configuration."""

from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""

    # API Configuration
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "ASD-AITuber API"
    
    # CORS
    ALLOWED_HOSTS: List[str] = ["http://localhost:3002", "http://localhost:3000"]
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Debug
    DEBUG: bool = True
    
    model_config = {"env_file": ".env"}


settings = Settings()