from __future__ import annotations

from app.core.config import Settings


def test_neon_database_url_uses_asyncpg_ssl_parameter() -> None:
    settings = Settings(
        _env_file=None,
        DATABASE_URL="postgresql://user:pass@example.neon.tech/neondb?sslmode=require&channel_binding=require",
    )

    assert settings.database_url == "postgresql+asyncpg://user:pass@example.neon.tech/neondb"
    assert settings.database_connect_args == {"ssl": True}


def test_sync_database_url_keeps_psycopg_sslmode_parameter() -> None:
    settings = Settings(
        _env_file=None,
        DATABASE_URL="postgresql://user:pass@example.neon.tech/neondb?sslmode=require&channel_binding=require",
    )

    assert (
        settings.sync_database_url
        == "postgresql+psycopg://user:pass@example.neon.tech/neondb?sslmode=require&channel_binding=require"
    )
