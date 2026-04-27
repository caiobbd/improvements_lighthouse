from __future__ import annotations

import json
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
    last_week = today - timedelta(days=7)
    last_month = today - timedelta(days=30)
    mv_charts = [
        ChartDefinition(
            id="preset-modec-all-mv",
            title="ALL MV",
            asset_name="BAC",
            selected_tags=[
                ChartSelectedTag(
                    asset_name="BAC",
                    item_id="2e512cfd-609d-48df-bc87-573ce6c2ef48",
                    attribute_id="db97d308-41af-4d2f-afdf-f90959135940",
                    attribute_name="Flow - Fiscal Metering Sum",
                    label="Oil Production [MVBAC - SALES OIL COOLER & FISCAL METERING.Flow - Fiscal Metering Sum]",
                ),
                ChartSelectedTag(
                    asset_name="MV22",
                    item_id="cbb957fa-8805-495f-b806-bada44140f22",
                    attribute_id="598e6bef-1968-43bb-9068-8995a03372fa",
                    attribute_name="Flow - Fiscal Metering Sum",
                    label="Oil Production [MV22 - SALES OIL COOLER & FISCAL METERING.Flow - Fiscal Metering Sum]",
                ),
                ChartSelectedTag(
                    asset_name="MV23",
                    item_id="b6219540-8434-4191-8e7d-44339e41f637",
                    attribute_id="3917220f-ad41-4c60-9fe0-aff38631425f",
                    attribute_name="Flow - Fiscal Metering",
                    label="Oil Production [MV23 - SALES OIL COOLER & FISCAL METERING.Flow - Fiscal Metering]",
                ),
                ChartSelectedTag(
                    asset_name="MV24",
                    item_id="789ac6ec-8dc4-4d8f-877f-708a2647f6c9",
                    attribute_id="b56a98b4-2f5f-4e12-ab7f-a01ac8bb70de",
                    attribute_name="Flow - Fiscal Metering",
                    label="Oil Production [MV24 - SALES OIL COOLER & FISCAL METERING.Flow - Fiscal Metering]",
                ),
                ChartSelectedTag(
                    asset_name="MV26",
                    item_id="baeed2a4-334b-4bb4-8760-e16053f5492f",
                    attribute_id="0216ffa2-e526-4c3d-839f-3bf075047572",
                    attribute_name="Flow - Fiscal Metering",
                    label="Oil Production [MV26 - SALES OIL COOLER & FISCAL METERING.Flow - Fiscal Metering]",
                ),
                ChartSelectedTag(
                    asset_name="MV27",
                    item_id="c7a3c52c-a4e9-48a5-b075-8a1b79c37974",
                    attribute_id="2f49928c-b7e6-4967-9838-7626b245bad9",
                    attribute_name="Flow - Fiscal Metering",
                    label="Oil Production [MV27 - SALES OIL COOLER & FISCAL METERING.Flow - Fiscal Metering]",
                ),
                ChartSelectedTag(
                    asset_name="MV29",
                    item_id="add108c0-a15b-436e-911e-fd272549762b",
                    attribute_id="970f2efe-459b-4396-93c3-b7c21b9e7ad2",
                    attribute_name="Flow - Fiscal Metering",
                    label="Oil Production [MV29 - SALES OIL COOLER & FISCAL METERING.Flow - Fiscal Metering]",
                ),
                ChartSelectedTag(
                    asset_name="MV30",
                    item_id="cf6f235a-bf2c-4007-ad96-4b90374c2fc8",
                    attribute_id="5c7d6908-40a3-492e-9b5c-ff94fef419fa",
                    attribute_name="Flow - Fiscal Metering",
                    label="Oil Production [MV30 - SALES OIL COOLER & FISCAL METERING.Flow - Fiscal Metering]",
                ),
                ChartSelectedTag(
                    asset_name="MV31",
                    item_id="8cdee125-33f0-4eba-a86e-a9f20b743755",
                    attribute_id="fc0947fc-7c29-4b36-af19-b483a141c73e",
                    attribute_name="Flow - Fiscal Metering Sum",
                    label="Oil Production [MV31 - SALES OIL COOLER & FISCAL METERING.Flow - Fiscal Metering Sum]",
                ),
                ChartSelectedTag(
                    asset_name="MV32",
                    item_id="a7e2029a-fa17-4f84-b22d-0f586dfe7108",
                    attribute_id="c118158f-d4a3-4777-b43a-cc1694a43e81",
                    attribute_name="Flow - Fiscal Metering",
                    label="Oil Production [MV32 - SALES OIL COOLER & FISCAL METERING.Flow - Fiscal Metering]",
                ),
                ChartSelectedTag(
                    asset_name="MV33",
                    item_id="9c0da319-a5b5-4b59-ae66-547631c69b45",
                    attribute_id="7b5b0a2b-63ca-463b-b47e-e72a9b2cde1c",
                    attribute_name="Flow - Fiscal Metering",
                    label="Oil Production [MV33 - SALES OIL COOLER & FISCAL METERING.Flow - Fiscal Metering]",
                ),
            ],
        ),
        ChartDefinition(
            id="preset-modec-bac",
            title="Oil Production [MVBAC - SALES OIL COOLER & FISCAL METERING.Flow - Fiscal Metering Sum]",
            asset_name="BAC",
            selected_tags=[
                ChartSelectedTag(
                    asset_name="BAC",
                    item_id="2e512cfd-609d-48df-bc87-573ce6c2ef48",
                    attribute_id="db97d308-41af-4d2f-afdf-f90959135940",
                    attribute_name="Flow - Fiscal Metering Sum",
                    label="Oil Production [MVBAC - SALES OIL COOLER & FISCAL METERING.Flow - Fiscal Metering Sum]",
                ),
            ],
        ),
        ChartDefinition(
            id="preset-modec-mv22",
            title="Oil Production [MV22 - SALES OIL COOLER & FISCAL METERING.Flow - Fiscal Metering Sum]",
            asset_name="MV22",
            selected_tags=[
                ChartSelectedTag(
                    asset_name="MV22",
                    item_id="cbb957fa-8805-495f-b806-bada44140f22",
                    attribute_id="598e6bef-1968-43bb-9068-8995a03372fa",
                    attribute_name="Flow - Fiscal Metering Sum",
                    label="Oil Production [MV22 - SALES OIL COOLER & FISCAL METERING.Flow - Fiscal Metering Sum]",
                ),
            ],
        ),
        ChartDefinition(
            id="preset-modec-mv23",
            title="Oil Production [MV23 - SALES OIL COOLER & FISCAL METERING.Flow - Fiscal Metering]",
            asset_name="MV23",
            selected_tags=[
                ChartSelectedTag(
                    asset_name="MV23",
                    item_id="b6219540-8434-4191-8e7d-44339e41f637",
                    attribute_id="3917220f-ad41-4c60-9fe0-aff38631425f",
                    attribute_name="Flow - Fiscal Metering",
                    label="Oil Production [MV23 - SALES OIL COOLER & FISCAL METERING.Flow - Fiscal Metering]",
                ),
            ],
        ),
        ChartDefinition(
            id="preset-modec-mv24",
            title="Oil Production [MV24 - SALES OIL COOLER & FISCAL METERING.Flow - Fiscal Metering]",
            asset_name="MV24",
            selected_tags=[
                ChartSelectedTag(
                    asset_name="MV24",
                    item_id="789ac6ec-8dc4-4d8f-877f-708a2647f6c9",
                    attribute_id="b56a98b4-2f5f-4e12-ab7f-a01ac8bb70de",
                    attribute_name="Flow - Fiscal Metering",
                    label="Oil Production [MV24 - SALES OIL COOLER & FISCAL METERING.Flow - Fiscal Metering]",
                ),
            ],
        ),
        ChartDefinition(
            id="preset-modec-mv26",
            title="Oil Production [MV26 - SALES OIL COOLER & FISCAL METERING.Flow - Fiscal Metering]",
            asset_name="MV26",
            selected_tags=[
                ChartSelectedTag(
                    asset_name="MV26",
                    item_id="baeed2a4-334b-4bb4-8760-e16053f5492f",
                    attribute_id="0216ffa2-e526-4c3d-839f-3bf075047572",
                    attribute_name="Flow - Fiscal Metering",
                    label="Oil Production [MV26 - SALES OIL COOLER & FISCAL METERING.Flow - Fiscal Metering]",
                ),
            ],
        ),
        ChartDefinition(
            id="preset-modec-mv27",
            title="Oil Production [MV27 - SALES OIL COOLER & FISCAL METERING.Flow - Fiscal Metering]",
            asset_name="MV27",
            selected_tags=[
                ChartSelectedTag(
                    asset_name="MV27",
                    item_id="c7a3c52c-a4e9-48a5-b075-8a1b79c37974",
                    attribute_id="2f49928c-b7e6-4967-9838-7626b245bad9",
                    attribute_name="Flow - Fiscal Metering",
                    label="Oil Production [MV27 - SALES OIL COOLER & FISCAL METERING.Flow - Fiscal Metering]",
                ),
            ],
        ),
        ChartDefinition(
            id="preset-modec-mv29",
            title="Oil Production [MV29 - SALES OIL COOLER & FISCAL METERING.Flow - Fiscal Metering]",
            asset_name="MV29",
            selected_tags=[
                ChartSelectedTag(
                    asset_name="MV29",
                    item_id="add108c0-a15b-436e-911e-fd272549762b",
                    attribute_id="970f2efe-459b-4396-93c3-b7c21b9e7ad2",
                    attribute_name="Flow - Fiscal Metering",
                    label="Oil Production [MV29 - SALES OIL COOLER & FISCAL METERING.Flow - Fiscal Metering]",
                ),
            ],
        ),
        ChartDefinition(
            id="preset-modec-mv30",
            title="Oil Production [MV30 - SALES OIL COOLER & FISCAL METERING.Flow - Fiscal Metering]",
            asset_name="MV30",
            selected_tags=[
                ChartSelectedTag(
                    asset_name="MV30",
                    item_id="cf6f235a-bf2c-4007-ad96-4b90374c2fc8",
                    attribute_id="5c7d6908-40a3-492e-9b5c-ff94fef419fa",
                    attribute_name="Flow - Fiscal Metering",
                    label="Oil Production [MV30 - SALES OIL COOLER & FISCAL METERING.Flow - Fiscal Metering]",
                ),
            ],
        ),
        ChartDefinition(
            id="preset-modec-mv31",
            title="Oil Production [MV31 - SALES OIL COOLER & FISCAL METERING.Flow - Fiscal Metering Sum]",
            asset_name="MV31",
            selected_tags=[
                ChartSelectedTag(
                    asset_name="MV31",
                    item_id="8cdee125-33f0-4eba-a86e-a9f20b743755",
                    attribute_id="fc0947fc-7c29-4b36-af19-b483a141c73e",
                    attribute_name="Flow - Fiscal Metering Sum",
                    label="Oil Production [MV31 - SALES OIL COOLER & FISCAL METERING.Flow - Fiscal Metering Sum]",
                ),
            ],
        ),
        ChartDefinition(
            id="preset-modec-mv32",
            title="Oil Production [MV32 - SALES OIL COOLER & FISCAL METERING.Flow - Fiscal Metering]",
            asset_name="MV32",
            selected_tags=[
                ChartSelectedTag(
                    asset_name="MV32",
                    item_id="a7e2029a-fa17-4f84-b22d-0f586dfe7108",
                    attribute_id="c118158f-d4a3-4777-b43a-cc1694a43e81",
                    attribute_name="Flow - Fiscal Metering",
                    label="Oil Production [MV32 - SALES OIL COOLER & FISCAL METERING.Flow - Fiscal Metering]",
                ),
            ],
        ),
        ChartDefinition(
            id="preset-modec-mv33",
            title="Oil Production [MV33 - SALES OIL COOLER & FISCAL METERING.Flow - Fiscal Metering]",
            asset_name="MV33",
            selected_tags=[
                ChartSelectedTag(
                    asset_name="MV33",
                    item_id="9c0da319-a5b5-4b59-ae66-547631c69b45",
                    attribute_id="7b5b0a2b-63ca-463b-b47e-e72a9b2cde1c",
                    attribute_name="Flow - Fiscal Metering",
                    label="Oil Production [MV33 - SALES OIL COOLER & FISCAL METERING.Flow - Fiscal Metering]",
                ),
            ],
        ),
    ]

    mv_oil_water_page = ChartPage(
        id="preset-mv-oil-water",
        name="MODEC Oil Prod",
        is_preset=True,
        grid_columns=1,
        date_preset="7d",
        frequency_mode="manual",
        frequency_window="15m",
        start_date=last_week,
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
