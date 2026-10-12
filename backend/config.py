from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    adaption_api_key: str = ""
    app_env: str = "development"
    max_analysis_rows: int = 80
    port: int = 8000
    app_version: str = "0.1.0"
    database_url: str = ""
    supabase_url: str = ""
    supabase_jwt_issuer: str = ""
    supabase_jwt_audience: str = "authenticated"

    @property
    def gemini_configured(self) -> bool:
        return bool(self.gemini_api_key.strip())

    @property
    def adaption_configured(self) -> bool:
        return bool(self.adaption_api_key.strip())

    @property
    def supabase_configured(self) -> bool:
        return bool(self.supabase_url.strip())

    @property
    def persistent_database_configured(self) -> bool:
        return bool(self.database_url.strip())


@lru_cache
def get_settings() -> Settings:
    return Settings()
