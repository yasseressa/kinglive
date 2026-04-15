from __future__ import annotations

import logging

from sqlalchemy import select

from app.core.config import settings
from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models.admin_user import AdminUser

logger = logging.getLogger(__name__)


async def ensure_bootstrap_admin() -> None:
    if not settings.should_bootstrap_admin:
        return

    username = _normalize_value(settings.admin_bootstrap_username)
    email = _normalize_email(settings.admin_bootstrap_email)
    password = _normalize_value(settings.admin_bootstrap_password)

    if not username or not email or not password:
        logger.warning("bootstrap_admin_skipped_invalid_values")
        return

    async with SessionLocal() as session:
        existing_result = await session.execute(
            select(AdminUser).where(
                (AdminUser.username == username)
                | (AdminUser.email == email)
            )
        )
        existing = existing_result.scalar_one_or_none()

        if existing is not None:
            existing.username = username
            existing.email = email
            existing.password_hash = get_password_hash(password)
            existing.is_active = True
            existing.is_superuser = True
            await session.commit()
            logger.info("bootstrap_admin_updated", extra={"username": username})
            return

        admin = AdminUser(
            username=username,
            email=email,
            password_hash=get_password_hash(password),
            is_active=True,
            is_superuser=True,
        )
        session.add(admin)
        await session.commit()
        logger.info("bootstrap_admin_created", extra={"username": username})


def _normalize_value(value: str | None) -> str:
    return (value or "").strip().strip('"').strip("'").strip()


def _normalize_email(value: str | None) -> str:
    return _normalize_value(value).lower()
