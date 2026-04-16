"""add redirect setting tab behavior and stream uniqueness

Revision ID: 0002_redirect_streams
Revises: 0001_initial
Create Date: 2026-03-24 00:30:00
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0002_redirect_streams"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    redirect_columns = {column["name"] for column in inspector.get_columns("redirect_settings")}
    if "open_in_new_tab" not in redirect_columns:
        op.add_column(
            "redirect_settings",
            sa.Column("open_in_new_tab", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        )

    stream_constraints = {constraint["name"] for constraint in inspector.get_unique_constraints("stream_links") if constraint.get("name")}
    if "uq_stream_links_external_match_id" not in stream_constraints:
        # Keep the most recently updated row for each external_match_id before enforcing uniqueness.
        op.execute(
            sa.text(
                """
                DELETE FROM stream_links
                WHERE id IN (
                    SELECT id
                    FROM (
                        SELECT id,
                               ROW_NUMBER() OVER (
                                   PARTITION BY external_match_id
                                   ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
                               ) AS row_num
                        FROM stream_links
                    ) ranked
                    WHERE ranked.row_num > 1
                )
                """
            )
        )
        op.create_unique_constraint(
            "uq_stream_links_external_match_id",
            "stream_links",
            ["external_match_id"],
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    stream_constraints = {constraint["name"] for constraint in inspector.get_unique_constraints("stream_links") if constraint.get("name")}
    if "uq_stream_links_external_match_id" in stream_constraints:
        op.drop_constraint("uq_stream_links_external_match_id", "stream_links", type_="unique")

    redirect_columns = {column["name"] for column in inspector.get_columns("redirect_settings")}
    if "open_in_new_tab" in redirect_columns:
        op.drop_column("redirect_settings", "open_in_new_tab")
