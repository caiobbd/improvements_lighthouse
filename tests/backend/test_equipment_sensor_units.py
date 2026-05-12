from __future__ import annotations

import pandas as pd

from backend.app.services.profiling_adapter import ProfilingAdapter


class _FakeWorkspace:
    def get_item_attributes(self, _: str) -> pd.DataFrame:
        return pd.DataFrame(
            [
                {
                    "id": "attr-1",
                    "name": "Pressure - Cold Side Inlet",
                    "reference": "TAG-001",
                    "data_source": "Timeseries",
                    "categories": ["Cold Side"],
                    "unit_of_measurement": "kPag",
                    "sub_attributes": [],
                },
                {
                    "id": "attr-2",
                    "name": "Temperature - Cold Side Outlet",
                    "reference": "TAG-002",
                    "data_source": "Timeseries",
                    "categories": ["Cold Side"],
                    "unit_of_measurement": None,
                    "sub_attributes": [
                        {
                            "name": "Hi",
                            "value": 100,
                            "unit": "degC",
                        }
                    ],
                },
            ]
        )


def test_equipment_sensors_include_unit_metadata_from_attribute_payload() -> None:
    adapter = ProfilingAdapter(workspace=_FakeWorkspace())

    categories, sensors = adapter.get_equipment_sensors("item-1", "MVX")

    assert len(categories) == 1
    assert len(sensors) == 2

    by_attribute_id = {sensor.attribute_id: sensor for sensor in sensors}
    assert by_attribute_id["attr-1"].unit_of_measurement == "kPag"
    assert by_attribute_id["attr-2"].unit_of_measurement == "degC"
    assert by_attribute_id["attr-1"].unit_metadata_loaded is True
    assert by_attribute_id["attr-2"].unit_metadata_loaded is True
