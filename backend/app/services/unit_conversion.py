from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from math import isfinite
from typing import Iterable

from backend.app.models.charts import SensorContextThreshold


_TEMP_DIMENSION = "temperature"

_LINEAR_UNIT_FACTORS_TO_BASE = {
    # base: um
    "displacement": {
        "um": 1.0,
        "mm": 1000.0,
        "mil": 25.4,
    },
    # base: mm/s
    "velocity": {
        "mm/s": 1.0,
        "in/s": 25.4,
    },
    # base: m/s2
    "acceleration": {
        "m/s2": 1.0,
        "g": 9.80665,
    },
    # base: kPa
    "pressure": {
        "kpa": 1.0,
        "kpag": 1.0,  # treated as equivalent for operational threshold scaling
        "bar": 100.0,
        "psi": 6.894757293168361,
        "kgf/cm2": 98.0665,
        "inwc": 0.24908891,
        "mmh2o": 0.00980665,
    },
}

_ALIASES_RAW: dict[str, Iterable[str]] = {
    # displacement
    "um": [
        "um",
        "\u00b5m",
        "\u03bcm",
        "micron",
        "microns",
        "micrometer",
        "micrometers",
        "um pp",
        "um-pp",
        "\u00b5m pp",
        "\u00b5m-pp",
        "\u03bcm pp",
        "\u03bcm-pp",
    ],
    "mil": ["mil", "mils", "mil pp", "mils pp"],
    "mm": ["mm"],
    # velocity
    "mm/s": ["mm/s", "mm/s rms", "mmps", "mm sec", "mm/sec", "mms"],
    "in/s": ["in/s", "ips", "in/s rms", "inch/s", "inch/sec", "in/sec", "inches/s", "inches/sec"],
    # acceleration
    "g": ["g", "ge", "g rms", "grms"],
    "m/s2": ["m/s2", "m/s^2", "m/s\u00b2", "m/s2 rms", "m/s\u00b2 rms", "mps2", "m/sec2"],
    # temperature
    "c": ["c", "\u00b0c", "degc", "deg c", "deg. c", "deg.c", "celsius"],
    "f": ["f", "\u00b0f", "degf", "deg f", "deg. f", "deg.f", "fahrenheit"],
    # pressure
    "kpa": ["kpa", "kpaa"],
    "kpag": ["kpag", "kpa(g)", "kpa g"],
    "bar": ["bar", "barg", "bar(g)", "bar g"],
    "psi": ["psi", "psig", "psia", "psid", "psi(g)", "psi g"],
    "kgf/cm2": ["kgf/cm2", "kg/cm2", "kg/cm\u00b2", "kgf/cm^2", "kg/cm^2", "kgfcm2"],
    "inwc": ["inwc", "inwg", "inh2o", "in h2o", "inchh2o", "inchesh2o", "inches water column"],
    "mmh2o": ["mmh2o", "mm h2o", "mmwc", "mm water column"],
}


def _normalize_token(unit: str | None) -> str | None:
    if unit is None:
        return None
    text = str(unit).strip().lower()
    if not text:
        return None

    text = unicodedata.normalize("NFKC", text)
    replacements = (
        ("\u00b5", "u"),
        ("\u03bc", "u"),
        ("\u00b0", ""),
        ("\u00b2", "2"),
        ("\u00b3", "3"),
        ("âµ", "u"),
        ("â°", ""),
        ("â²", "2"),
        ("â³", "3"),
        ("Âµ", "u"),
        ("Â°", ""),
        ("Â²", "2"),
        ("Â³", "3"),
    )
    for source, target in replacements:
        text = text.replace(source, target)

    text = text.replace("_", "")
    text = text.replace("\u2013", "-").replace("\u2014", "-")
    text = re.sub(r"\s+", " ", text).strip()
    text = text.replace(".", "")
    text = text.replace("-", "")
    text = text.replace("(", "")
    text = text.replace(")", "")
    text = text.replace(" ", "")
    return text or None


