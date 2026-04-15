from __future__ import annotations

from app.services import schema_service


class StubInspector:
    def __init__(self, columns: list[str], has_table: bool = True) -> None:
        self._columns = columns
        self._has_table = has_table

    def has_table(self, table_name: str) -> bool:
        assert table_name == "redirect_settings"
        return self._has_table

    def get_columns(self, table_name: str) -> list[dict[str, str]]:
        assert table_name == "redirect_settings"
        return [{"name": column_name} for column_name in self._columns]


class StubConnection:
    def __init__(self) -> None:
        self.statements: list[str] = []

    def execute(self, statement) -> None:
        self.statements.append(str(statement))


def test_reconcile_redirect_settings_adds_missing_columns(monkeypatch):
    connection = StubConnection()
    monkeypatch.setattr(
        schema_service.sa,
        "inspect",
        lambda _connection: StubInspector(
            columns=["id", "enabled", "default_cooldown_seconds", "fallback_url", "active_campaign_id"],
        ),
    )

    schema_service._ensure_legacy_redirect_settings_columns(connection)

    assert connection.statements == [
        "ALTER TABLE redirect_settings ADD COLUMN open_in_new_tab BOOLEAN NOT NULL DEFAULT false",
        "ALTER TABLE redirect_settings ADD COLUMN facebook_url VARCHAR(2048)",
        "ALTER TABLE redirect_settings ADD COLUMN youtube_url VARCHAR(2048)",
        "ALTER TABLE redirect_settings ADD COLUMN instagram_url VARCHAR(2048)",
        "ALTER TABLE redirect_settings ADD COLUMN telegram_url VARCHAR(2048)",
        "ALTER TABLE redirect_settings ADD COLUMN whatsapp_url VARCHAR(2048)",
    ]


def test_reconcile_redirect_settings_skips_when_table_missing(monkeypatch):
    connection = StubConnection()
    monkeypatch.setattr(
        schema_service.sa,
        "inspect",
        lambda _connection: StubInspector(columns=[], has_table=False),
    )

    schema_service._ensure_legacy_redirect_settings_columns(connection)

    assert connection.statements == []
