const DEFAULT_PRESET = "30d";
const DEFAULT_CUSTOM_DAYS = 30;

function toDateInputValue(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function parseDateInput(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return null;
  return date;
}

function formatDateInput(date) {
  if (!(date instanceof Date) || Number.isNaN(date.valueOf())) return "";
  return date.toISOString().slice(0, 10);
}

function buildDefaultCustomDateRange() {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - DEFAULT_CUSTOM_DAYS);
  return {
    start: formatDateInput(startDate),
    end: formatDateInput(endDate),
  };
}

function normalizeDateRange(dateRange) {
  const startDate = parseDateInput(dateRange.start);
  const endDate = parseDateInput(dateRange.end);
  if (!startDate || !endDate) {
    return {
      start: dateRange.start || "",
      end: dateRange.end || "",
    };
  }

  if (startDate <= endDate) {
    return {
      start: formatDateInput(startDate),
      end: formatDateInput(endDate),
    };
  }

  return {
    start: formatDateInput(endDate),
    end: formatDateInput(startDate),
  };
}

function isCompleteDateRange(dateRange) {
  return Boolean(dateRange.start && dateRange.end);
}

function syncCustomInputs(startInput, endInput, isCustomMode) {
  startInput.disabled = !isCustomMode;
  endInput.disabled = !isCustomMode;
}

function readCurrentDateRange(startInput, endInput) {
  const dateRange = {
    start: startInput.value,
    end: endInput.value,
  };
  return normalizeDateRange(dateRange);
}

function writeDateRange(startInput, endInput, dateRange) {
  startInput.value = dateRange.start || "";
  endInput.value = dateRange.end || "";
}

function applyDateRange(pageId, dateRange, changeDateRange) {
  if (!isCompleteDateRange(dateRange)) return;
  changeDateRange(pageId, dateRange.start, dateRange.end);
}

export function renderDateFilter(container, page, actions) {
  container.innerHTML = "";

  const group = document.createElement("div");
  group.className = "control-group";

  const label = document.createElement("span");
  label.className = "control-label";
  label.textContent = "Date";

  const preset = document.createElement("select");
  [
    ["7d", "Last 7 days"],
    ["30d", "Last 30 days"],
    ["90d", "Last 90 days"],
    ["custom", "Custom range"],
  ].forEach(([value, text]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = text;
    preset.append(option);
  });
  preset.value = page.datePreset || DEFAULT_PRESET;

  const start = document.createElement("input");
  start.type = "date";
  start.value = toDateInputValue(page.startDate);

  const end = document.createElement("input");
  end.type = "date";
  end.value = toDateInputValue(page.endDate);

  const setPeriod = actions.setDatePreset;
  const changeDateRange = actions.setDateRange;

  const initialCustom = preset.value === "custom";
  syncCustomInputs(start, end, initialCustom);

  function ensureCustomRange() {
    let dateRange = readCurrentDateRange(start, end);
    if (!isCompleteDateRange(dateRange)) {
      dateRange = buildDefaultCustomDateRange();
    }
    writeDateRange(start, end, dateRange);
    return dateRange;
  }

  preset.addEventListener("change", () => {
    const nextPreset = preset.value;
    const isCustomMode = nextPreset === "custom";
    syncCustomInputs(start, end, isCustomMode);

    if (!isCustomMode) {
      setPeriod(page.id, nextPreset);
      return;
    }

    const dateRange = ensureCustomRange();
    applyDateRange(page.id, dateRange, changeDateRange);
  });

  const syncRange = () => {
    const dateRange = readCurrentDateRange(start, end);
    writeDateRange(start, end, dateRange);
    applyDateRange(page.id, dateRange, changeDateRange);
  };

  start.addEventListener("change", syncRange);
  end.addEventListener("change", syncRange);

  group.append(label, preset, start, end);
  container.append(group);
}
