import * as apiClient from "../services/api-client.js";

const FALLBACK_API_BASE = "http://127.0.0.1:8001/api/v1/charts";

function buildApiClientError(message, status = 0, payload = null) {
  if (typeof apiClient.ApiClientError === "function") {
    return new apiClient.ApiClientError(message, status, payload);
  }
  const error = new Error(message);
  error.name = "ApiClientError";
  error.status = status;
  error.payload = payload;
  return error;
}

function resolveApiBaseUrl() {
  const configured = String(window.__LIGHTHOUSE_CONFIG__?.apiBaseUrl || "").trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  const stored = String(window.localStorage?.getItem("lighthouse.charts.apiBaseUrl") || "").trim();
  if (stored) {
    return stored.replace(/\/$/, "");
  }
  return FALLBACK_API_BASE;
}

async function requestCustomAlarm(path, options = {}) {
  const response = await fetch(`${resolveApiBaseUrl()}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const raw = await response.text();
  let payload = null;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.detail || `Request failed with status ${response.status}`;
    throw buildApiClientError(message, response.status, payload);
  }

  return payload;
}

async function fallbackGetCustomAlarm(attributeId) {
  const safeAttributeId = String(attributeId || "").trim();
  if (!safeAttributeId) {
    throw buildApiClientError("Attribute id is required to load custom alarm values.", 422);
  }
  return requestCustomAlarm(`/custom-alarms/${encodeURIComponent(safeAttributeId)}`);
}

async function fallbackPutCustomAlarm(attributeId, payload = {}) {
  const safeAttributeId = String(attributeId || "").trim();
  if (!safeAttributeId) {
    throw buildApiClientError("Attribute id is required to save custom alarm values.", 422);
  }
  const customHi = payload?.custom_hi;
  const customLo = payload?.custom_lo;
  const body = {
    custom_hi: customHi === null || customHi === undefined ? null : Number(customHi),
    custom_lo: customLo === null || customLo === undefined ? null : Number(customLo),
  };
  return requestCustomAlarm(`/custom-alarms/${encodeURIComponent(safeAttributeId)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

const ApiClientError = typeof apiClient.ApiClientError === "function" ? apiClient.ApiClientError : Error;
const getCustomAlarm =
  typeof apiClient.getCustomAlarm === "function" ? apiClient.getCustomAlarm : fallbackGetCustomAlarm;
const putCustomAlarm =
  typeof apiClient.putCustomAlarm === "function" ? apiClient.putCustomAlarm : fallbackPutCustomAlarm;

const THRESHOLD_CONTEXT_FIELDS = Object.freeze([
  Object.freeze({ key: "hihi", label: "HiHi" }),
  Object.freeze({ key: "hi", label: "Hi" }),
  Object.freeze({ key: "lo", label: "Lo" }),
  Object.freeze({ key: "lolo", label: "LoLo" }),
]);

function closeExistingModal() {
  const existing = document.querySelector('[data-component="custom-alarm-modal"]');
  if (existing) {
    existing.remove();
  }
}

function toFiniteNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeThresholds(value) {
  if (!value || typeof value !== "object") return {};
  return value;
}

function resolveUnit(sensor = {}, thresholdContext = {}) {
  const directUnit = String(
    thresholdContext?.unit_of_measurement ||
      sensor?.unit_of_measurement ||
      sensor?.unitOfMeasurement ||
      "",
  ).trim();
  if (directUnit) return directUnit;

  const thresholds = normalizeThresholds(thresholdContext?.thresholds);
  for (const field of THRESHOLD_CONTEXT_FIELDS) {
    const threshold = thresholds[field.key];
    const thresholdUnit = String(threshold?.converted_unit || threshold?.unit || "").trim();
    if (thresholdUnit) return thresholdUnit;
  }
  return "N/A";
}

function formatThresholdValue(threshold, fallbackUnit = "") {
  const value = toFiniteNumber(threshold?.converted_value ?? threshold?.value);
  if (!Number.isFinite(value)) return "N/A";
  const unit = String(threshold?.converted_unit || threshold?.unit || fallbackUnit || "").trim();
  return unit ? `${value} ${unit}` : String(value);
}

function formatEditableValue(value) {
  const numeric = toFiniteNumber(value);
  return Number.isFinite(numeric) ? String(numeric) : "";
}

function parseNullableNumber(rawValue, fieldLabel) {
  const cleaned = String(rawValue || "").trim();
  if (!cleaned) return { value: null, error: "" };
  const numeric = Number(cleaned);
  if (!Number.isFinite(numeric)) {
    return { value: null, error: `${fieldLabel} must be numeric.` };
  }
  return { value: numeric, error: "" };
}

function setStatus(statusNode, message, tone = "") {
  if (!statusNode) return;
  statusNode.textContent = String(message || "");
  statusNode.classList.remove("is-error", "is-success", "is-info");
  if (tone) {
    statusNode.classList.add(tone);
  }
}

export function openCustomAlarmModal({ sensor, thresholdContext = null, onSaved = null } = {}) {
  if (!sensor || !String(sensor?.attributeId || "").trim()) {
    return Promise.resolve(null);
  }

  closeExistingModal();

  return new Promise((resolve) => {
    const unitLabel = resolveUnit(sensor, thresholdContext || {});
    const thresholds = normalizeThresholds(thresholdContext?.thresholds);

    const backdrop = document.createElement("div");
    backdrop.className = "custom-alarm-modal-backdrop";
    backdrop.dataset.component = "custom-alarm-modal";

    const modal = document.createElement("section");
    modal.className = "custom-alarm-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "Create custom alarms");
    modal.addEventListener("click", (event) => event.stopPropagation());

    modal.innerHTML = `
      <header class="custom-alarm-modal-header">
        <h3>Create custom alarms</h3>
        <button type="button" class="secondary-button" data-role="close">Close</button>
      </header>
      <div class="custom-alarm-modal-body">
        <dl class="custom-alarm-meta-grid">
          <div><dt>Sensor</dt><dd>${sensor.label || sensor.attributeName || "N/A"}</dd></div>
          <div><dt>Attribute ID</dt><dd>${sensor.attributeId}</dd></div>
          <div><dt>Unit</dt><dd>${unitLabel}</dd></div>
        </dl>
        <div class="custom-alarm-threshold-context" data-role="threshold-context"></div>
        <div class="custom-alarm-edit-grid">
          <label class="custom-alarm-field">
            <span>Custom-Hi</span>
            <input type="text" inputmode="decimal" placeholder="Blank = null" data-role="custom-hi" />
          </label>
          <label class="custom-alarm-field">
            <span>Custom-Lo</span>
            <input type="text" inputmode="decimal" placeholder="Blank = null" data-role="custom-lo" />
          </label>
        </div>
        <p class="custom-alarm-modal-status" data-role="status" aria-live="polite"></p>
      </div>
      <footer class="custom-alarm-modal-footer">
        <button type="button" class="secondary-button" data-role="cancel">Cancel</button>
        <button type="button" class="primary-button" data-role="save">Save custom alarms</button>
      </footer>
    `;

    backdrop.append(modal);
    document.body.append(backdrop);

    const refs = {
      close: modal.querySelector('[data-role="close"]'),
      cancel: modal.querySelector('[data-role="cancel"]'),
      save: modal.querySelector('[data-role="save"]'),
      customHi: modal.querySelector('[data-role="custom-hi"]'),
      customLo: modal.querySelector('[data-role="custom-lo"]'),
      status: modal.querySelector('[data-role="status"]'),
      thresholdContext: modal.querySelector('[data-role="threshold-context"]'),
    };

    function renderThresholdContext() {
      const rows = THRESHOLD_CONTEXT_FIELDS.map((entry) => {
        const threshold = thresholds?.[entry.key] || null;
        const value = formatThresholdValue(threshold, unitLabel === "N/A" ? "" : unitLabel);
        return `<div><dt>${entry.label}</dt><dd>${value}</dd></div>`;
      }).join("");
      refs.thresholdContext.innerHTML = `
        <h4>Current threshold context</h4>
        <dl class="custom-alarm-threshold-grid">${rows}</dl>
      `;
    }

    function setBusy(isBusy) {
      refs.save.disabled = isBusy;
      refs.customHi.disabled = isBusy;
      refs.customLo.disabled = isBusy;
      refs.cancel.disabled = isBusy;
      refs.close.disabled = isBusy;
      refs.save.textContent = isBusy ? "Saving..." : "Save custom alarms";
    }

    function cleanup(result = null) {
      document.removeEventListener("keydown", onKeyDown);
      backdrop.remove();
      resolve(result);
    }

    async function loadCustomAlarmValues() {
      try {
        const payload = await getCustomAlarm(sensor.attributeId);
        refs.customHi.value = formatEditableValue(payload?.custom_hi);
        refs.customLo.value = formatEditableValue(payload?.custom_lo);
        setStatus(refs.status, "Loaded existing custom alarms.", "is-info");
      } catch (error) {
        if (error instanceof ApiClientError && error.status === 404) {
          refs.customHi.value = "";
          refs.customLo.value = "";
          setStatus(refs.status, "No custom alarms configured. Save to create.", "is-info");
          return;
        }
        setStatus(refs.status, error?.message || "Unable to load custom alarm values.", "is-error");
      }
    }

    async function saveCustomAlarmValues() {
      const customHi = parseNullableNumber(refs.customHi.value, "Custom-Hi");
      if (customHi.error) {
        setStatus(refs.status, customHi.error, "is-error");
        return;
      }

      const customLo = parseNullableNumber(refs.customLo.value, "Custom-Lo");
      if (customLo.error) {
        setStatus(refs.status, customLo.error, "is-error");
        return;
      }

      setBusy(true);
      setStatus(refs.status, "Saving custom alarms...", "is-info");
      try {
        const saved = await putCustomAlarm(sensor.attributeId, {
          custom_hi: customHi.value,
          custom_lo: customLo.value,
        });
        refs.customHi.value = formatEditableValue(saved?.custom_hi);
        refs.customLo.value = formatEditableValue(saved?.custom_lo);
        setStatus(refs.status, "Custom alarms saved.", "is-success");
        if (typeof onSaved === "function") {
          await onSaved(saved);
        }
      } catch (error) {
        setStatus(refs.status, error?.message || "Failed to save custom alarms.", "is-error");
      } finally {
        setBusy(false);
      }
    }

    function onKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        cleanup(null);
      }
    }

    refs.close.addEventListener("click", () => cleanup(null));
    refs.cancel.addEventListener("click", () => cleanup(null));
    refs.save.addEventListener("click", () => {
      void saveCustomAlarmValues();
    });

    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) {
        cleanup(null);
      }
    });

    document.addEventListener("keydown", onKeyDown);
    renderThresholdContext();
    setStatus(refs.status, "Loading custom alarm values...", "is-info");
    void loadCustomAlarmValues();
    queueMicrotask(() => refs.customHi.focus());
  });
}