def _build_alias_index() -> dict[str, str]:
    alias_index: dict[str, str] = {}
    for canonical, values in _ALIASES_RAW.items():
        canonical_token = _normalize_token(canonical)
        if canonical_token:
            alias_index[canonical_token] = canonical
        for value in values:
            normalized = _normalize_token(value)
            if normalized:
                alias_index[normalized] = canonical
    return alias_index


_ALIAS_INDEX = _build_alias_index()

_CANONICAL_DIMENSION: dict[str, str] = {}
for dimension, factors in _LINEAR_UNIT_FACTORS_TO_BASE.items():
    for canonical in factors:
        _CANONICAL_DIMENSION[canonical] = dimension
for canonical in ("c", "f"):
    _CANONICAL_DIMENSION[canonical] = _TEMP_DIMENSION


@dataclass(frozen=True)
class ConversionResult:
    value: float
    source_canonical: str
    target_canonical: str
    applied: bool
    error: str | None = None


def canonical_unit(unit: str | None) -> str | None:
    token = _normalize_token(unit)
    if not token:
        return None
    return _ALIAS_INDEX.get(token)


def convert_value(value: float, source_unit: str | None, target_unit: str | None) -> ConversionResult | None:
    if not isfinite(value):
        return None
    source_canonical = canonical_unit(source_unit)
    target_canonical = canonical_unit(target_unit)
    if not source_canonical or not target_canonical:
        return None
    source_dimension = _CANONICAL_DIMENSION.get(source_canonical)
    target_dimension = _CANONICAL_DIMENSION.get(target_canonical)
    if not source_dimension or source_dimension != target_dimension:
        return None

    if source_dimension == _TEMP_DIMENSION:
        if source_canonical == target_canonical:
            return ConversionResult(
                value=value,
                source_canonical=source_canonical,
                target_canonical=target_canonical,
                applied=False,
            )
        if source_canonical == "c" and target_canonical == "f":
            converted = (value * 9.0 / 5.0) + 32.0
        elif source_canonical == "f" and target_canonical == "c":
            converted = (value - 32.0) * 5.0 / 9.0
        else:
            return None
        return ConversionResult(
            value=converted,
            source_canonical=source_canonical,
            target_canonical=target_canonical,
            applied=True,
        )

    factors = _LINEAR_UNIT_FACTORS_TO_BASE[source_dimension]
    source_factor = factors.get(source_canonical)
    target_factor = factors.get(target_canonical)
    if source_factor is None or target_factor is None:
        return None
    if target_factor == 0:
        return None
    converted = value * source_factor / target_factor
    return ConversionResult(
        value=converted,
        source_canonical=source_canonical,
        target_canonical=target_canonical,
        applied=source_canonical != target_canonical,
    )


def convert_thresholds_to_target_unit(
    thresholds: dict[str, SensorContextThreshold],
    target_unit: str | None,
) -> dict[str, SensorContextThreshold]:
    if not thresholds:
        return {}
    resolved: dict[str, SensorContextThreshold] = {}
    for key, threshold in thresholds.items():
        numeric_value = threshold.value
        if numeric_value is None or not isfinite(float(numeric_value)):
            resolved[key] = threshold.model_copy(
                update={
                    "converted_value": threshold.value,
                    "converted_unit": target_unit or threshold.unit,
                    "conversion_applied": False,
                    "conversion_error": None,
                }
            )
            continue

        source_unit = threshold.unit
        conversion = convert_value(float(numeric_value), source_unit, target_unit)
        if conversion is None:
            resolved[key] = threshold.model_copy(
                update={
                    "converted_value": float(numeric_value),
                    "converted_unit": source_unit or target_unit,
                    "conversion_applied": False,
                    "conversion_error": None,
                }
            )
            continue

        resolved[key] = threshold.model_copy(
            update={
                "converted_value": float(conversion.value),
                "converted_unit": target_unit or threshold.unit,
                "conversion_applied": conversion.applied,
                "conversion_error": conversion.error,
            }
        )

    return resolved
