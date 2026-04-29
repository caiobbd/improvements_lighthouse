from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Any


class CustomAlarmsStoreError(RuntimeError):
    """Raised when custom alarms storage fails."""


class CustomAlarmsStore:
    _schema_lock: Lock = Lock()

    def __init__(self, db_path: str | Path) -> None:
        self._db_path = Path(db_path).expanduser().resolve()
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self._ensure_schema()

    @staticmethod
    def _now_iso() -> str:
        return datetime.now(timezone.utc).isoformat()

    @staticmethod
    def _normalize_attribute_id(attribute_id: str) -> str:
        normalized = str(attribute_id or "").strip()
        if not normalized:
            raise CustomAlarmsStoreError("attribute_id is required.")
        return normalized

    @staticmethod
    def _to_float_or_none(value: Any) -> float | None:
        if value is None:
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            raise CustomAlarmsStoreError("custom_hi/custom_lo must be numeric or null.") from None

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(str(self._db_path), check_same_thread=False)
        connection.row_factory = sqlite3.Row
        return connection

    def _ensure_schema(self) -> None:
        with self._schema_lock:
            try:
                with self._connect() as connection:
                    connection.execute("PRAGMA journal_mode=WAL;")
                    connection.execute(
                        """
                        CREATE TABLE IF NOT EXISTS custom_alarm_current (
                            attribute_id TEXT PRIMARY KEY,
                            custom_hi REAL NULL,
                            custom_lo REAL NULL,
                            created_date TEXT NOT NULL,
                            updated_date TEXT NOT NULL,
                            version_n INTEGER NOT NULL,
                            user TEXT NOT NULL DEFAULT 'unknown'
                        )
                        """
                    )
                    connection.execute(
                        """
                        CREATE TABLE IF NOT EXISTS custom_alarm_versions (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            attribute_id TEXT NOT NULL,
                            version_n INTEGER NOT NULL,
                            custom_hi REAL NULL,
                            custom_lo REAL NULL,
                            created_date TEXT NOT NULL,
                            updated_date TEXT NOT NULL,
                            user TEXT NOT NULL DEFAULT 'unknown',
                            values_json TEXT NOT NULL
                        )
                        """
                    )
                    connection.execute(
                        """
                        CREATE INDEX IF NOT EXISTS idx_custom_alarm_versions_attr_version
                        ON custom_alarm_versions(attribute_id, version_n DESC)
                        """
                    )
            except sqlite3.Error as exc:
                raise CustomAlarmsStoreError(f"Failed to initialize custom alarms schema: {exc}") from exc

    @staticmethod
    def _row_to_dict(row: sqlite3.Row) -> dict[str, Any]:
        return {
            "attribute_id": str(row["attribute_id"]),
            "custom_hi": float(row["custom_hi"]) if row["custom_hi"] is not None else None,
            "custom_lo": float(row["custom_lo"]) if row["custom_lo"] is not None else None,
            "created_date": str(row["created_date"]),
            "updated_date": str(row["updated_date"]),
            "version_n": int(row["version_n"]),
            "user": str(row["user"] or "unknown"),
        }

    def get_current(self, attribute_id: str) -> dict[str, Any] | None:
        normalized_id = self._normalize_attribute_id(attribute_id)
        try:
            with self._connect() as connection:
                row = connection.execute(
                    """
                    SELECT attribute_id, custom_hi, custom_lo, created_date, updated_date, version_n, user
                    FROM custom_alarm_current
                    WHERE attribute_id = ?
                    """,
                    (normalized_id,),
                ).fetchone()
        except sqlite3.Error as exc:
            raise CustomAlarmsStoreError(f"Failed reading custom alarm '{normalized_id}': {exc}") from exc
        if row is None:
            return None
        return self._row_to_dict(row)

    def list_versions(self, attribute_id: str, *, limit: int = 20) -> list[dict[str, Any]]:
        normalized_id = self._normalize_attribute_id(attribute_id)
        capped_limit = max(1, min(int(limit), 20))
        try:
            with self._connect() as connection:
                rows = connection.execute(
                    """
                    SELECT attribute_id, custom_hi, custom_lo, created_date, updated_date, version_n, user
                    FROM custom_alarm_versions
                    WHERE attribute_id = ?
                    ORDER BY version_n DESC, id DESC
                    LIMIT ?
                    """,
                    (normalized_id, capped_limit),
                ).fetchall()
        except sqlite3.Error as exc:
            raise CustomAlarmsStoreError(
                f"Failed listing custom alarm versions for '{normalized_id}': {exc}"
            ) from exc
        return [self._row_to_dict(row) for row in rows]

    def upsert(
        self,
        attribute_id: str,
        *,
        custom_hi: float | None,
        custom_lo: float | None,
        user: str = "unknown",
    ) -> dict[str, Any]:
        normalized_id = self._normalize_attribute_id(attribute_id)
        normalized_hi = self._to_float_or_none(custom_hi)
        normalized_lo = self._to_float_or_none(custom_lo)
        normalized_user = str(user or "unknown").strip() or "unknown"
        now = self._now_iso()

        try:
            with self._connect() as connection:
                existing = connection.execute(
                    """
                    SELECT created_date, version_n
                    FROM custom_alarm_current
                    WHERE attribute_id = ?
                    """,
                    (normalized_id,),
                ).fetchone()

                if existing is None:
                    created_date = now
                    version_n = 1
                    connection.execute(
                        """
                        INSERT INTO custom_alarm_current (
                            attribute_id, custom_hi, custom_lo, created_date, updated_date, version_n, user
                        ) VALUES (?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            normalized_id,
                            normalized_hi,
                            normalized_lo,
                            created_date,
                            now,
                            version_n,
                            normalized_user,
                        ),
                    )
                else:
                    created_date = str(existing["created_date"])
                    version_n = int(existing["version_n"]) + 1
                    connection.execute(
                        """
                        UPDATE custom_alarm_current
                        SET custom_hi = ?, custom_lo = ?, updated_date = ?, version_n = ?, user = ?
                        WHERE attribute_id = ?
                        """,
                        (
                            normalized_hi,
                            normalized_lo,
                            now,
                            version_n,
                            normalized_user,
                            normalized_id,
                        ),
                    )

                values_json = json.dumps(
                    {"custom_hi": normalized_hi, "custom_lo": normalized_lo},
                    ensure_ascii=True,
                )
                connection.execute(
                    """
                    INSERT INTO custom_alarm_versions (
                        attribute_id, version_n, custom_hi, custom_lo,
                        created_date, updated_date, user, values_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        normalized_id,
                        version_n,
                        normalized_hi,
                        normalized_lo,
                        created_date,
                        now,
                        normalized_user,
                        values_json,
                    ),
                )
                connection.execute(
                    """
                    DELETE FROM custom_alarm_versions
                    WHERE id IN (
                        SELECT id
                        FROM custom_alarm_versions
                        WHERE attribute_id = ?
                        ORDER BY version_n DESC, id DESC
                        LIMIT -1 OFFSET 20
                    )
                    """,
                    (normalized_id,),
                )

                row = connection.execute(
                    """
                    SELECT attribute_id, custom_hi, custom_lo, created_date, updated_date, version_n, user
                    FROM custom_alarm_current
                    WHERE attribute_id = ?
                    """,
                    (normalized_id,),
                ).fetchone()
                assert row is not None
                return self._row_to_dict(row)
        except sqlite3.Error as exc:
            raise CustomAlarmsStoreError(f"Failed persisting custom alarm '{normalized_id}': {exc}") from exc
