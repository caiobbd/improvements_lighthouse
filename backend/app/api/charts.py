from __future__ import annotations

import json
import re
from datetime import date, datetime, timedelta
from functools import lru_cache

from fastapi import APIRouter, Depends, HTTPException, Query

from backend.app.models.charts import (
    AssetSearchResponse,
    ChartDefinition,
    ChartPage,
    ChartPagesResponse,
    ChartSelectedTag,
    EquipmentSensorsResponse,
    EquipmentTreeResponse,
    HealthResponse,
    IntelEventCard,
    IntelEventsResponse,
    ItemAttributesResponse,
    ItemResolutionResponse,
    TimeSeriesBatchResponse,
    TimeSeriesBatchTag,
    TimeSeriesResponse,
)
from backend.app.services.profiling_adapter import (
    ProfilingAdapter,
    ProfilingAdapterError,
    UnknownAssetError,
    WorkspaceUnavailableError,
)

router = APIRouter()

PRESET_ASSETS = [
    "MV27-HBG-1130C (CRUDE HEATER)",
    "MV30-HBG-1120A (CRUDE HEATER)",
]
MV_CODES = ("MV18", "MV20", "MV22", "MV24", "MV26", "MV28", "MV30")

ATTRIBUTE_NAME_PREFERENCES = (
    "temp",
    "temperature",
    "outlet",
    "flow",
    "rate",
    "pressure",
)
SUPPORTED_WINDOWS = {"15m", "1h", "6h", "1d"}


@lru_cache(maxsize=1)
def get_profiling_adapter() -> ProfilingAdapter:
    return ProfilingAdapter()


def _default_date_window(start_date: date | None, end_date: date | None) -> tuple[date, date]:
    safe_end = end_date or date.today()
    safe_start = start_date or (safe_end - timedelta(days=30))
    if safe_start > safe_end:
        raise HTTPException(status_code=422, detail="start_date must be on or before end_date")
    return safe_start, safe_end


def _resolve_auto_window(start_date: date, end_date: date) -> str:
    day_span = max(0, (end_date - start_date).days)
    if day_span <= 1:
        return "15m"
    if day_span <= 7:
        return "1h"
    if day_span <= 30:
        return "6h"
    return "1d"


def _resolve_effective_window(window: str | None, start_date: date, end_date: date) -> str:
    normalized = str(window or "").strip().lower()
    if normalized in SUPPORTED_WINDOWS:
        return normalized
    if normalized in {"", "auto"}:
        return _resolve_auto_window(start_date, end_date)
    return "6h"


def _batch_tag_request_key(
    *,
    item_id: str,
    attribute_id: str | None,
    attribute_name: str | None,
) -> str:
    normalized_item_id = str(item_id or "").strip()
    normalized_attribute_id = str(attribute_id or "").strip()
    normalized_attribute_name = str(attribute_name or "").strip().lower()
    return f"{normalized_item_id}|{normalized_attribute_id}|{normalized_attribute_name}"


def _rank_attribute_name(name: str) -> int:
    lowered = name.strip().lower()
    for index, token in enumerate(ATTRIBUTE_NAME_PREFERENCES):
        if token in lowered:
            return index
    return len(ATTRIBUTE_NAME_PREFERENCES)


def _select_preset_chart(
    *,
    adapter: ProfilingAdapter,
    asset_name: str,
    start_date: date,
    end_date: date,
    chart_index: int,
) -> ChartDefinition | None:
    resolved = adapter.resolve_item(asset_name)
    item_id = str(resolved["item_id"])
    item_name = str(resolved.get("item_name") or asset_name)
    attributes = adapter.get_item_attributes(item_id, asset_name=asset_name)

    candidates = [attribute for attribute in attributes if attribute.has_timeseries_reference]
    if not candidates:
        return None

    ranked = sorted(candidates, key=lambda attribute: _rank_attribute_name(attribute.name))
    selected = ranked[0]

    return ChartDefinition(
        id=f"preset-live-{chart_index}",
        title=f"{item_name} - {selected.name}",
        asset_name=asset_name,
        item_id=item_id,
        attribute_id=selected.id,
        attribute_name=selected.name,
        from_categories=selected.categories,
        from_attributes=[selected.name],
    )


def _normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip().lower())


