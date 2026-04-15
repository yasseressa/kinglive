from __future__ import annotations

import logging

import sqlalchemy as sa

from app.db.base import Base
from app.db.session import engine
from app.models import admin_user, redirect_campaign, redirect_setting, stream_link  # noqa: F401

logger = logging.getLogger(__name__)

REDIRECT_SETTINGS_LEGACY_COLUMNS: dict[str, str] = {
    "open_in_new_tab": "BOOLEAN NOT NULL DEFAULT false",
    "facebook_url": "VARCHAR(2048)",
    "youtube_url": "VARCHAR(2048)",
    "instagram_url": "VARCHAR(2048)",
    "telegram_url": "VARCHAR(2048)",
    "whatsapp_url": "VARCHAR(2048)",
}


async def ensure_database_schema() -> None:
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
        await connection.run_sync(_ensure_legacy_redirect_settings_columns)

    logger.info("database_schema_verified")


def _ensure_legacy_redirect_settings_columns(connection) -> None:
    inspector = sa.inspect(connection)
    if not inspector.has_table("redirect_settings"):
        return

    existing_columns = {
        column["name"]
        for column in inspector.get_columns("redirect_settings")
    }
    added_columns: list[str] = []

    for column_name, column_definition in REDIRECT_SETTINGS_LEGACY_COLUMNS.items():
        if column_name in existing_columns:
            continue
        connection.execute(
            sa.text(
                f"ALTER TABLE redirect_settings ADD COLUMN {column_name} {column_definition}"
            )
        )
        added_columns.append(column_name)

    if added_columns:
        logger.warning(
            "redirect_settings_schema_reconciled",
            extra={"added_columns": added_columns},
        )
