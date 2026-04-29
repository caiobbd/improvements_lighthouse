from __future__ import annotations

from backend.app.api.charts import get_profiling_adapter
from backend.app.models.charts import SensorContextRow, SensorContextThreshold


class _FakeAdapter:
    def __init__(self) -> None:
        self.calls: list[dict[str, str | None]] = []

    def build_sensor_context_row(
        self,
        *,
        tag_key: str,
        item_id: str,
        asset_name: str,
        label: str,
        start_date: str,
        end_date: str,
        window: str,
        attribute_id: str | None = None,
        attribute_name: str | None = None,
    ) -> SensorContextRow:
        self.calls.append(
            {
                "tag_key": tag_key,
                "item_id": item_id,
                "asset_name": asset_name,
                "start_date": start_date,
                "end_date": end_date,
                "window": window,
                "attribute_id": attribute_id,
                "attribute_name": attribute_name,
            }
        )
        return SensorContextRow(
            tag_key=tag_key,
            item_id=item_id,
            asset_name=asset_name,
            attribute_id=attribute_id,
            attribute_name=attribute_name or "Temperature",
            label=label,
            unit_of_measurement="degC",
            last_value=70.0,
            avg_1d=68.0,
            thresholds={
                "hi": SensorContextThreshold(
                    key="hi",
                    value=85.0,
                    unit="degC",
                    source="sub_attributes",
                )
            },
        )


def test_sensor_context_batch_returns_enriched_rows(client) -> None:
    fake = _FakeAdapter()
    client.app.dependency_overrides[get_profiling_adapter] = lambda: fake
    payload = {
        "start_date": "2026-01-01",
        "end_date": "2026-01-03",
        "window": "6h",
        "tags": [
            {
                "tag_key": "item-1::attr-1",
                "asset_name": "MV30-HBG-1120B",
                "item_id": "item-1",
                "attribute_id": "attr-1",
                "attribute_name": "Temperature",
                "label": "Temperature [TAG]",
            }
        ],
    }

    response = client.post("/api/v1/charts/sensor-context-batch", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert len(body["rows"]) == 1
    assert body["rows"][0]["last_value"] == 70.0
    assert body["rows"][0]["avg_1d"] == 68.0
    assert body["rows"][0]["thresholds"]["hi"]["value"] == 85.0
    assert fake.calls[0]["start_date"] == "2026-01-01"
    assert fake.calls[0]["end_date"] == "2026-01-03"
    assert fake.calls[0]["window"] == "6h"


def test_sensor_context_batch_requires_non_empty_tags(client) -> None:
    response = client.post("/api/v1/charts/sensor-context-batch", json={"tags": []})
    assert response.status_code == 422
    assert "non-empty tags array" in response.json()["detail"]


def test_sensor_context_batch_rejects_invalid_tag_payload(client) -> None:
    response = client.post(
        "/api/v1/charts/sensor-context-batch",
        json={
            "tags": [{"item_id": "item-1", "asset_name": "Asset"}],
        },
    )
    assert response.status_code == 422
    assert "item_id and attribute_id/attribute_name are required" in response.json()["detail"]
