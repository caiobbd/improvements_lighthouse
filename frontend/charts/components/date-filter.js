const DEFAULT_PRESET = "4w";
const DEFAULT_CUSTOM_DAYS = 28;
const QUICK_RANGE_OPTIONS = Object.freeze([
  { preset: "24h", label: "24H" },
  { preset: "1w", label: "1W" },
  { preset: "4w", label: "4W" },
  { preset: "90d", label: "90D" },
]);

const customInlineState = {
  openForPageId: null,
  start: "",
  end: "",
};
const dateDisplayFormatter = new Intl.DateTimeFormat(undefined, {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function formatDateInput(date) {
  if (!(date instanceof Date) || Number.isNaN(date.valueOf())) return "";
  return date.toISOString().slice(0, 10);
}

function parseDateInput(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return null;
  return parsed;
}

function formatDisplayDate(value) {
  const parsed = parseDateInput(value);
  if (!parsed) return "";
  return dateDisplayFormatter.format(parsed);
}

function buildDefaultCustomRange() {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - DEFAULT_CUSTOM_DAYS);
  return {
    start: formatDateInput(startDate),
    end: formatDateInput(endDate),
  };
}

function normalizeDateRange(range) {
  const startDate = parseDateInput(range.start);
  const endDate = parseDateInput(range.end);
  if (!startDate || !endDate) return range;
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

function ensureCustomDraftFromPage(page) {
  const start = String(page?.startDate || "").slice(0, 10);
  const end = String(page?.endDate || "").slice(0, 10);
  if (start && end) {
    const normalized = normalizeDateRange({ start, end });
    customInlineState.start = normalized.start;
    customInlineState.end = normalized.end;
    return;
  }
  const fallback = buildDefaultCustomRange();
  customInlineState.start = fallback.start;
  customInlineState.end = fallback.end;
}

function commitCustomRangeIfReady(page, actions) {
  const normalized = normalizeDateRange({
    start: String(customInlineState.start || ""),
    end: String(customInlineState.end || ""),
  });
  if (!normalized.start || !normalized.end) return false;
  customInlineState.start = normalized.start;
  customInlineState.end = normalized.end;
  actions.setDateRange(page.id, normalized.start, normalized.end);
  return true;
}

function openNativeDatePicker(input) {
  if (!input) return;
  input.focus();
  if (typeof input.showPicker === "function") {
    try {
      input.showPicker();
      return;
    } catch {}
  }
  input.click();
}

function createRangeButton({ preset, label, active, onClick }) {
  const item = document.createElement("div");
  item.className = "range-button-item";

  const button = document.createElement("button");
  button.type = "button";
  button.className = `range-button${active ? " active" : ""}`;
  button.textContent = label;
  button.title = `Set range to ${label}`;
  button.setAttribute("aria-label", `Set range to ${label}`);
  button.addEventListener("click", onClick);
  item.append(button);
  return item;
}

function createCustomInlineControl({ container, page, actions, activePreset }) {
  const inline = document.createElement("div");
  inline.className = `range-custom-inline${activePreset === "custom" ? " active" : ""}`;

  const startPickerInput = document.createElement("input");
  startPickerInput.type = "date";
  startPickerInput.className = "range-custom-native-input";
  startPickerInput.value = customInlineState.start;
  startPickerInput.setAttribute("aria-label", "Select custom start date");
  startPickerInput.addEventListener("change", () => {
    customInlineState.start = String(startPickerInput.value || "");
    commitCustomRangeIfReady(page, actions);
    renderDateFilter(container, page, actions);
  });

  const endPickerInput = document.createElement("input");
  endPickerInput.type = "date";
  endPickerInput.className = "range-custom-native-input";
  endPickerInput.value = customInlineState.end;
  endPickerInput.setAttribute("aria-label", "Select custom end date");
  endPickerInput.addEventListener("change", () => {
    customInlineState.end = String(endPickerInput.value || "");
    commitCustomRangeIfReady(page, actions);
    renderDateFilter(container, page, actions);
  });

  const startButton = document.createElement("button");
  startButton.type = "button";
  startButton.className = `range-custom-date-button${customInlineState.start ? " has-value" : ""}`;
  startButton.textContent = customInlineState.start
    ? formatDisplayDate(customInlineState.start)
    : "Start";
  startButton.title = "Select custom start date";
  startButton.setAttribute("aria-label", "Select custom start date");
  startButton.addEventListener("click", () => openNativeDatePicker(startPickerInput));

  const separator = document.createElement("span");
  separator.className = "range-custom-separator";
  separator.textContent = "\u2192";
  separator.setAttribute("aria-hidden", "true");

  const endButton = document.createElement("button");
  endButton.type = "button";
  endButton.className = `range-custom-date-button${customInlineState.end ? " has-value" : ""}`;
  endButton.textContent = customInlineState.end ? formatDisplayDate(customInlineState.end) : "End";
  endButton.title = "Select custom end date";
  endButton.setAttribute("aria-label", "Select custom end date");
  endButton.addEventListener("click", () => openNativeDatePicker(endPickerInput));

  const calendarButton = document.createElement("button");
  calendarButton.type = "button";
  calendarButton.className = "range-custom-calendar-button";
  calendarButton.textContent = "\u{1F4C5}";
  calendarButton.title = "Open custom date picker";
  calendarButton.setAttribute("aria-label", "Open custom date picker");
  calendarButton.addEventListener("click", () => {
    if (!customInlineState.start) {
      openNativeDatePicker(startPickerInput);
      return;
    }
    openNativeDatePicker(endPickerInput);
  });

  inline.append(
    startButton,
    separator,
    endButton,
    calendarButton,
    startPickerInput,
    endPickerInput,
  );

  return inline;
}

export function renderDateFilter(container, page, actions) {
  container.innerHTML = "";
  const pageId = String(page?.id || "");
  const activePreset = String(page?.datePreset || DEFAULT_PRESET).toLowerCase();

  const wrapper = document.createElement("div");
  wrapper.className = "range-button-strip";

  QUICK_RANGE_OPTIONS.forEach(({ preset, label }) => {
    wrapper.append(
      createRangeButton({
        preset,
        label,
        active: activePreset === preset,
        onClick: () => {
          customInlineState.openForPageId = null;
          actions.setDatePreset(page.id, preset);
        },
      }),
    );
  });

  const inlineCustomOpenForPage = customInlineState.openForPageId === pageId;
  const showCustomInline = activePreset === "custom" || inlineCustomOpenForPage;
  if (showCustomInline) {
    if (!inlineCustomOpenForPage) {
      ensureCustomDraftFromPage(page);
      customInlineState.openForPageId = pageId;
    }
    wrapper.append(
      createCustomInlineControl({
        container,
        page,
        actions,
        activePreset,
      }),
    );
  } else {
    wrapper.append(
      createRangeButton({
        preset: "custom",
        label: "Custom",
        active: false,
        onClick: () => {
          ensureCustomDraftFromPage(page);
          customInlineState.openForPageId = pageId;
          renderDateFilter(container, page, actions);
        },
      }),
    );
  }

  container.append(wrapper);
}

