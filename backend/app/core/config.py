from pydantic_settings import BaseSettings
from typing import List
import json


class Settings(BaseSettings):
    # App
    APP_NAME: str = "FacturaPro"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str

    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Empresa
    COMPANY_NAME: str = "Mi Empresa"
    COMPANY_NIT: str = "000000000-0"
    COMPANY_ADDRESS: str = ""
    COMPANY_PHONE: str = ""
    COMPANY_EMAIL: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
