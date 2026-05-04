from __future__ import annotations

from backend.app.models.charts import SensorContextThreshold
from backend.app.services.unit_conversion import canonical_unit, convert_thresholds_to_target_unit


def test_canonical_unit_normalizes_common_aliases() -> None:
    assert canonical_unit("um pp") == "um"
    assert canonical_unit("\u00b5m-pp") == "um"
    assert canonical_unit("mils pp") == "mil"
    assert canonical_unit("MM/S") == "mm/s"
    assert canonical_unit("Deg. C") == "c"
    assert canonical_unit("kg/cm\u00b2") == "kgf/cm2"
    assert canonical_unit("kPag") == "kpag"
    assert canonical_unit("mm h2o") == "mmh2o"


def test_threshold_conversion_displacement_mils_to_um() -> None:
    thresholds = {
        "hi": SensorContextThreshold(
            key="hi",
            value=2.6,
            unit="mils",
            source="sub_attributes",
        )
    }

    converted = convert_thresholds_to_target_unit(thresholds, "\u00b5m")
    hi = converted["hi"]
    assert hi.value == 2.6
    assert hi.converted_unit == "\u00b5m"
    assert hi.conversion_applied is True
    assert hi.converted_value is not None
    assert abs(hi.converted_value - 66.04) < 1e-6


def test_threshold_conversion_pressure_kpag_to_bar() -> None:
    thresholds = {
        "hi": SensorContextThreshold(
            key="hi",
            value=100.0,
            unit="kPag",
            source="sub_attributes",
        )
    }

    converted = convert_thresholds_to_target_unit(thresholds, "bar")
    hi = converted["hi"]
    assert hi.converted_value is not None
    assert abs(hi.converted_value - 1.0) < 1e-9
    assert hi.converted_unit == "bar"
    assert hi.conversion_applied is True


def test_unknown_unit_keeps_original_value_without_conversion() -> None:
    thresholds = {
        "hi": SensorContextThreshold(
            key="hi",
            value=15.0,
            unit="nm\u00b3/h",
            source="sub_attributes",
        )
    }

    converted = convert_thresholds_to_target_unit(thresholds, "kPa")
    hi = converted["hi"]
    assert hi.value == 15.0
    assert hi.converted_value == 15.0
    assert hi.conversion_applied is False
    assert hi.converted_unit == "nm\u00b3/h"
