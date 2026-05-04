from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
APP_PATH = ROOT / "frontend" / "charts" / "app.js"
API_CLIENT_PATH = ROOT / "frontend" / "charts" / "services" / "api-client.js"
MODAL_PATH = ROOT / "frontend" / "charts" / "components" / "custom-alarm-modal.js"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_sensor_context_menu_exposes_create_custom_alarms_action() -> None:
    app_source = _read(APP_PATH)

    assert 'label: "Create custom alarms"' in app_source
    assert "await openCustomAlarmAuthoring(sensor, {" in app_source
    assert "actions.refreshCharts?.();" in app_source
    assert "setSidebarNotice(`Custom alarms saved for ${sensor.label}.`);" in app_source


def test_custom_alarm_modal_component_loads_and_saves_custom_values() -> None:
    modal_source = _read(MODAL_PATH)

    assert "export function openCustomAlarmModal" in modal_source
    assert 'modal.setAttribute("role", "dialog")' in modal_source
    assert 'modal.setAttribute("aria-label", "Create custom alarms")' in modal_source
    assert "<dt>Sensor</dt>" in modal_source
    assert "<dt>Attribute ID</dt>" in modal_source
    assert "<dt>Unit</dt>" in modal_source
    assert "<h4>Current threshold context</h4>" in modal_source
    assert "Custom-Hi" in modal_source
    assert "Custom-Lo" in modal_source
    assert "const payload = await getCustomAlarm(sensor.attributeId);" in modal_source
    assert "if (error instanceof ApiClientError && error.status === 404)" in modal_source
    assert "const saved = await putCustomAlarm(sensor.attributeId, {" in modal_source
    assert "setStatus(refs.status, \"Custom alarms saved.\", \"is-success\");" in modal_source


def test_api_client_exposes_custom_alarm_get_put_methods() -> None:
    api_source = _read(API_CLIENT_PATH)
    app_source = _read(APP_PATH)

    assert "export async function getCustomAlarm(attributeId)" in api_source
    assert "export async function putCustomAlarm(attributeId, payload = {})" in api_source
    assert "request(`/custom-alarms/${encodeURIComponent(safeAttributeId)}`)" in api_source
    assert "method: \"PUT\"," in api_source
    assert "custom_hi: customHi === null || customHi === undefined ? null : Number(customHi)," in api_source
    assert "custom_lo: customLo === null || customLo === undefined ? null : Number(customLo)," in api_source

    assert "getSensorContextBatch" in app_source
    assert 'import { openCustomAlarmModal } from "./components/custom-alarm-modal.js' in app_source
