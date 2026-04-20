from __future__ import annotations

import ast
import hashlib
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from threading import Thread
from threading import Lock
import time
from typing import Any

import pandas as pd

from backend.app.config import get_settings
from backend.app.models.charts import (
    EquipmentSensor,
    EquipmentSensorCategory,
    EquipmentTreeNode,
    ItemAttribute,
    Series,
    SeriesPoint,
)
from backend.app.services.workspace_client import WorkspaceClientError, create_workspace_client

try:
    from workspace_api.profiling2.core import ProfilingV1
except Exception:  # pragma: no cover - optional dependency at runtime
    ProfilingV1 = None


class ProfilingAdapterError(RuntimeError):
    """Base exception for profiling adapter failures."""


class UnknownAssetError(ProfilingAdapterError):
    """Raised when an asset cannot be resolved in Workspace API."""


class WorkspaceUnavailableError(ProfilingAdapterError):
    """Raised when Workspace dependencies/credentials are unavailable."""


class _FallbackViews:
    """Minimal views object expected by ProfilingV1 constructor."""

    def __init__(self, _: Any) -> None:
        self._context = _


class ProfilingAdapter:
    _equipment_tree_cache_lock: Lock = Lock()
    _equipment_tree_cache: dict[str, tuple[list[str], list[EquipmentTreeNode]]] = {}
    _equipment_tree_refreshing_keys: set[str] = set()
    _attribute_cache_lock: Lock = Lock()
    _attribute_cache: dict[str, tuple[float, list[ItemAttribute]]] = {}
    _equipment_sensor_cache_lock: Lock = Lock()
    _equipment_sensor_cache: dict[
        str, tuple[float, tuple[list[EquipmentSensorCategory], list[EquipmentSensor]]]
    ] = {}
    _intel_events_cache_lock: Lock = Lock()
    _intel_events_cache: dict[str, tuple[float, list[dict[str, Any]]]] = {}
    _attribute_cache_ttl_seconds: int = 300
    _equipment_sensor_cache_ttl_seconds: int = 300
    _intel_events_cache_ttl_seconds: int = 300

    def __init__(self, workspace: Any | None = None) -> None:
        self._workspace = workspace

    @property
    def workspace(self) -> Any:
        if self._workspace is not None:
            return self._workspace
        try:
            self._workspace = create_workspace_client()
            return self._workspace
        except WorkspaceClientError as exc:
            raise WorkspaceUnavailableError(str(exc)) from exc

    def _build_profile(self, asset_name: str) -> Any:
        if ProfilingV1 is None:
            raise WorkspaceUnavailableError(
                "workspace_api.profiling2 is not available in this Python environment."
            )

        try:
            return ProfilingV1(asset_name=asset_name, wsp=self.workspace, views=_FallbackViews)
        except TypeError:
            return ProfilingV1(asset_name, self.workspace, _FallbackViews)

    @staticmethod
    def _is_unknown_asset_error(exc: Exception) -> bool:
        text = str(exc).lower()
        return "not found" in text and "asset" in text

    @staticmethod
    def _normalize_categories(value: Any) -> list[str]:
        if value is None:
            return []
        if isinstance(value, list):
            out: list[str] = []
            for item in value:
                if isinstance(item, dict) and "name" in item:
                    out.append(str(item["name"]))
                else:
                    out.append(str(item))
            return out
        return [str(value)]

    @staticmethod
    def _is_timeseries_data_source(value: Any) -> bool:
        if value is None:
            return False
        normalized = str(value).strip().lower().replace(" ", "")
        return normalized in {"timeseries", "time_series"}

    @classmethod
    def _extract_tree_root_nodes(cls, raw_tree: Any) -> list[dict[str, Any]]:
        if raw_tree is None:
            return []
        if isinstance(raw_tree, list):
            return [node for node in raw_tree if isinstance(node, dict)]
        if isinstance(raw_tree, dict):
            for key in ("items", "tree"):
                value = raw_tree.get(key)
                if isinstance(value, list):
                    return [node for node in value if isinstance(node, dict)]

            # Some wrappers may nest payload under generic keys.
            for key in ("data", "result", "results", "payload"):
                value = raw_tree.get(key)
                extracted = cls._extract_tree_root_nodes(value)
                if extracted:
                    return extracted

            # If this is already a node-shaped dict, treat it as single root.
            if "id" in raw_tree and ("children" in raw_tree or "name" in raw_tree):
                return [raw_tree]
        return []

    @staticmethod
    def _workspace_tree_cache_key() -> str:
        settings = get_settings()
        identifier = settings.workspace_id.strip() or str(settings.workspace_number)
        return f"{settings.workspace_base_url.strip()}|{identifier}"

    @classmethod
    def _workspace_scoped_cache_key(cls, suffix: str) -> str:
        return f"{cls._workspace_tree_cache_key()}|{suffix}"

    @staticmethod
    def _is_cache_entry_fresh(cached_at: float, ttl_seconds: int) -> bool:
        return (time.monotonic() - cached_at) <= ttl_seconds

    @staticmethod
    def _clone_attributes(attributes: list[ItemAttribute]) -> list[ItemAttribute]:
        return [attribute.model_copy(deep=True) for attribute in attributes]

    @staticmethod
    def _clone_sensor_payload(
        payload: tuple[list[EquipmentSensorCategory], list[EquipmentSensor]]
    ) -> tuple[list[EquipmentSensorCategory], list[EquipmentSensor]]:
        categories, sensors = payload
        return (
            [category.model_copy(deep=True) for category in categories],
            [sensor.model_copy(deep=True) for sensor in sensors],
        )

    @staticmethod
    def _parse_json_like(value: Any) -> dict[str, Any]:
        if isinstance(value, dict):
            return dict(value)
        if value is None:
            return {}
        if isinstance(value, str):
            text = value.strip()
            if not text:
                return {}
            try:
                parsed = json.loads(text)
                if isinstance(parsed, dict):
                    return parsed
            except Exception:
                pass
            try:
                parsed = ast.literal_eval(text)
                if isinstance(parsed, dict):
                    return parsed
            except Exception:
                return {}
        return {}

    @staticmethod
    def _is_missing_value(value: Any) -> bool:
        if value is None:
            return True
        try:
            if pd.isna(value):
                return True
        except Exception:
            pass
        if isinstance(value, str):
            normalized = value.strip().lower()
            return normalized in {"", "nan", "none", "null", "nat", "<na>"}
        return False

    @classmethod
    def _string_or_none(cls, value: Any) -> str | None:
        if cls._is_missing_value(value):
            return None
        text = str(value).strip()
        return text or None

    @classmethod
    def _extract_event_data_field(
        cls,
        row: dict[str, Any],
        data_payload: dict[str, Any],
        field: str,
    ) -> Any:
        # Workspace events can arrive flattened (data.<field>) or nested (data[field]).
        flat_value = row.get(f"data.{field}")
        if not cls._is_missing_value(flat_value):
            return flat_value

        nested_value = data_payload.get(field)
        if not cls._is_missing_value(nested_value):
            return nested_value

        top_level_value = row.get(field)
        if not cls._is_missing_value(top_level_value):
            return top_level_value

        return None

    @staticmethod
    def _parse_datetime(value: Any) -> datetime | None:
        if value is None:
            return None
        if isinstance(value, datetime):
            return value if value.tzinfo is None else value.astimezone(timezone.utc).replace(tzinfo=None)
        if isinstance(value, pd.Timestamp):
            dt = value.to_pydatetime()
            return dt if dt.tzinfo is None else dt.astimezone(timezone.utc).replace(tzinfo=None)
        try:
            parsed = pd.to_datetime(value, errors="coerce", utc=True)
        except Exception:
            parsed = None
        if parsed is None or pd.isna(parsed):
            return None
        if isinstance(parsed, pd.Timestamp):
            return parsed.to_pydatetime().replace(tzinfo=None)
        if isinstance(parsed, datetime):
            return parsed.replace(tzinfo=None)
        return None

    @classmethod
    def _normalize_event_attribute_names(cls, value: Any) -> list[str]:
        if value is None:
            return []

        parsed_list: list[Any] = []
        if isinstance(value, list):
            parsed_list = value
        elif isinstance(value, str):
            text = value.strip()
            if not text:
                return []
            try:
                decoded = json.loads(text)
                if isinstance(decoded, list):
                    parsed_list = decoded
                elif isinstance(decoded, str):
                    parsed_list = [decoded]
            except Exception:
                try:
                    decoded = ast.literal_eval(text)
                    if isinstance(decoded, list):
                        parsed_list = decoded
                    elif isinstance(decoded, str):
                        parsed_list = [decoded]
                except Exception:
                    parsed_list = [entry for entry in text.split(",")]
        else:
            parsed_list = [value]

        names: list[str] = []
        for entry in parsed_list:
            text = cls._string_or_none(entry)
            if text:
                names.append(text)
        # Preserve order while removing duplicates.
        return list(dict.fromkeys(names))

    @classmethod
    def _normalize_intel_event_row(
        cls,
        row: dict[str, Any],
        node_name_by_id: dict[str, str],
    ) -> dict[str, Any] | None:
        data_payload = cls._parse_json_like(row.get("data"))

        row_item_id = cls._string_or_none(row.get("item_id"))
        data_item_id = cls._string_or_none(
            cls._extract_event_data_field(row, data_payload, "item_id")
        )
        item_id = row_item_id or data_item_id
        if not item_id:
            return None

        event_name = (
            cls._string_or_none(row.get("name"))
            or cls._string_or_none(cls._extract_event_data_field(row, data_payload, "name"))
            or "Unnamed event"
        )
        event_id = (
            cls._string_or_none(row.get("id"))
            or f"{item_id}:{event_name}:{cls._string_or_none(row.get('start_date')) or ''}"
        )

        status = cls._string_or_none(cls._extract_event_data_field(row, data_payload, "status"))
        severity = cls._string_or_none(cls._extract_event_data_field(row, data_payload, "severity"))
        event_type = cls._string_or_none(
            cls._extract_event_data_field(row, data_payload, "event_type")
        )
        description = cls._string_or_none(
            cls._extract_event_data_field(row, data_payload, "description")
        )
        prognosis = cls._string_or_none(
            cls._extract_event_data_field(row, data_payload, "prognosis")
        )
        asset_name = (
            cls._string_or_none(row.get("asset_name"))
            or cls._string_or_none(row.get("item_name"))
            or node_name_by_id.get(item_id)
        )

        start_date = cls._parse_datetime(
            cls._extract_event_data_field(row, data_payload, "start_date")
        )
        end_date = cls._parse_datetime(cls._extract_event_data_field(row, data_payload, "end_date"))
        trend_display_start_date = cls._parse_datetime(
            cls._extract_event_data_field(row, data_payload, "trend_display_start_date")
        )
        event_timeseries_attributes = cls._normalize_event_attribute_names(
            cls._extract_event_data_field(row, data_payload, "event_timeseries_attributes")
        )

        warnings: list[str] = []
        if not start_date:
            warnings.append("Missing start_date")
        if not status:
            warnings.append("Missing data.status")
        if not severity:
            warnings.append("Missing data.severity")
        if not description:
            warnings.append("Missing data.description")
        if not prognosis:
            warnings.append("Missing data.prognosis")
        if not trend_display_start_date:
            warnings.append("Missing data.trend_display_start_date")

        return {
            "event_id": event_id,
            "item_id": item_id,
            "asset_name": asset_name,
            "name": event_name,
            "event_type": event_type,
            "status": status,
            "severity": severity,
            "start_date": start_date,
            "end_date": end_date,
            "trend_display_start_date": trend_display_start_date,
            "description": description,
            "prognosis": prognosis,
            "event_timeseries_attributes": event_timeseries_attributes,
            "warnings": warnings,
        }

    @staticmethod
    def _to_lean_tree_nodes(nodes: list[EquipmentTreeNode]) -> list[EquipmentTreeNode]:
        return [
            EquipmentTreeNode.model_construct(
                id=node.id,
                name=node.name,
                parent_id=node.parent_id,
                has_children=node.has_children,
                depth=node.depth,
                path_ids=list(node.path_ids),
                path_names=[],
                external_id=None,
            )
            for node in nodes
        ]

    @classmethod
    def _tree_cache_file_path(cls, cache_key: str) -> Path:
        token = hashlib.sha1(cache_key.encode("utf-8")).hexdigest()[:12]
        root = Path(__file__).resolve().parents[2] / ".cache"
        root.mkdir(parents=True, exist_ok=True)
        return root / f"equipment_tree_{token}.json"

    @classmethod
    def _load_tree_from_disk(cls, cache_key: str) -> tuple[list[str], list[EquipmentTreeNode]] | None:
        cache_path = cls._tree_cache_file_path(cache_key)
        if not cache_path.exists():
            return None
        try:
            payload = json.loads(cache_path.read_text(encoding="utf-8"))
            roots = [
                str(entry)
                for entry in payload.get("roots", [])
                if str(entry or "").strip()
            ]
            raw_nodes = payload.get("nodes", [])
            if not isinstance(raw_nodes, list):
                return None
            nodes = [
                EquipmentTreeNode.model_construct(**raw_node)
                for raw_node in raw_nodes
                if isinstance(raw_node, dict)
            ]
            if not nodes:
                return None
            return roots, nodes
        except Exception:
            return None

    @classmethod
    def _save_tree_to_disk(
        cls,
        cache_key: str,
        roots: list[str],
        nodes: list[EquipmentTreeNode],
    ) -> None:
        cache_path = cls._tree_cache_file_path(cache_key)
        payload = {
            "updated_at": pd.Timestamp.utcnow().isoformat(),
            "roots": roots,
            "nodes": [node.model_dump(mode="json") for node in nodes],
        }
        try:
            cache_path.write_text(json.dumps(payload, ensure_ascii=True), encoding="utf-8")
        except Exception:
            # Disk cache is an optimization only. Never fail the API because of it.
            return

    @classmethod
    def _fetch_tree_from_workspace(cls, workspace: Any) -> tuple[list[str], list[EquipmentTreeNode]]:
        raw_tree = workspace.get_item_tree()
        root_nodes = cls._extract_tree_root_nodes(raw_tree)
        if not root_nodes:
            return [], []

        roots: list[str] = []
        nodes: list[EquipmentTreeNode] = []
        seen_paths: set[tuple[str, ...]] = set()

        def walk(
            node: dict[str, Any],
            *,
            parent_id: str | None,
            depth: int,
            path_ids: list[str],
            path_names: list[str],
        ) -> None:
            node_id = str(node.get("id") or "").strip()
            if not node_id:
                return
            name = str(node.get("name") or node_id)
            next_path_ids = [*path_ids, node_id]
            path_key = tuple(next_path_ids)
            if path_key in seen_paths:
                return
            seen_paths.add(path_key)
            next_path_names = [*path_names, name]
            children = node.get("children") if isinstance(node.get("children"), list) else []

            if parent_id is None:
                roots.append(node_id)

            nodes.append(
                EquipmentTreeNode(
                    id=node_id,
                    name=name,
                    parent_id=parent_id,
                    external_id=str(node.get("external_id") or "") or None,
                    has_children=bool(children),
                    depth=depth,
                    path_ids=next_path_ids,
                    path_names=next_path_names,
                )
            )

            for child in children:
                if isinstance(child, dict):
                    walk(
                        child,
                        parent_id=node_id,
                        depth=depth + 1,
                        path_ids=next_path_ids,
                        path_names=next_path_names,
                    )

        for root in root_nodes:
            if isinstance(root, dict):
                walk(root, parent_id=None, depth=0, path_ids=[], path_names=[])

        return roots, nodes

    def _refresh_tree_cache_async(self, cache_key: str) -> None:
        with self._equipment_tree_cache_lock:
            if cache_key in self._equipment_tree_refreshing_keys:
                return
            self._equipment_tree_refreshing_keys.add(cache_key)

        def _refresh() -> None:
            try:
                workspace = self.workspace
                roots, nodes = self._fetch_tree_from_workspace(workspace)
                if nodes:
                    with self._equipment_tree_cache_lock:
                        self._equipment_tree_cache[cache_key] = (roots, nodes)
                    self._save_tree_to_disk(cache_key, roots, nodes)
            except Exception:
                return
            finally:
                with self._equipment_tree_cache_lock:
                    self._equipment_tree_refreshing_keys.discard(cache_key)

        Thread(target=_refresh, daemon=True).start()

    @staticmethod
    def _rebase_tree_subset(nodes: list[EquipmentTreeNode]) -> tuple[list[str], list[EquipmentTreeNode]]:
        if not nodes:
            return [], []

        clones = [node.model_copy(deep=True) for node in nodes]
        by_id: dict[str, EquipmentTreeNode] = {node.id: node for node in clones}
        original_order: dict[str, int] = {node.id: idx for idx, node in enumerate(clones)}

        for node in clones:
            if node.parent_id not in by_id:
                node.parent_id = None

        children_by_parent: dict[str | None, list[str]] = {}
        for node in clones:
            children_by_parent.setdefault(node.parent_id, []).append(node.id)

        for parent_id in list(children_by_parent.keys()):
            children_by_parent[parent_id].sort(key=lambda node_id: original_order[node_id])

        roots = children_by_parent.get(None, [])

        def walk(node_id: str, path_ids: list[str], path_names: list[str], depth: int) -> None:
            node = by_id[node_id]
            node.depth = depth
            node.path_ids = [*path_ids, node.id]
            node.path_names = [*path_names, node.name]
            child_ids = children_by_parent.get(node.id, [])
            node.has_children = len(child_ids) > 0
            for child_id in child_ids:
                walk(child_id, node.path_ids, node.path_names, depth + 1)

        for root_id in roots:
            walk(root_id, [], [], 0)

        normalized = sorted(clones, key=lambda node: original_order[node.id])
        return roots, normalized

    @classmethod
    def _filter_tree_to_ancestor(
        cls,
        nodes: list[EquipmentTreeNode],
        ancestor_id: str,
    ) -> tuple[list[str], list[EquipmentTreeNode]]:
        wanted = ancestor_id.strip()
        if not wanted:
            return [], []

        subset = [node for node in nodes if wanted in node.path_ids]
        if not subset:
            return [], []

        return cls._rebase_tree_subset(subset)

    def _search_asset_df(self, asset_name: str) -> pd.DataFrame:
        try:
            return self.workspace.search_item(asset_name)
        except Exception as exc:
            if self._is_unknown_asset_error(exc):
                raise UnknownAssetError(f"Asset '{asset_name}' not found.") from exc
            raise ProfilingAdapterError(f"Failed to search asset '{asset_name}': {exc}") from exc

    def search_assets(self, query: str, limit: int = 50) -> list[dict[str, str]]:
        safe_query = query.strip()
        safe_limit = max(1, min(int(limit), 50))
        needle = safe_query.casefold()
        seen: set[str] = set()
        results: list[dict[str, str]] = []

        try:
            _, nodes = self.get_equipment_tree()
        except ProfilingAdapterError:
            nodes = []

        for node in nodes:
            if needle and needle not in node.name.casefold():
                continue
            if node.id in seen:
                continue
            seen.add(node.id)
            results.append(
                {
                    "item_id": node.id,
                    "asset_name": node.name,
                }
            )

        if results:
            results.sort(key=lambda entry: entry["asset_name"].lower())
            return results[:safe_limit]

        try:
            frame = self.workspace.search_item(safe_query)
        except Exception as exc:
            message = str(exc).lower()
            if self._is_unknown_asset_error(exc) or "no items found" in message:
                return []
            raise ProfilingAdapterError(f"Failed to search assets for '{safe_query}': {exc}") from exc

        if frame is None or frame.empty:
            return []

        if "name" not in frame.columns or "id" not in frame.columns:
            return []

        names = frame["name"].astype(str)
        if safe_query:
            filtered = frame[names.str.contains(safe_query, case=False, na=False, regex=False)].copy()
        else:
            filtered = frame.copy()
        if filtered.empty:
            return []

        deduped = filtered.drop_duplicates(subset=["id"]).sort_values(by="name", ascending=True)
        capped = deduped.head(safe_limit)

        results: list[dict[str, str]] = []
        for _, row in capped.iterrows():
            results.append(
                {
                    "item_id": str(row.get("id", "")),
                    "asset_name": str(row.get("name", "")),
                }
            )
        return results

    def resolve_item(self, asset_name: str) -> dict[str, str | int]:
        df = self._search_asset_df(asset_name)
        if df is None or df.empty:
            raise UnknownAssetError(f"Asset '{asset_name}' not found.")

        exact = df[df["name"].astype(str).str.strip().str.lower() == asset_name.strip().lower()]
        row = exact.iloc[0] if not exact.empty else df.iloc[0]

        return {
            "asset_name": asset_name,
            "item_id": str(row["id"]),
            "item_name": str(row.get("name", asset_name)),
            "matches": int(len(df)),
        }

    def get_item_id_from_asset_name(self, asset_name: str) -> str:
        return str(self.resolve_item(asset_name)["item_id"])

    def get_item_attributes(self, item_id: str, asset_name: str | None = None) -> list[ItemAttribute]:
        normalized_item_id = str(item_id or "").strip()
        cache_key = self._workspace_scoped_cache_key(f"item-attributes:{normalized_item_id}")
        with self._attribute_cache_lock:
            cached = self._attribute_cache.get(cache_key)
            if cached and self._is_cache_entry_fresh(
                cached_at=cached[0], ttl_seconds=self._attribute_cache_ttl_seconds
            ):
                return self._clone_attributes(cached[1])

        try:
            frame = self.workspace.get_item_attributes(normalized_item_id)
        except Exception as exc:
            label = asset_name or normalized_item_id
            raise ProfilingAdapterError(f"Failed to fetch attributes for '{label}': {exc}") from exc

        if frame is None or frame.empty:
            return []

        attributes: list[ItemAttribute] = []
        for _, row in frame.iterrows():
            reference = None
            if "reference" in frame.columns and pd.notna(row.get("reference")):
                reference = str(row.get("reference"))
            data_source = None
            if "data_source" in frame.columns and pd.notna(row.get("data_source")):
                data_source = str(row.get("data_source"))
            categories = self._normalize_categories(row.get("categories"))
            is_timeseries_data_source = self._is_timeseries_data_source(data_source)
            attributes.append(
                ItemAttribute(
                    id=str(row.get("id")),
                    name=str(row.get("name", "")),
                    reference=reference,
                    data_source=data_source,
                    categories=categories,
                    has_timeseries_reference=bool(reference),
                    is_timeseries_data_source=is_timeseries_data_source,
                )
            )
        with self._attribute_cache_lock:
            self._attribute_cache[cache_key] = (time.monotonic(), self._clone_attributes(attributes))
        return self._clone_attributes(attributes)

    def get_equipment_tree(
        self, ancestor_id: str | None = None, lean: bool = False
    ) -> tuple[list[str], list[EquipmentTreeNode]]:
        cache_key = self._workspace_tree_cache_key()

        with self._equipment_tree_cache_lock:
            cached = self._equipment_tree_cache.get(cache_key)

        if cached is None:
            disk_cached = self._load_tree_from_disk(cache_key)
            if disk_cached is not None:
                cached = disk_cached
                with self._equipment_tree_cache_lock:
                    self._equipment_tree_cache[cache_key] = cached
                # Return local data immediately, and refresh in background.
                self._refresh_tree_cache_async(cache_key)
            else:
                try:
                    roots, nodes = self._fetch_tree_from_workspace(self.workspace)
                except Exception as exc:
                    raise ProfilingAdapterError(f"Failed to fetch equipment tree: {exc}") from exc
                cached = (roots, nodes)
                with self._equipment_tree_cache_lock:
                    self._equipment_tree_cache[cache_key] = cached
                if nodes:
                    self._save_tree_to_disk(cache_key, roots, nodes)

        roots, nodes = cached
        if ancestor_id:
            return self._filter_tree_to_ancestor(nodes, ancestor_id)

        # Lighthouse phase scope: keep navigation under the MODEC root by default.
        modec_root = next(
            (
                node
                for node in nodes
                if node.parent_id is None and node.name.strip().lower() == "modec do brasil"
            ),
            None,
        )
        if modec_root:
            roots, nodes = self._filter_tree_to_ancestor(nodes, modec_root.id)

        if lean:
            return roots, self._to_lean_tree_nodes(nodes)
        return roots, nodes

    def _fetch_all_intel_events(self) -> list[dict[str, Any]]:
        if not hasattr(self.workspace, "get_all_events"):
            raise ProfilingAdapterError(
                "Workspace client does not support get_all_events(type='Shape Intel')."
            )

        try:
            raw_events = self.workspace.get_all_events(type="Shape Intel")
        except Exception as exc:
            raise ProfilingAdapterError(f"Failed to fetch Shape Intel events: {exc}") from exc

        if isinstance(raw_events, pd.DataFrame):
            frame = raw_events.copy()
        elif isinstance(raw_events, list):
            frame = pd.DataFrame(raw_events)
        elif isinstance(raw_events, dict):
            frame = pd.DataFrame(raw_events.get("events") or raw_events.get("data") or [])
        else:
            frame = pd.DataFrame()

        if frame.empty:
            return []

        _, nodes = self.get_equipment_tree()
        node_name_by_id = {node.id: node.name for node in nodes}

        normalized: list[dict[str, Any]] = []
        for _, series in frame.iterrows():
            row = series.to_dict()
            entry = self._normalize_intel_event_row(row, node_name_by_id=node_name_by_id)
            if entry is not None:
                normalized.append(entry)
        return normalized

    def _get_cached_intel_events(self) -> list[dict[str, Any]]:
        cache_key = self._workspace_scoped_cache_key("intel-events")
        with self._intel_events_cache_lock:
            cached = self._intel_events_cache.get(cache_key)
            if cached and self._is_cache_entry_fresh(
                cached_at=cached[0], ttl_seconds=self._intel_events_cache_ttl_seconds
            ):
                return [dict(entry) for entry in cached[1]]

        events = self._fetch_all_intel_events()
        with self._intel_events_cache_lock:
            self._intel_events_cache[cache_key] = (time.monotonic(), [dict(entry) for entry in events])
        return events

    def _collect_descendant_item_ids(self, item_id: str) -> set[str]:
        target = str(item_id or "").strip()
        if not target:
            return set()
        _, nodes = self.get_equipment_tree()
        descendants = {node.id for node in nodes if target in node.path_ids}
        descendants.add(target)
        return descendants

    def get_intel_events(
        self,
        *,
        item_id: str | None = None,
        include_descendants: bool = True,
        status: str | None = None,
    ) -> tuple[list[dict[str, Any]], list[str]]:
        events = self._get_cached_intel_events()
        scoped = list(events)

        normalized_item_id = str(item_id or "").strip()
        if normalized_item_id:
            if include_descendants:
                allowed_ids = self._collect_descendant_item_ids(normalized_item_id)
            else:
                allowed_ids = {normalized_item_id}
            scoped = [entry for entry in scoped if str(entry.get("item_id") or "") in allowed_ids]

        status_options = sorted(
            {
                str(entry.get("status")).strip()
                for entry in scoped
                if str(entry.get("status") or "").strip()
            },
            key=lambda value: value.lower(),
        )

        normalized_status = str(status or "").strip().lower()
        if normalized_status:
            scoped = [
                entry
                for entry in scoped
                if str(entry.get("status") or "").strip().lower() == normalized_status
            ]

        def _sort_key(entry: dict[str, Any]) -> datetime:
            start = entry.get("start_date")
            if isinstance(start, datetime):
                return start
            parsed = self._parse_datetime(start)
            if parsed:
                return parsed
            return datetime(1970, 1, 1)

        scoped.sort(key=_sort_key, reverse=True)
        return scoped, status_options

    def get_equipment_sensors(self, item_id: str, asset_name: str) -> tuple[list[EquipmentSensorCategory], list[EquipmentSensor]]:
        normalized_item_id = str(item_id or "").strip()
        cache_key = self._workspace_scoped_cache_key(f"equipment-sensors:{normalized_item_id}")
        with self._equipment_sensor_cache_lock:
            cached = self._equipment_sensor_cache.get(cache_key)
            if cached and self._is_cache_entry_fresh(
                cached_at=cached[0], ttl_seconds=self._equipment_sensor_cache_ttl_seconds
            ):
                return self._clone_sensor_payload(cached[1])

        attributes = self.get_item_attributes(normalized_item_id, asset_name=asset_name)
        if not attributes:
            return [], []

        sensor_by_key: dict[str, EquipmentSensor] = {}
        category_map: dict[str, list[EquipmentSensor]] = {}

        for attribute in attributes:
            if not attribute.is_timeseries_data_source:
                continue

            attribute_id = str(attribute.id or "").strip()
            attribute_name = str(attribute.name or "").strip()
            if not attribute_id or not attribute_name:
                continue

            reference = str(attribute.reference or "").strip() or None
            label_suffix = f" [{reference}]" if reference else ""
            raw_categories = self._normalize_categories(attribute.categories)
            categories = [
                category.strip()
                for category in raw_categories
                if category
                and category.strip().lower()
                not in {"hidden", "uncategorized", "calculated variables"}
            ]
            if not categories:
                continue
            key = f"{normalized_item_id}::{attribute_id}"

            existing = sensor_by_key.get(key)
            if existing is None:
                existing = EquipmentSensor(
                    key=key,
                    item_id=normalized_item_id,
                    asset_name=asset_name,
                    attribute_id=attribute_id,
                    attribute_name=attribute_name,
                    label=f"{attribute_name}{label_suffix}",
                    reference=reference,
                    categories=[],
                    is_timeseries_data_source=bool(attribute.is_timeseries_data_source),
                )
                sensor_by_key[key] = existing

            merged_categories = set(existing.categories)
            merged_categories.update(categories)
            existing.categories = sorted(merged_categories)

            for category in categories:
                category_name = category.strip() or "Uncategorized"
                category_bucket = category_map.setdefault(category_name, [])
                if all(sensor.key != existing.key for sensor in category_bucket):
                    category_bucket.append(existing)

        categories: list[EquipmentSensorCategory] = []
        for category_name in sorted(category_map.keys(), key=lambda value: value.lower()):
            sensors = sorted(category_map[category_name], key=lambda sensor: sensor.label.lower())
            categories.append(EquipmentSensorCategory(category=category_name, sensors=sensors))

        sensors = sorted(sensor_by_key.values(), key=lambda sensor: sensor.label.lower())
        payload = (categories, sensors)
        with self._equipment_sensor_cache_lock:
            self._equipment_sensor_cache[cache_key] = (time.monotonic(), self._clone_sensor_payload(payload))
        return self._clone_sensor_payload(payload)

    def list_chartable_attributes(self, asset_name: str) -> list[str]:
        item = self.resolve_item(asset_name)
        attrs = self.get_item_attributes(str(item["item_id"]), asset_name=asset_name)
        return sorted({a.name for a in attrs if a.has_timeseries_reference and a.name.strip()})

    def get_timeseries_from_attribute(
        self,
        item_id: str,
        *,
        start_date: str,
        end_date: str,
        window: str,
        attribute_id: str | None = None,
        attribute_name: str | None = None,
    ) -> list[Series]:
        attrs = self.get_item_attributes(item_id)
        if not attrs:
            raise ProfilingAdapterError(f"No attributes found for item_id '{item_id}'.")

        selected: ItemAttribute | None = None
        if attribute_id:
            selected = next((a for a in attrs if a.id == attribute_id), None)
        elif attribute_name:
            lowered = attribute_name.strip().lower()
            selected = next((a for a in attrs if a.name.strip().lower() == lowered), None)
            if selected is None:
                selected = next((a for a in attrs if lowered in a.name.strip().lower()), None)
        else:
            selected = next((a for a in attrs if a.has_timeseries_reference), None)

        if selected is None:
            raise ProfilingAdapterError(
                "Attribute not found. Provide a valid attribute_id or attribute_name from /item-attributes."
            )
        if not selected.reference:
            raise ProfilingAdapterError(
                f"Attribute '{selected.name}' does not have a timeseries reference."
            )

        try:
            frame = self.workspace.get_item_time_series(
                item_id=item_id,
                start_date=start_date,
                end_date=end_date,
                window=window,
                tags=[selected.reference],
                fill_func="PREV",
            )
            if selected.reference in frame.columns:
                frame = frame.rename(
                    columns={selected.reference: f"{selected.name} [{selected.reference}]"}
                )
            return self._normalize_timeseries(frame)
        except Exception as exc:
            raise ProfilingAdapterError(
                f"Failed to fetch timeseries for item '{item_id}' and attribute '{selected.name}': {exc}"
            ) from exc

    def get_timeseries(
        self,
        asset_name: str,
        start_date: str,
        end_date: str,
        window: str,
        from_categories: list[str] | None = None,
        from_attributes: list[str] | None = None,
    ) -> list[Series]:
        categories = from_categories or []
        attributes = from_attributes or []
        if not categories and not attributes:
            raise ProfilingAdapterError(
                "from_attributes or from_categories is required. "
                "Use /item-attributes to pick a valid sensor attribute first."
            )

        try:
            profile = self._build_profile(asset_name)
            frame = profile.get_time_series(
                start_date=start_date,
                end_date=end_date,
                window=window,
                from_categories=categories,
                from_attributes=attributes,
            )
            return self._normalize_timeseries(frame)
        except Exception as exc:
            if self._is_unknown_asset_error(exc):
                raise UnknownAssetError(f"Asset '{asset_name}' not found.") from exc
            raise ProfilingAdapterError(
                f"Failed to fetch timeseries for '{asset_name}': {exc}"
            ) from exc

    def resolve_asset(self, asset_name: str) -> dict[str, Any]:
        resolved = self.resolve_item(asset_name)
        try:
            profile = self._build_profile(asset_name)
            info = profile.get_item_info()
            if hasattr(info, "model_dump"):
                payload = info.model_dump()
            elif hasattr(info, "dict"):
                payload = info.dict()
            elif isinstance(info, dict):
                payload = info
            else:
                payload = {}
        except Exception:
            payload = {}

        payload.update(resolved)
        payload.setdefault("name", resolved["item_name"])
        return payload

    def _normalize_timeseries(self, frame: pd.DataFrame | None) -> list[Series]:
        if frame is None or frame.empty:
            return []

        data = frame.reset_index()
        timestamp_col = self._resolve_timestamp_column(data)
        timestamps = pd.to_datetime(data[timestamp_col], errors="coerce", utc=True)
        value_columns = [col for col in data.columns if col != timestamp_col]

        palette = [
            "#1f6feb",
            "#0ea5a5",
            "#e57a2f",
            "#bc4b3f",
            "#5f6b7a",
            "#2f9e44",
        ]

        series_list: list[Series] = []
        for index, column in enumerate(value_columns):
            numeric = pd.to_numeric(data[column], errors="coerce")
            points: list[SeriesPoint] = []
            for ts, value in zip(timestamps, numeric):
                if pd.isna(ts) or pd.isna(value):
                    continue
                points.append(
                    SeriesPoint(
                        timestamp=ts.to_pydatetime().replace(tzinfo=None),
                        value=float(value),
                    )
                )
            if not points:
                continue
            series_list.append(
                Series(
                    name=str(column),
                    color=palette[index % len(palette)],
                    points=points,
                )
            )
        return series_list

    @staticmethod
    def _resolve_timestamp_column(data: pd.DataFrame) -> str:
        preferred_names = ["timestamp", "time", "date", "datetime", "index"]
        lowered_lookup = {str(col).lower(): col for col in data.columns}
        for candidate in preferred_names:
            if candidate in lowered_lookup:
                return lowered_lookup[candidate]
        return data.columns[0]