def _contains_all_tokens(name: str, tokens: tuple[str, ...]) -> bool:
    normalized = _normalize_text(name)
    return all(token in normalized for token in tokens)


def _has_timeseries(attribute) -> bool:
    return bool(attribute.has_timeseries_reference or attribute.is_timeseries_data_source)


def _find_mv_asset(adapter: ProfilingAdapter, mv_code: str) -> str | None:
    candidates = adapter.search_assets(f"{mv_code}-", limit=50)
    if not candidates:
        candidates = adapter.search_assets(mv_code, limit=50)
    if not candidates:
        return None

    exact_prefix = []
    for entry in candidates:
        asset_name = str(entry.get("asset_name") or "").strip()
        if asset_name.upper().startswith(f"{mv_code}-"):
            exact_prefix.append(asset_name)
    if not exact_prefix:
        return None

    exact_prefix.sort(
        key=lambda name: (
            "hbg" not in name.lower(),
            len(name),
            name.lower(),
        )
    )
    return exact_prefix[0]


def _find_attribute(attributes, preferred_tokens: tuple[str, ...], fallback_token: str) -> object | None:
    ranked = [attr for attr in attributes if _has_timeseries(attr)]
    if not ranked:
        return None

    for attribute in ranked:
        if _contains_all_tokens(attribute.name, preferred_tokens):
            return attribute

    for attribute in ranked:
        if fallback_token in _normalize_text(attribute.name):
            return attribute

    return None


def _build_mv_oil_vs_water_chart(adapter: ProfilingAdapter) -> ChartDefinition:
    selected_tags: list[ChartSelectedTag] = []

    for mv_code in MV_CODES:
        asset_name = _find_mv_asset(adapter, mv_code)
        if not asset_name:
            continue
        try:
            resolved = adapter.resolve_item(asset_name)
            item_id = str(resolved["item_id"])
            attributes = adapter.get_item_attributes(item_id, asset_name=asset_name)
        except (UnknownAssetError, WorkspaceUnavailableError, ProfilingAdapterError):
            continue

        oil_attribute = _find_attribute(
            attributes,
            preferred_tokens=("oil", "flow"),
            fallback_token="oil",
        )
        water_injection_attribute = _find_attribute(
            attributes,
            preferred_tokens=("water", "inject"),
            fallback_token="inject",
        )

        if oil_attribute is not None:
            selected_tags.append(
                ChartSelectedTag(
                    asset_name=asset_name,
                    item_id=item_id,
                    attribute_id=oil_attribute.id,
                    attribute_name=oil_attribute.name,
                    label=f"{mv_code} - Total Oil Flow",
                )
            )
        if water_injection_attribute is not None:
            selected_tags.append(
                ChartSelectedTag(
                    asset_name=asset_name,
                    item_id=item_id,
                    attribute_id=water_injection_attribute.id,
                    attribute_name=water_injection_attribute.name,
                    label=f"{mv_code} - Total Water Injection",
                )
            )

    if not selected_tags:
        return ChartDefinition(
            id="preset-mv-oil-water",
            title="All MVs - Total Oil Flow vs Total Water Injection",
            asset_name="MVBAC",
            from_categories=[],
            from_attributes=[],
            selected_tags=[],
        )

    return ChartDefinition(
        id="preset-mv-oil-water",
        title="All MVs - Total Oil Flow vs Total Water Injection",
        asset_name="MVBAC",
        from_categories=["Production"],
        from_attributes=["Total Oil Flow", "Total Water Injection"],
        selected_tags=selected_tags,
    )


