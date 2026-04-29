from __future__ import annotations

import pandas as pd

from backend.app.models.charts import Series, SeriesPoint
from backend.app.services.profiling_adapter import ProfilingAdapter


class _FakeWorkspace:
    def get_item_attributes(self, _: str) -> pd.DataFrame:
        return pd.DataFrame(
            [
                {
                    "id": "attr-1",
                    "name": "Temperature - Cold Side Outlet",
                    "reference": "TAG-001",
                    "data_source": "Timeseries",
                    "categories": ["Cold Side"],
                    "unit_of_measurement": "degC",
                    "sub_attributes": [{"name": "-1d AVG", "value": 999}],
                }
            ]
        )


def test_avg_1d_uses_timeseries_points_only() -> None:
    adapter = ProfilingAdapter(workspace=_FakeWorkspace())

    def _fake_get_timeseries_from_attribute(*_: object, **__: object) -> list[Series]:
        return [
            Series(
                name="Temperature",
                points=[
                    SeriesPoint(timestamp=pd.Timestamp("2026-01-02T00:00:00").to_pydatetime(), value=20.0),
                    SeriesPoint(timestamp=pd.Timestamp("2026-01-03T12:00:00").to_pydatetime(), value=40.0),
                    SeriesPoint(timestamp=pd.Timestamp("2026-01-03T23:00:00").to_pydatetime(), value=50.0),
                ],
            )
        ]

    adapter.get_timeseries_from_attribute = _fake_get_timeseries_from_attribute  # type: ignore[assignment]

    row = adapter.build_sensor_context_row(
        tag_key="tag-1",
        item_id="item-1",
        asset_name="Asset 1",
        label="Sensor 1",
        start_date="2026-01-01",
        end_date="2026-01-03",
        window="6h",
        attribute_id="attr-1",
    )

    assert row.last_value == 50.0
    assert row.avg_1d == 45.0
