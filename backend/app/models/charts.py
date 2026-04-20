from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "ok"
    message: str = "Service is healthy"
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class SeriesPoint(BaseModel):
    timestamp: datetime
    value: float


class Series(BaseModel):
    name: str
    color: str | None = None
    points: list[SeriesPoint] = Field(default_factory=list)


class TimeSeriesResponse(BaseModel):
    asset_name: str
    start_date: date
    end_date: date
    window: str
    effective_window: str | None = None
    series: list[Series] = Field(default_factory=list)
    source: str = "workspace-profiling"
    warnings: list[str] = Field(default_factory=list)


class ItemResolutionResponse(BaseModel):
    asset_name: str
    item_id: str
    item_name: str
    matches: int = 1


class ItemAttribute(BaseModel):
    id: str
    name: str
    reference: str | None = None
    data_source: str | None = None
    categories: list[str] = Field(default_factory=list)
    has_timeseries_reference: bool = False
    is_timeseries_data_source: bool = False


class ItemAttributesResponse(BaseModel):
    item_id: str
    asset_name: str | None = None
    attributes: list[ItemAttribute] = Field(default_factory=list)


class AssetSearchItem(BaseModel):
    item_id: str
    asset_name: str


class AssetSearchResponse(BaseModel):
    query: str
    limit: int
    total: int
    results: list[AssetSearchItem] = Field(default_factory=list)


class EquipmentTreeNode(BaseModel):
    id: str
    name: str
    parent_id: str | None = None
    external_id: str | None = None
    has_children: bool = False
    depth: int = 0
    path_ids: list[str] = Field(default_factory=list)
    path_names: list[str] = Field(default_factory=list)


class EquipmentTreeResponse(BaseModel):
    total: int = 0
    roots: list[str] = Field(default_factory=list)
    nodes: list[EquipmentTreeNode] = Field(default_factory=list)


class EquipmentSensor(BaseModel):
    key: str
    item_id: str
    asset_name: str
    attribute_id: str
    attribute_name: str
    label: str
    reference: str | None = None
    categories: list[str] = Field(default_factory=list)
    is_timeseries_data_source: bool = False


class EquipmentSensorCategory(BaseModel):
    category: str
    sensors: list[EquipmentSensor] = Field(default_factory=list)


class EquipmentSensorsResponse(BaseModel):
    item_id: str
    asset_name: str
    total_sensors: int = 0
    categories: list[EquipmentSensorCategory] = Field(default_factory=list)
    sensors: list[EquipmentSensor] = Field(default_factory=list)


class IntelEventCard(BaseModel):
    event_id: str
    item_id: str
    asset_name: str | None = None
    name: str
    event_type: str | None = None
    status: str | None = None
    severity: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    trend_display_start_date: datetime | None = None
    description: str | None = None
    prognosis: str | None = None
    event_timeseries_attributes: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class IntelEventsResponse(BaseModel):
    item_id: str | None = None
    include_descendants: bool = True
    status_filter: str | None = None
    total: int = 0
    status_options: list[str] = Field(default_factory=list)
    events: list[IntelEventCard] = Field(default_factory=list)
    source: str = "workspace-shape-intel"


class TimeSeriesBatchTag(BaseModel):
    tag_key: str
    asset_name: str
    item_id: str
    attribute_id: str | None = None
    attribute_name: str | None = None
    label: str
    series: list[Series] = Field(default_factory=list)
    error: str | None = None


class TimeSeriesBatchResponse(BaseModel):
    start_date: date
    end_date: date
    window: str
    effective_window: str
    tags: list[TimeSeriesBatchTag] = Field(default_factory=list)
    source: str = "workspace-profiling"
    warnings: list[str] = Field(default_factory=list)


class ChartSelectedTag(BaseModel):
    asset_name: str
    item_id: str
    attribute_id: str | None = None
    attribute_name: str | None = None
    label: str


class ChartDefinition(BaseModel):
    id: str
    title: str
    asset_name: str
    item_id: str | None = None
    attribute_id: str | None = None
    attribute_name: str | None = None
    from_categories: list[str] = Field(default_factory=list)
    from_attributes: list[str] = Field(default_factory=list)
    selected_tags: list[ChartSelectedTag] = Field(default_factory=list)


class ChartPage(BaseModel):
    id: str
    name: str
    is_preset: bool = False
    grid_columns: int = 2
    date_preset: str = "30d"
    frequency_mode: str = "auto"
    frequency_window: str = "6h"
    start_date: date | None = None
    end_date: date | None = None
    charts: list[ChartDefinition] = Field(default_factory=list)


class ChartPagesResponse(BaseModel):
    pages: list[ChartPage] = Field(default_factory=list)


class ApiError(BaseModel):
    detail: str
    code: str | None = None