def _build_mv30_category_chart(adapter: ProfilingAdapter) -> ChartDefinition:
    mv30_asset = _find_mv_asset(adapter, "MV30")
    if not mv30_asset:
        mv30_asset = "MV30-HBG-1120B"

    try:
        resolved = adapter.resolve_item(mv30_asset)
        item_id = str(resolved["item_id"])
        asset_name = str(resolved.get("item_name") or mv30_asset)
        attributes = adapter.get_item_attributes(item_id, asset_name=asset_name)
    except (UnknownAssetError, WorkspaceUnavailableError, ProfilingAdapterError):
        return ChartDefinition(
            id="preset-mv30-categories",
            title="MV30-HBG-1120B - All Categories",
            asset_name=mv30_asset,
            from_categories=[],
            from_attributes=[],
            selected_tags=[],
        )

    by_category: dict[str, list] = {}
    for attribute in attributes:
        if not _has_timeseries(attribute):
            continue
        categories = attribute.categories or ["Uncategorized"]
        category_name = str(categories[0] or "Uncategorized").strip()
        by_category.setdefault(category_name, []).append(attribute)

    selected_tags: list[ChartSelectedTag] = []
    for category_name in sorted(by_category.keys(), key=lambda value: value.lower()):
        candidates = by_category[category_name]
        candidates.sort(key=lambda attribute: (_rank_attribute_name(attribute.name), len(attribute.name)))
        selected = candidates[0]
        selected_tags.append(
            ChartSelectedTag(
                asset_name=asset_name,
                item_id=item_id,
                attribute_id=selected.id,
                attribute_name=selected.name,
                label=f"{category_name}: {selected.name}",
            )
        )

    return ChartDefinition(
        id="preset-mv30-categories",
        title="MV30-HBG-1120B - All Categories",
        asset_name=asset_name,
        from_categories=sorted(by_category.keys(), key=lambda value: value.lower()),
        from_attributes=[],
        selected_tags=selected_tags,
    )


@router.get("/health", response_model=HealthResponse)
def charts_health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        message="Charts API is available",
        timestamp=datetime.utcnow(),
    )


@router.get("/asset-search", response_model=AssetSearchResponse)
def asset_search(
    query: str = Query(default="", min_length=0),
    limit: int = Query(default=50, ge=1, le=50),
    adapter: ProfilingAdapter = Depends(get_profiling_adapter),
) -> AssetSearchResponse:
    try:
        results = adapter.search_assets(query=query, limit=limit)
    except WorkspaceUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ProfilingAdapterError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return AssetSearchResponse(
        query=query,
        limit=limit,
        total=len(results),
        results=results,
    )


@router.get(
    "/equipment-tree",
    response_model=EquipmentTreeResponse,
    response_model_exclude_none=True,
    response_model_exclude_defaults=True,
)
def equipment_tree(
    ancestor_id: str | None = Query(default=None),
    lean: bool = Query(default=False),
    adapter: ProfilingAdapter = Depends(get_profiling_adapter),
) -> EquipmentTreeResponse:
    try:
        roots, nodes = adapter.get_equipment_tree(ancestor_id=ancestor_id, lean=lean)
    except WorkspaceUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ProfilingAdapterError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return EquipmentTreeResponse(
        total=len(nodes),
        roots=roots,
        nodes=nodes,
    )


