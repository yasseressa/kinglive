from __future__ import annotations

from functools import lru_cache

from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Goal Stream API"
    app_env: str = "development"
    app_debug: bool = True
    api_v1_prefix: str = "/api/v1"

    secret_key: str = "change-me-to-a-long-random-secret"
    access_token_expire_minutes: int = 10

    log_level: str = "INFO"
    log_json: bool = False
    news_provider: str = "gnews"
    football_data_base_url: str = "https://apiv3.apifootball.com"
    football_data_api_key: str = ""
    football_data_timezone: str = "Asia/Riyadh"
    football_data_fixture_cache_path: str = ""
    gnews_base_url: str = "https://gnews.io/api/v4"
    gnews_api_key: str = ""
    gnews_max_results: int = 10
    cache_default_ttl_seconds: int = 300
    cache_redirect_config_ttl_seconds: int = 30
    redis_url: str = ""
    redis_key_prefix: str = "goal-stream"
    cache_stale_ttl_seconds: int = 7 * 24 * 60 * 60

    database_host: str = "localhost"
    database_port: int = 5432
    database_name: str = "goal_stream"
    database_user: str = "goal_stream"
    database_password: str = "goal_stream"
    database_url_override: str | None = Field(default=None, alias="DATABASE_URL")
    sync_database_url_override: str | None = Field(default=None, alias="SYNC_DATABASE_URL")
    cors_allow_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    admin_bootstrap_username: str | None = None
    admin_bootstrap_email: str | None = None
    admin_bootstrap_password: str | None = None

    def _normalize_database_url(self, url: str, driver: str) -> str:
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)

        if url.startswith("postgresql+"):
            base_url = url.split("://", 1)[1]
            return f"postgresql+{driver}://{base_url}"

        if url.startswith("postgresql://"):
            return url.replace("postgresql://", f"postgresql+{driver}://", 1)

        return url

    @computed_field
    @property
    def database_url(self) -> str:
        if self.database_url_override:
            return self._normalize_database_url(self.database_url_override, "asyncpg")

        return (
            f"postgresql+asyncpg://{self.database_user}:{self.database_password}"
            f"@{self.database_host}:{self.database_port}/{self.database_name}"
        )

    @computed_field
    @property
    def sync_database_url(self) -> str:
        if self.sync_database_url_override:
            return self._normalize_database_url(self.sync_database_url_override, "psycopg")

        if self.database_url_override:
            return self._normalize_database_url(self.database_url_override, "psycopg")

        return (
            f"postgresql+psycopg://{self.database_user}:{self.database_password}"
            f"@{self.database_host}:{self.database_port}/{self.database_name}"
        )

    @computed_field
    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_allow_origins.split(",") if origin.strip()]

    @computed_field
    @property
    def should_bootstrap_admin(self) -> bool:
        return bool(
            self.admin_bootstrap_username and self.admin_bootstrap_email and self.admin_bootstrap_password
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