@router.get("/pages", response_model=ChartPagesResponse)
def get_pages() -> ChartPagesResponse:
    today = date.today()
    last_month = today - timedelta(days=30)
    mv_charts = [
        ChartDefinition(
            id="preset-mv20-oil-water",
            title="MV20 - Oil Production vs Water Injection",
            asset_name="MV20",
            selected_tags=[
                ChartSelectedTag(
                    asset_name="MV20 - SEAWATER INJECTION PUMPS",
                    item_id="080e366f-6001-4949-b7f2-299920dce97c",
                    attribute_id="87fdfa00-f908-438c-ad94-6c9f9a3b2dd0",
                    attribute_name="Accuracy Pump Injection Flow",
                    label="Water Injection [MV20|Water Injection]",
                ),
            ],
        ),
        ChartDefinition(
            id="preset-mv22-oil-water",
            title="MV22 - Oil Production vs Water Injection",
            asset_name="MV22",
            selected_tags=[
                ChartSelectedTag(
                    asset_name="MV22-HBG-1110A (CRUDE X CRUDE)",
                    item_id="b92015d2-7b82-4986-b4f0-9784e0636f02",
                    attribute_id="eed8fa29-8bf8-427e-aa27-8e7c1ea64547",
                    attribute_name="Flow - Fiscal Metering Sum",
                    label="Oil Production [MV22|Oil Production]",
                ),
                ChartSelectedTag(
                    asset_name="MV22 - SEAWATER INJECTION DISCHARGE",
                    item_id="d6173bc2-7939-4a0a-a441-bf088e2a894c",
                    attribute_id="4bd43463-11b2-4c04-b039-fe97ed37b4d6",
                    attribute_name="Sum of Injection Headers Flow",
                    label="Water Injection [MV22|Water Injection]",
                ),
            ],
        ),
        ChartDefinition(
            id="preset-mv24-oil-water",
            title="MV24 - Oil Production vs Water Injection",
            asset_name="MV24",
            selected_tags=[
                ChartSelectedTag(
                    asset_name="MV24 - SEAWATER INJECTION DISCHARGE",
                    item_id="e9ccc473-8d19-4121-a9d5-f8d989d275d6",
                    attribute_id="6347db80-39bb-47a1-8cf9-983f80ed3c2d",
                    attribute_name="Sum of Injection Headers Flow - Accumulated",
                    label="Water Injection [MV24|Water Injection]",
                ),
            ],
        ),
        ChartDefinition(
            id="preset-mv26-oil-water",
            title="MV26 - Oil Production vs Water Injection",
            asset_name="MV26",
            selected_tags=[
                ChartSelectedTag(
                    asset_name="MV26 - SEAWATER INJECTION DISCHARGE",
                    item_id="e7917160-faa1-4159-ab52-d92a7cfe6ba3",
                    attribute_id="fb1439f8-c194-41bd-b2e5-468c9f085f08",
                    attribute_name="Sum of Injection Headers Flow - Accumulated",
                    label="Water Injection [MV26|Water Injection]",
                ),
            ],
        ),
        ChartDefinition(
            id="preset-mv30-oil-water",
            title="MV30 - Oil Production vs Water Injection",
            asset_name="MV30",
            selected_tags=[
                ChartSelectedTag(
                    asset_name="MV30-HBG-1120B (CRUDE HEATER)",
                    item_id="fb00c3ea-3d11-4c07-9f32-9eee2fb697ba",
                    attribute_id="e1903cf7-0f7e-4d7e-a657-7533ff0b7777",
                    attribute_name="Flow - Oil Outlet (A) - Gross",
                    label="Oil Production [MV30|Oil Production]",
                ),
                ChartSelectedTag(
                    asset_name="MV30 - SEAWATER INJECTION PUMPS",
                    item_id="1ff6c7f9-6674-47c5-8d0a-9d136e330db8",
                    attribute_id="40de961d-60e0-4e9d-86c6-de87525bdaf7",
                    attribute_name="Sum of Pump Injection Flow",
                    label="Water Injection [MV30|Water Injection]",
                ),
            ],
        ),
    ]

    mv_oil_water_page = ChartPage(
        id="preset-mv-oil-water",
        name="MV Oil + Water Overview",
        is_preset=True,
        grid_columns=1,
        date_preset="30d",
        frequency_mode="auto",
        frequency_window="6h",
        start_date=last_month,
        end_date=today,
        charts=mv_charts,
    )

    mv30_categories_chart = ChartDefinition(
        id="preset-mv30-categories",
        title="MV30-HBG-1120B - All Categories",
        asset_name="MV30-HBG-1120B (CRUDE HEATER)",
        selected_tags=[
            ChartSelectedTag(
                asset_name="MV30-HBG-1120B (CRUDE HEATER)",
                item_id="fb00c3ea-3d11-4c07-9f32-9eee2fb697ba",
                attribute_id="360e0563-bc65-4bdc-b82e-3df26914975c",
                attribute_name="CV - Normalized Pressure Drop - Cold Side - Temperature Weighted",
                label="Calculated Variables [MV30-HBG-1120B|Calculated Variables]",
            ),
            ChartSelectedTag(
                asset_name="MV30-HBG-1120B (CRUDE HEATER)",
                item_id="fb00c3ea-3d11-4c07-9f32-9eee2fb697ba",
                attribute_id="cd3da912-cdcc-4309-b42c-739d3a1b8ca6",
                attribute_name="Temperature Control - Mode",
                label="Temperature Control [MV30-HBG-1120B|Temperature Control]",
            ),
            ChartSelectedTag(
                asset_name="MV30-HBG-1120B (CRUDE HEATER)",
                item_id="fb00c3ea-3d11-4c07-9f32-9eee2fb697ba",
                attribute_id="b47bc9a8-a762-4b04-a073-7ff5d2362ca1",
                attribute_name="Temperature - Cold Side Outlet",
                label="Cold Side [MV30-HBG-1120B|Cold Side]",
            ),
            ChartSelectedTag(
                asset_name="MV30-HBG-1120B (CRUDE HEATER)",
                item_id="fb00c3ea-3d11-4c07-9f32-9eee2fb697ba",
                attribute_id="c1ed14fb-29c8-4927-90cb-917528029a60",
                attribute_name="Delta Pressure - Hot Side",
                label="Hot Side [MV30-HBG-1120B|Hot Side]",
            ),
            ChartSelectedTag(
                asset_name="MV30-HBG-1120B (CRUDE HEATER)",
                item_id="fb00c3ea-3d11-4c07-9f32-9eee2fb697ba",
                attribute_id="e1903cf7-0f7e-4d7e-a657-7533ff0b7777",
                attribute_name="Flow - Oil Outlet (A) - Gross",
                label="Scaling Index [MV30-HBG-1120B|Scaling Index]",
            ),
            ChartSelectedTag(
                asset_name="MV30-HBG-1120B (CRUDE HEATER)",
                item_id="fb00c3ea-3d11-4c07-9f32-9eee2fb697ba",
                attribute_id="ff2e1ce4-9ae8-450e-a533-db709240b806",
                attribute_name="Status",
                label="General [MV30-HBG-1120B|General]",
            ),
        ],
    )

    mv30_categories_page = ChartPage(
        id="preset-mv30-categories",
        name="MV30-HBG-1120B Categories",
        is_preset=True,
        grid_columns=1,
        date_preset="30d",
        frequency_mode="auto",
        frequency_window="6h",
        start_date=last_month,
        end_date=today,
        charts=[mv30_categories_chart],
    )

    preset_pages = [mv_oil_water_page, mv30_categories_page]

    return ChartPagesResponse(pages=preset_pages)


@router.get("/resolve-item", response_model=ItemResolutionResponse)
def resolve_item(
    asset_name: str = Query(..., min_length=2),
    adapter: ProfilingAdapter = Depends(get_profiling_adapter),
) -> ItemResolutionResponse:
    try:
        resolved = adapter.resolve_item(asset_name)
        return ItemResolutionResponse(**resolved)
    except UnknownAssetError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except WorkspaceUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ProfilingAdapterError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/item-attributes", response_model=ItemAttributesResponse)
def get_item_attributes(
    item_id: str | None = Query(default=None),
    asset_name: str | None = Query(default=None),
    timeseries_only: bool = Query(default=False),
    adapter: ProfilingAdapter = Depends(get_profiling_adapter),
) -> ItemAttributesResponse:
    if not item_id and not asset_name:
        raise HTTPException(status_code=422, detail="Provide item_id or asset_name.")

    try:
        resolved_asset = asset_name
        resolved_item_id = item_id
        if not resolved_item_id and resolved_asset:
            resolved = adapter.resolve_item(resolved_asset)
            resolved_item_id = str(resolved["item_id"])
        assert resolved_item_id
        attributes = adapter.get_item_attributes(resolved_item_id, asset_name=resolved_asset)
        if timeseries_only:
            attributes = [
                attribute
                for attribute in attributes
                if attribute.is_timeseries_data_source or attribute.has_timeseries_reference
            ]
        return ItemAttributesResponse(
            item_id=resolved_item_id,
            asset_name=resolved_asset,
            attributes=attributes,
        )
    except UnknownAssetError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except WorkspaceUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ProfilingAdapterError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/timeseries", response_model=TimeSeriesResponse)
def get_timeseries(
    asset_name: str = Query(..., min_length=2),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    window: str = Query(default="auto"),
    from_categories: list[str] | None = Query(default=None),
    from_attributes: list[str] | None = Query(default=None),
    adapter: ProfilingAdapter = Depends(get_profiling_adapter),
) -> TimeSeriesResponse:
    safe_start, safe_end = _default_date_window(start_date, end_date)
    requested_window = str(window or "").strip().lower() or "auto"
    effective_window = _resolve_effective_window(requested_window, safe_start, safe_end)

    try:
        series = adapter.get_timeseries(
            asset_name=asset_name,
            start_date=safe_start.isoformat(),
            end_date=safe_end.isoformat(),
            window=effective_window,
            from_categories=from_categories or [],
            from_attributes=from_attributes or [],
        )
    except UnknownAssetError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except WorkspaceUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ProfilingAdapterError as exc:
        message = str(exc)
        if "from_attributes or from_categories is required" in message:
            raise HTTPException(status_code=422, detail=message) from exc
        raise HTTPException(status_code=400, detail=message) from exc

    return TimeSeriesResponse(
        asset_name=asset_name,
        start_date=safe_start,
        end_date=safe_end,
        window=requested_window,
        effective_window=effective_window,
        series=series,
    )


@router.get("/timeseries-from-attribute", response_model=TimeSeriesResponse)
def get_timeseries_from_attribute(
    item_id: str | None = Query(default=None),
    asset_name: str | None = Query(default=None),
    attribute_id: str | None = Query(default=None),
    attribute_name: str | None = Query(default=None),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    window: str = Query(default="auto"),
    adapter: ProfilingAdapter = Depends(get_profiling_adapter),
) -> TimeSeriesResponse:
    if not item_id and not asset_name:
        raise HTTPException(status_code=422, detail="Provide item_id or asset_name.")
    if not attribute_id and not attribute_name:
        raise HTTPException(status_code=422, detail="Provide attribute_id or attribute_name.")

    safe_start, safe_end = _default_date_window(start_date, end_date)
    requested_window = str(window or "").strip().lower() or "auto"
    effective_window = _resolve_effective_window(requested_window, safe_start, safe_end)

    try:
        resolved_asset = asset_name or ""
        resolved_item_id = item_id
        if not resolved_item_id and asset_name:
            resolved = adapter.resolve_item(asset_name)
            resolved_item_id = str(resolved["item_id"])
            resolved_asset = str(resolved.get("item_name") or asset_name)
        assert resolved_item_id

        series = adapter.get_timeseries_from_attribute(
            item_id=resolved_item_id,
            start_date=safe_start.isoformat(),
            end_date=safe_end.isoformat(),
            window=effective_window,
            attribute_id=attribute_id,
            attribute_name=attribute_name,
        )
    except UnknownAssetError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except WorkspaceUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ProfilingAdapterError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    response_asset = resolved_asset or asset_name or resolved_item_id
    return TimeSeriesResponse(
        asset_name=response_asset,
        start_date=safe_start,
        end_date=safe_end,
        window=requested_window,
        effective_window=effective_window,
        series=series,
    )


@router.get("/timeseries-batch", response_model=TimeSeriesBatchResponse)
def get_timeseries_batch(
    tags: str = Query(..., min_length=2),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    window: str = Query(default="auto"),
    adapter: ProfilingAdapter = Depends(get_profiling_adapter),
) -> TimeSeriesBatchResponse:
    safe_start, safe_end = _default_date_window(start_date, end_date)
    requested_window = str(window or "").strip().lower() or "auto"
    effective_window = _resolve_effective_window(requested_window, safe_start, safe_end)

    try:
        parsed_tags = json.loads(tags)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=422, detail=f"Invalid tags JSON payload: {exc}") from exc

    if not isinstance(parsed_tags, list) or len(parsed_tags) == 0:
        raise HTTPException(status_code=422, detail="Provide a non-empty tags JSON array.")

    resolved_tags: list[TimeSeriesBatchTag] = []
    warnings: list[str] = []
    pending_requests: list[dict[str, str | None]] = []

    for index, entry in enumerate(parsed_tags, start=1):
        if not isinstance(entry, dict):
            warnings.append(f"Tag index {index}: invalid payload (expected object).")
            continue
        item_id = str(entry.get("item_id") or entry.get("itemId") or "").strip()
        asset_name = str(entry.get("asset_name") or entry.get("assetName") or "").strip()
        attribute_id = str(entry.get("attribute_id") or entry.get("attributeId") or "").strip() or None
        attribute_name = (
            str(entry.get("attribute_name") or entry.get("attributeName") or "").strip() or None
        )
        label = str(entry.get("label") or attribute_name or attribute_id or f"tag-{index}").strip()
        tag_key = str(entry.get("tag_key") or entry.get("tagKey") or "").strip()
        if not tag_key:
            tag_key = f"{item_id}::{attribute_id or (attribute_name or '').lower()}"

        if not item_id or (not attribute_id and not attribute_name):
            warnings.append(f"Tag index {index}: missing item_id and attribute target.")
            resolved_tags.append(
                TimeSeriesBatchTag(
                    tag_key=tag_key or f"invalid-{index}",
                    asset_name=asset_name,
                    item_id=item_id,
                    attribute_id=attribute_id,
                    attribute_name=attribute_name,
                    label=label,
                    error="Invalid tag payload: item_id and attribute_id/attribute_name are required.",
                )
            )
            continue

        pending_requests.append(
            {
                "tag_key": tag_key,
                "asset_name": asset_name,
                "item_id": item_id,
                "attribute_id": attribute_id,
                "attribute_name": attribute_name,
                "label": label,
                "request_key": _batch_tag_request_key(
                    item_id=item_id,
                    attribute_id=attribute_id,
                    attribute_name=attribute_name,
                ),
            }
        )

    fetch_results: dict[str, tuple[list, str | None]] = {}
    for request in pending_requests:
        request_key = str(request["request_key"] or "")
        if request_key in fetch_results:
            continue

        try:
            series = adapter.get_timeseries_from_attribute(
                item_id=str(request["item_id"] or ""),
                start_date=safe_start.isoformat(),
                end_date=safe_end.isoformat(),
                window=effective_window,
                attribute_id=str(request["attribute_id"] or "") or None,
                attribute_name=str(request["attribute_name"] or "") or None,
            )
            fetch_results[request_key] = (series, None)
        except (UnknownAssetError, WorkspaceUnavailableError, ProfilingAdapterError) as exc:
            fetch_results[request_key] = ([], str(exc))

    for request in pending_requests:
        request_key = str(request["request_key"] or "")
        series, error = fetch_results.get(request_key, ([], "Unable to resolve tag request."))
        resolved_tags.append(
            TimeSeriesBatchTag(
                tag_key=str(request["tag_key"] or ""),
                asset_name=str(request["asset_name"] or ""),
                item_id=str(request["item_id"] or ""),
                attribute_id=str(request["attribute_id"] or "") or None,
                attribute_name=str(request["attribute_name"] or "") or None,
                label=str(request["label"] or ""),
                series=series if error is None else [],
                error=error,
            )
        )

    return TimeSeriesBatchResponse(
        start_date=safe_start,
        end_date=safe_end,
        window=requested_window,
        effective_window=effective_window,
        tags=resolved_tags,
        warnings=warnings,
    )


@router.get("/equipment-sensors", response_model=EquipmentSensorsResponse)
def get_equipment_sensors(
    item_id: str | None = Query(default=None),
    asset_name: str | None = Query(default=None),
    adapter: ProfilingAdapter = Depends(get_profiling_adapter),
) -> EquipmentSensorsResponse:
    if not item_id and not asset_name:
        raise HTTPException(status_code=422, detail="Provide item_id or asset_name.")

    try:
        resolved_item_id = item_id
        resolved_asset_name = asset_name
        if not resolved_item_id and asset_name:
            resolved = adapter.resolve_item(asset_name)
            resolved_item_id = str(resolved["item_id"])
            resolved_asset_name = str(resolved.get("item_name") or asset_name)
        assert resolved_item_id
        if not resolved_asset_name:
            resolved_asset_name = resolved_item_id

        categories, sensors = adapter.get_equipment_sensors(resolved_item_id, resolved_asset_name)
        return EquipmentSensorsResponse(
            item_id=resolved_item_id,
            asset_name=resolved_asset_name,
            total_sensors=len(sensors),
            categories=categories,
            sensors=sensors,
        )
    except UnknownAssetError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except WorkspaceUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ProfilingAdapterError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/intel-events", response_model=IntelEventsResponse)
def get_intel_events(
    item_id: str | None = Query(default=None),
    include_descendants: bool = Query(default=True),
    status: str | None = Query(default=None),
    adapter: ProfilingAdapter = Depends(get_profiling_adapter),
) -> IntelEventsResponse:
    try:
        events, status_options = adapter.get_intel_events(
            item_id=item_id,
            include_descendants=include_descendants,
            status=status,
        )
    except UnknownAssetError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except WorkspaceUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ProfilingAdapterError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return IntelEventsResponse(
        item_id=item_id,
        include_descendants=include_descendants,
        status_filter=status,
        total=len(events),
        status_options=status_options,
        events=[IntelEventCard(**event) for event in events],
    )
