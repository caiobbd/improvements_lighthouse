const D3_MODULE_CANDIDATES = [
  "https://cdn.jsdelivr.net/npm/d3@7/+esm",
  "https://esm.sh/d3@7?bundle",
];

const MIN_SELECTION_PIXELS = 6;
const MIN_X_WINDOW_MS = 60 * 1000;
const MIN_Y_WINDOW = 1e-4;
const WHEEL_ZOOM_IN_FACTOR = 0.85;
const WHEEL_ZOOM_OUT_FACTOR = 1.15;
const PADDING_FACTOR = 0.08;

let d3ModulePromise = null;

async function loadD3Module() {
  if (d3ModulePromise) {
    return d3ModulePromise;
  }

  d3ModulePromise = (async () => {
    let lastError = null;

    for (const url of D3_MODULE_CANDIDATES) {
      try {
        const mod = await import(url);
        if (mod) return mod;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("Unable to load D3 module.");
  })();

  return d3ModulePromise;
}

function clear(container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
}

function getSeriesKey(line) {
  return String(line?.id || line?.name || "");
}

function parsePoint(point) {
  const timestamp = new Date(point.timestamp);
  const value = Number(point.value);
  if (Number.isNaN(timestamp.valueOf()) || !Number.isFinite(value)) {
    return null;
  }
  return { timestamp, value };
}

function parseLines(series, hiddenSeries) {
  return (Array.isArray(series) ? series : [])
    .filter((line) => !hiddenSeries.has(getSeriesKey(line)))
    .map((line) => ({
      ...line,
      key: getSeriesKey(line),
      points: (Array.isArray(line.points) ? line.points : [])
        .map(parsePoint)
        .filter(Boolean)
        .sort((left, right) => left.timestamp - right.timestamp),
    }))
    .filter((line) => line.points.length > 0);
}

function extentOrFallback(d3, values, fallback) {
  if (!values || values.length === 0) return fallback;
  const ext = d3.extent(values);
  if (!ext || ext[0] == null || ext[1] == null) return fallback;
  return ext;
}

function padNumericDomain(domain) {
  const min = Number(domain?.[0]);
  const max = Number(domain?.[1]);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  if (max <= min) {
    return [min - 0.5, max + 0.5];
  }
  const padding = (max - min) * PADDING_FACTOR;
  return [min - padding, max + padding];
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function cloneTimeDomain(domain) {
  if (!Array.isArray(domain) || domain.length !== 2) return null;
  const start = new Date(domain[0]);
  const end = new Date(domain[1]);
  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf())) return null;
  if (end <= start) return null;
  return [start, end];
}

function cloneNumericDomain(domain) {
  if (!Array.isArray(domain) || domain.length !== 2) return null;
  const min = Number(domain[0]);
  const max = Number(domain[1]);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return null;
  return [min, max];
}

function toSerializableTimeDomain(domain) {
  const parsed = cloneTimeDomain(domain);
  if (!parsed) return null;
  return [parsed[0].toISOString(), parsed[1].toISOString()];
}

function toSerializableNumericDomain(domain) {
  const parsed = cloneNumericDomain(domain);
  if (!parsed) return null;
  return [parsed[0], parsed[1]];
}

function clampTimeDomain(domain, bounds) {
  const parsed = cloneTimeDomain(domain);
  const limit = cloneTimeDomain(bounds);
  if (!parsed || !limit) return parsed || limit;

  const span = parsed[1].valueOf() - parsed[0].valueOf();
  const minSpan = Math.max(MIN_X_WINDOW_MS, Math.min(span, limit[1] - limit[0]));

  let start = parsed[0].valueOf();
  let end = parsed[1].valueOf();
  if (end - start < minSpan) {
    const center = (start + end) / 2;
    start = center - minSpan / 2;
    end = center + minSpan / 2;
  }

  const minBound = limit[0].valueOf();
  const maxBound = limit[1].valueOf();

  if (start < minBound) {
    const shift = minBound - start;
    start += shift;
    end += shift;
  }
  if (end > maxBound) {
    const shift = end - maxBound;
    start -= shift;
    end -= shift;
  }

  start = clamp(start, minBound, maxBound - MIN_X_WINDOW_MS);
  end = clamp(end, minBound + MIN_X_WINDOW_MS, maxBound);
  if (end <= start) {
    return [new Date(minBound), new Date(maxBound)];
  }
  return [new Date(start), new Date(end)];
}

function clampNumericDomain(domain, bounds) {
  const parsed = cloneNumericDomain(domain);
  const limit = cloneNumericDomain(bounds);
  if (!parsed || !limit) return parsed || limit;
  const minBound = limit[0];
  const maxBound = limit[1];
  let start = parsed[0];
  let end = parsed[1];
  if (end - start < MIN_Y_WINDOW) {
    const center = (start + end) / 2;
    start = center - MIN_Y_WINDOW / 2;
    end = center + MIN_Y_WINDOW / 2;
  }
  if (start < minBound) {
    const shift = minBound - start;
    start += shift;
    end += shift;
  }
  if (end > maxBound) {
    const shift = end - maxBound;
    start -= shift;
    end -= shift;
  }
  if (end <= start) {
    return [minBound, maxBound];
  }
  return [start, end];
}

function resolveAlarmSpan(alarmSpan) {
  if (!alarmSpan || typeof alarmSpan !== "object") return null;
  const start = new Date(alarmSpan.start);
  const end = new Date(alarmSpan.end);
  if (Number.isNaN(start.valueOf())) return null;
  if (Number.isNaN(end.valueOf())) return null;
  if (end < start) return null;
  return { start, end };
}

function resolveFallbackXDomain(candidate = null) {
  const parsed = cloneTimeDomain(candidate);
  if (parsed) return parsed;
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 30);
  return [start, end];
}

function renderEmpty(container, message) {
  clear(container);
  const state = document.createElement("div");
  state.className = "chart-empty";
  state.textContent = message;
  container.append(state);
  return {
    destroy() {},
    resize() {},
    resetView() {},
    autoScaleY() {},
    setPreviewXDomain() {},
    applyExternalXDomain() {},
    handleWheelZoom() {
      return false;
    },
  };
}

function resolveGestureMode(event) {
  const ctrl = event.ctrlKey === true;
  const shift = event.shiftKey === true;
  const alt = event.altKey === true;
  if (ctrl && shift) return "sync-x";
  if (shift) return "pan-x";
  if (ctrl) return "zoom-x";
  if (alt) return "zoom-y";
  return "zoom-xy";
}

function formatValue(value) {
  return Number(value).toFixed(2);
}

function buildVisibleRenderLines(lines, xDomain, normalizationEnabled) {
  return lines.map((line) => {
    const visiblePoints = line.points.filter(
      (point) => point.timestamp >= xDomain[0] && point.timestamp <= xDomain[1],
    );
    const source = visiblePoints.length > 0 ? visiblePoints : line.points;
    const values = source.map((point) => point.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const stats = { min, max, range };

    const points = line.points.map((point) => {
      const normalized = range > 0 ? (point.value - min) / range : 0.5;
      return {
        timestamp: point.timestamp,
        originalValue: point.value,
        normalizedValue: normalized,
        value: normalizationEnabled ? normalized : point.value,
      };
    });

    return {
      ...line,
      stats,
      points,
      visiblePoints: points.filter(
        (point) => point.timestamp >= xDomain[0] && point.timestamp <= xDomain[1],
      ),
    };
  });
}

function computeSharedYDomain(renderLines, xDomain, normalizationEnabled) {
  if (normalizationEnabled) return [0, 1];

  const visibleValues = renderLines.flatMap((line) =>
    line.points
      .filter((point) => point.timestamp >= xDomain[0] && point.timestamp <= xDomain[1])
      .map((point) => point.value),
  );
  if (visibleValues.length === 0) {
    return [0, 1];
  }
  return padNumericDomain([Math.min(...visibleValues), Math.max(...visibleValues)]);
}

function computeFullYBounds(lines) {
  const values = lines.flatMap((line) => line.points.map((point) => point.value));
  if (values.length === 0) return [0, 1];
  return padNumericDomain([Math.min(...values), Math.max(...values)]);
}

function zoomNumericDomainAround(domain, anchorValue, factor, bounds = null) {
  const parsed = cloneNumericDomain(domain);
  if (!parsed) return bounds ? cloneNumericDomain(bounds) : [0, 1];
  const span = parsed[1] - parsed[0];
  const nextSpan = Math.max(MIN_Y_WINDOW, span * factor);
  const ratio = span <= 0 ? 0.5 : (anchorValue - parsed[0]) / span;
  let nextStart = anchorValue - nextSpan * ratio;
  let nextEnd = nextStart + nextSpan;
  const nextDomain = [nextStart, nextEnd];
  return bounds ? clampNumericDomain(nextDomain, bounds) : nextDomain;
}

function zoomTimeDomainAround(domain, anchorTime, factor, bounds) {
  const parsed = cloneTimeDomain(domain);
  const limit = cloneTimeDomain(bounds);
  if (!parsed || !limit) return limit || parsed;
  const spanMs = parsed[1].valueOf() - parsed[0].valueOf();
  const nextSpanMs = Math.max(MIN_X_WINDOW_MS, spanMs * factor);
  const ratio = spanMs <= 0 ? 0.5 : (anchorTime.valueOf() - parsed[0].valueOf()) / spanMs;
  let nextStartMs = anchorTime.valueOf() - nextSpanMs * ratio;
  let nextEndMs = nextStartMs + nextSpanMs;
  return clampTimeDomain([new Date(nextStartMs), new Date(nextEndMs)], limit);
}

function renderLineChartWithD3(d3, config) {
  const {
    container,
    series,
    hiddenSeries = new Set(),
    height = 280,
    alarmSpan = null,
    interactionState = {},
    normalizationEnabled = false,
    splitYAxisEnabled = false,
    previewXDomain = null,
    fallbackXDomain = null,
    emptyStateMessage = "No points available for this chart.",
    onInteractionStateChange = null,
    onSyncPreviewChange = null,
    onSyncCommit = null,
  } = config;

  const parsedLines = parseLines(series, hiddenSeries);
  const hasSeries = parsedLines.length > 0;

  const fullXDomain = hasSeries
    ? extentOrFallback(
        d3,
        parsedLines.flatMap((line) => line.points.map((point) => point.timestamp)),
        resolveFallbackXDomain(fallbackXDomain),
      )
    : resolveFallbackXDomain(
        cloneTimeDomain(interactionState.currentXDomain) ||
          cloneTimeDomain(previewXDomain) ||
          fallbackXDomain,
      );
  const fullYBounds = hasSeries ? computeFullYBounds(parsedLines) : [0, 1];
  const normalizedAlarmSpan = resolveAlarmSpan(alarmSpan);

  const splitModeRequested = Boolean(splitYAxisEnabled);
  const splitMode = splitModeRequested && hasSeries && !normalizationEnabled && parsedLines.length <= 4;

  clear(container);
  container.style.position = "relative";

  const splitAxisCount = splitMode ? parsedLines.length : 1;
  const margin = {
    top: 18,
    right: 20,
    bottom: 36,
    left: splitMode ? 56 + (splitAxisCount - 1) * 24 : 44,
  };
  const width = Math.max(340, container.clientWidth || 720);
  const innerWidth = Math.max(10, width - margin.left - margin.right);
  const innerHeight = Math.max(10, height - margin.top - margin.bottom);

  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("display", "block");

  const root = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const clipId = `clip-${Math.random().toString(36).slice(2, 10)}`;
  root
    .append("defs")
    .append("clipPath")
    .attr("id", clipId)
    .append("rect")
    .attr("width", innerWidth)
    .attr("height", innerHeight);

  const gridLayer = root.append("g").attr("class", "grid-lines");
  const alarmLayer = root.append("g").attr("class", "alarm-span-layer");
  const previewLayer = root.append("g").attr("class", "sync-preview-layer");
  const linesLayer = root.append("g").attr("clip-path", `url(#${clipId})`);
  const splitAxisLayer = root.append("g").attr("class", "split-axis-layer");
  const yAxisLayer = root.append("g");
  const xAxisLayer = root.append("g").attr("transform", `translate(0,${innerHeight})`);

  const alarmRect = alarmLayer
    .append("rect")
    .attr("class", "alarm-span-rect")
    .attr("y", 0)
    .attr("height", innerHeight)
    .style("display", "none");

  const previewRect = previewLayer
    .append("rect")
    .attr("class", "sync-preview-rect")
    .attr("y", 0)
    .attr("height", innerHeight)
    .style("display", "none");

  const marqueeRect = previewLayer
    .append("rect")
    .attr("class", "marquee-rect")
    .style("display", "none");

  const tooltip = d3
    .select(container)
    .append("div")
    .style("position", "absolute")
    .style("pointer-events", "none")
    .style("display", "none")
    .style("padding", "6px 8px")
    .style("border-radius", "6px")
    .style("background", "rgba(26, 31, 36, 0.9)")
    .style("color", "#f7f9fb")
    .style("font-size", "11px")
    .style("line-height", "1.35")
    .style("max-width", "260px");

  const focusDot = root.append("circle").attr("r", 4).style("display", "none");
  const crosshair = root
    .append("line")
    .attr("stroke", "#aeb6bc")
    .attr("stroke-dasharray", "3,3")
    .attr("y1", 0)
    .attr("y2", innerHeight)
    .style("display", "none");

  const interactionLayer = root
    .append("rect")
    .attr("width", innerWidth)
    .attr("height", innerHeight)
    .attr("fill", "transparent")
    .style("cursor", "crosshair");

  const emptyOverlay = document.createElement("div");
  emptyOverlay.className = "chart-empty-overlay";
  emptyOverlay.textContent = String(emptyStateMessage || "No points available for this chart.");
  emptyOverlay.style.display = hasSeries ? "none" : "grid";
  container.append(emptyOverlay);

  let currentXDomain = clampTimeDomain(
    cloneTimeDomain(interactionState.currentXDomain) ||
      cloneTimeDomain(previewXDomain) ||
      cloneTimeDomain(fallbackXDomain) ||
      cloneTimeDomain(fullXDomain),
    fullXDomain,
  );
  if (!currentXDomain) {
    currentXDomain = cloneTimeDomain(fullXDomain) || resolveFallbackXDomain(null);
  }

  let previewDomain =
    clampTimeDomain(
      cloneTimeDomain(previewXDomain) || cloneTimeDomain(interactionState.previewXDomain),
      fullXDomain,
    ) || null;

  let renderLines = hasSeries
    ? buildVisibleRenderLines(parsedLines, currentXDomain, normalizationEnabled)
    : [];
  let currentYDomain = hasSeries
    ? cloneNumericDomain(interactionState.currentYDomain) ||
      computeSharedYDomain(renderLines, currentXDomain, normalizationEnabled)
    : [0, 1];
  currentYDomain = clampNumericDomain(currentYDomain, fullYBounds) || cloneNumericDomain(fullYBounds);

  let xScale = d3.scaleTime().domain(currentXDomain).range([0, innerWidth]);
  let sharedYScale = d3.scaleLinear().domain(currentYDomain).nice().range([innerHeight, 0]);
  const lineGenerator = d3
    .line()
    .x((point) => xScale(point.timestamp))
    .y((point) => sharedYScale(point.value))
    .curve(d3.curveMonotoneX);

  let splitYScales = new Map();

  function persistInteractionState() {
    interactionState.currentXDomain = toSerializableTimeDomain(currentXDomain);
    interactionState.currentYDomain = toSerializableNumericDomain(currentYDomain);
    interactionState.previewXDomain = toSerializableTimeDomain(previewDomain);
    if (typeof onInteractionStateChange === "function") {
      onInteractionStateChange({
        xDomain: interactionState.currentXDomain,
        yDomain: interactionState.currentYDomain,
        previewXDomain: interactionState.previewXDomain,
      });
    }
  }

  function createSplitYScales(lines) {
    const next = new Map();
    lines.forEach((line) => {
      const source = line.visiblePoints.length > 0 ? line.visiblePoints : line.points;
      const values = source.map((point) => point.value);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const domain = padNumericDomain([min, max]);
      const scale = d3.scaleLinear().domain(domain).nice().range([innerHeight, 0]);
      next.set(line.key, scale);
    });
    return next;
  }

  function applyDomainToScales() {
    renderLines = hasSeries
      ? buildVisibleRenderLines(parsedLines, currentXDomain, normalizationEnabled)
      : [];
    xScale.domain(currentXDomain);
    if (!splitMode) {
      if (!hasSeries || normalizationEnabled) {
        currentYDomain = [0, 1];
      }
      sharedYScale = d3.scaleLinear().domain(currentYDomain).nice().range([innerHeight, 0]);
    } else {
      splitYScales = createSplitYScales(renderLines);
    }
  }

  function renderAlarmSpan() {
    if (!normalizedAlarmSpan) {
      alarmRect.style("display", "none");
      return;
    }
    const domainStart = xScale.domain()[0];
    const domainEnd = xScale.domain()[1];
    const visibleStart =
      normalizedAlarmSpan.start < domainStart ? domainStart : normalizedAlarmSpan.start;
    const visibleEnd = normalizedAlarmSpan.end > domainEnd ? domainEnd : normalizedAlarmSpan.end;
    if (visibleEnd <= visibleStart) {
      alarmRect.style("display", "none");
      return;
    }
    const x1 = xScale(visibleStart);
    const x2 = xScale(visibleEnd);
    alarmRect
      .attr("x", x1)
      .attr("width", Math.max(1, x2 - x1))
      .style("display", "block");
  }

  function renderPreviewSpan() {
    if (!previewDomain) {
      previewRect.style("display", "none");
      return;
    }
    const x1 = xScale(previewDomain[0]);
    const x2 = xScale(previewDomain[1]);
    if (!Number.isFinite(x1) || !Number.isFinite(x2)) {
      previewRect.style("display", "none");
      return;
    }
    previewRect
      .attr("x", Math.min(x1, x2))
      .attr("width", Math.max(1, Math.abs(x2 - x1)))
      .style("display", "block");
  }

  function renderAxes() {
    const xAxis = d3.axisBottom(xScale).ticks(7).tickFormat(d3.timeFormat("%d %b"));
    xAxisLayer.call(xAxis);
    xAxisLayer.selectAll("text").attr("fill", "#7c838a").style("font-size", "11px");
    xAxisLayer.selectAll("line,path").attr("stroke", "#c9c2b6");

    splitAxisLayer.selectAll("*").remove();
    if (!splitMode) {
      yAxisLayer.call(d3.axisLeft(sharedYScale).ticks(6));
      yAxisLayer.selectAll("text").attr("fill", "#7c838a").style("font-size", "11px");
      yAxisLayer.selectAll("line,path").attr("stroke", "#c9c2b6");
      const gridAxis = d3.axisLeft(sharedYScale).ticks(6).tickSize(-innerWidth).tickFormat("");
      gridLayer.call(gridAxis);
      gridLayer.selectAll("line").attr("stroke", "#e5dfd3");
      gridLayer.select("path").attr("display", "none");
      return;
    }

    yAxisLayer.selectAll("*").remove();
    const primaryScale = splitYScales.get(renderLines[0]?.key) || sharedYScale;
    const gridAxis = d3.axisLeft(primaryScale).ticks(6).tickSize(-innerWidth).tickFormat("");
    gridLayer.call(gridAxis);
    gridLayer.selectAll("line").attr("stroke", "#e5dfd3");
    gridLayer.select("path").attr("display", "none");

    renderLines.forEach((line, index) => {
      const scale = splitYScales.get(line.key);
      if (!scale) return;
      const offset = -index * 24;
      const axisGroup = splitAxisLayer.append("g").attr("transform", `translate(${offset},0)`);
      axisGroup.call(d3.axisLeft(scale).ticks(4));
      axisGroup.selectAll("line,path").attr("stroke", line.color || "#2a6f97");
      axisGroup
        .selectAll("text")
        .attr("fill", line.color || "#2a6f97")
        .style("font-size", "10px")
        .style("font-weight", "600");
    });
  }

  function getScaleForLine(line) {
    if (splitMode) {
      return splitYScales.get(line.key) || sharedYScale;
    }
    return sharedYScale;
  }

  function renderLinesLayer() {
    linesLayer.selectAll("*").remove();
    emptyOverlay.style.display = renderLines.length === 0 ? "grid" : "none";
    renderLines.forEach((line) => {
      const yScale = getScaleForLine(line);
      const pathBuilder = lineGenerator.y((point) => yScale(point.value));
      linesLayer
        .append("path")
        .datum(line)
        .attr("class", "line-series")
        .attr("fill", "none")
        .attr("stroke", line.color || "#2a6f97")
        .attr("stroke-width", 1.8)
        .attr("d", pathBuilder(line.points));
    });
  }

  function renderAll() {
    applyDomainToScales();
    renderAxes();
    renderLinesLayer();
    renderAlarmSpan();
    renderPreviewSpan();
    persistInteractionState();
  }

  function getNearestPoint(mouseX) {
    const hoveredDate = xScale.invert(mouseX);
    let nearest = null;
    renderLines.forEach((line) => {
      const points = line.visiblePoints.length > 0 ? line.visiblePoints : line.points;
      const bisect = d3.bisector((point) => point.timestamp).center;
      const index = bisect(points, hoveredDate);
      const point = points[Math.max(0, Math.min(index, points.length - 1))];
      if (!point) return;
      const distance = Math.abs(xScale(point.timestamp) - mouseX);
      if (!nearest || distance < nearest.distance) {
        nearest = {
          distance,
          line,
          point,
        };
      }
    });
    return nearest;
  }

  function hideTooltip() {
    focusDot.style("display", "none");
    crosshair.style("display", "none");
    tooltip.style("display", "none");
  }

  function showTooltip(event) {
    const [mouseX] = d3.pointer(event, interactionLayer.node());
    const nearest = getNearestPoint(mouseX);
    if (!nearest) return;
    const yScale = getScaleForLine(nearest.line);
    const x = xScale(nearest.point.timestamp);
    const y = yScale(nearest.point.value);

    focusDot.attr("cx", x).attr("cy", y).attr("fill", nearest.line.color || "#2a6f97").style("display", "block");
    crosshair.attr("x1", x).attr("x2", x).style("display", "block");

    const norm = nearest.point.normalizedValue;
    const valueRows = normalizationEnabled
      ? `${formatValue(nearest.point.originalValue)} (orig)<br>${formatValue(norm)} (norm)`
      : formatValue(nearest.point.originalValue);
    tooltip
      .style("display", "block")
      .style("left", `${Math.min(width - 180, x + margin.left + 12)}px`)
      .style("top", `${Math.max(8, y + margin.top - 28)}px`)
      .html(
        `<strong>${nearest.line.name}</strong><br>${d3.utcFormat("%Y-%m-%d %H:%M")(nearest.point.timestamp)}<br>${valueRows}`,
      );
  }

  let gesture = null;
  let rafHandle = null;

  function scheduleRender() {
    if (rafHandle) return;
    rafHandle = requestAnimationFrame(() => {
      rafHandle = null;
      renderAll();
    });
  }

  function updateMarqueeRect(fromX, fromY, toX, toY) {
    const x = Math.min(fromX, toX);
    const y = Math.min(fromY, toY);
    const widthValue = Math.abs(toX - fromX);
    const heightValue = Math.abs(toY - fromY);
    marqueeRect
      .attr("x", x)
      .attr("y", y)
      .attr("width", widthValue)
      .attr("height", heightValue)
      .style("display", "block");
  }

  function clearMarqueeRect() {
    marqueeRect.style("display", "none");
  }

  function applyZoomSelection(mode, xStart, xEnd, yStart, yEnd) {
    const dx = Math.abs(xEnd - xStart);
    const dy = Math.abs(yEnd - yStart);
    if (dx < MIN_SELECTION_PIXELS && dy < MIN_SELECTION_PIXELS) return;

    const nextX = [xScale.invert(Math.min(xStart, xEnd)), xScale.invert(Math.max(xStart, xEnd))];
    const nextY = [sharedYScale.invert(Math.max(yStart, yEnd)), sharedYScale.invert(Math.min(yStart, yEnd))];

    if (mode === "sync-x" || mode === "zoom-x" || mode === "zoom-xy") {
      if (dx >= MIN_SELECTION_PIXELS) {
        currentXDomain = clampTimeDomain(nextX, fullXDomain) || currentXDomain;
      }
    }

    if ((mode === "zoom-y" || mode === "zoom-xy") && hasSeries && !splitMode && !normalizationEnabled) {
      if (dy >= MIN_SELECTION_PIXELS) {
        currentYDomain =
          clampNumericDomain(nextY, fullYBounds) || computeSharedYDomain(renderLines, currentXDomain, false);
      }
    }
  }

  function getEventCoordinates(event) {
    const [x, y] = d3.pointer(event, interactionLayer.node());
    return {
      x: clamp(x, 0, innerWidth),
      y: clamp(y, 0, innerHeight),
    };
  }

  function onPointerDown(event) {
    if (event.button !== 0) return;
    const mode = resolveGestureMode(event);
    if (mode === "zoom-y" && (!hasSeries || splitMode || normalizationEnabled)) {
      return;
    }
    const coords = getEventCoordinates(event);
    gesture = {
      mode,
      pointerId: event.pointerId,
      startX: coords.x,
      startY: coords.y,
      currentX: coords.x,
      currentY: coords.y,
      originXDomain: cloneTimeDomain(currentXDomain),
      originYDomain: cloneNumericDomain(currentYDomain),
    };
    interactionLayer.node().setPointerCapture(event.pointerId);
    if (mode === "pan-x") {
      interactionLayer.style("cursor", "grabbing");
    }
    if (mode !== "pan-x") {
      updateMarqueeRect(coords.x, coords.y, coords.x, coords.y);
    }
    hideTooltip();
  }

  function onPointerMove(event) {
    if (!gesture || event.pointerId !== gesture.pointerId) {
      showTooltip(event);
      return;
    }
    const coords = getEventCoordinates(event);
    gesture.currentX = coords.x;
    gesture.currentY = coords.y;

    if (gesture.mode === "pan-x") {
      const dx = coords.x - gesture.startX;
      const spanMs =
        gesture.originXDomain[1].valueOf() - gesture.originXDomain[0].valueOf();
      const msPerPixel = spanMs / innerWidth;
      const shiftMs = -dx * msPerPixel;
      const next = [
        new Date(gesture.originXDomain[0].valueOf() + shiftMs),
        new Date(gesture.originXDomain[1].valueOf() + shiftMs),
      ];
      currentXDomain = clampTimeDomain(next, fullXDomain) || gesture.originXDomain;
      scheduleRender();
      return;
    }

    updateMarqueeRect(gesture.startX, gesture.startY, coords.x, coords.y);
    if (gesture.mode === "sync-x") {
      const dx = Math.abs(coords.x - gesture.startX);
      if (dx >= MIN_SELECTION_PIXELS) {
        previewDomain =
          clampTimeDomain(
            [
              xScale.invert(Math.min(gesture.startX, coords.x)),
              xScale.invert(Math.max(gesture.startX, coords.x)),
            ],
            fullXDomain,
          ) || null;
      } else {
        previewDomain = null;
      }
      if (typeof onSyncPreviewChange === "function") {
        onSyncPreviewChange(toSerializableTimeDomain(previewDomain));
      }
      scheduleRender();
    }
  }

  function onPointerUp(event) {
    if (!gesture || event.pointerId !== gesture.pointerId) return;

    const mode = gesture.mode;
    const startX = gesture.startX;
    const startY = gesture.startY;
    const endX = gesture.currentX;
    const endY = gesture.currentY;

    if (mode === "sync-x") {
      applyZoomSelection(mode, startX, endX, startY, endY);
      if (typeof onSyncCommit === "function") {
        onSyncCommit(toSerializableTimeDomain(currentXDomain));
      }
      previewDomain = null;
      if (typeof onSyncPreviewChange === "function") {
        onSyncPreviewChange(null);
      }
    } else if (mode !== "pan-x") {
      applyZoomSelection(mode, startX, endX, startY, endY);
    }

    interactionLayer.node().releasePointerCapture(gesture.pointerId);
    interactionLayer.style("cursor", "crosshair");
    clearMarqueeRect();
    gesture = null;
    renderAll();
  }

  function onPointerCancel(event) {
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    interactionLayer.node().releasePointerCapture(gesture.pointerId);
    interactionLayer.style("cursor", "crosshair");
    clearMarqueeRect();
    if (typeof onSyncPreviewChange === "function") {
      onSyncPreviewChange(null);
    }
    previewDomain = null;
    gesture = null;
    renderAll();
  }

  function resetView() {
    currentXDomain = cloneTimeDomain(fullXDomain) || currentXDomain;
    renderLines = hasSeries
      ? buildVisibleRenderLines(parsedLines, currentXDomain, normalizationEnabled)
      : [];
    currentYDomain = hasSeries
      ? computeSharedYDomain(renderLines, currentXDomain, normalizationEnabled)
      : [0, 1];
    previewDomain = null;
    if (typeof onSyncPreviewChange === "function") {
      onSyncPreviewChange(null);
    }
    renderAll();
  }

  function autoScaleY() {
    if (!hasSeries || splitMode || normalizationEnabled) return;
    currentYDomain = computeSharedYDomain(renderLines, currentXDomain, normalizationEnabled);
    renderAll();
  }

  function applyExternalXDomain(nextDomain) {
    const parsed = clampTimeDomain(cloneTimeDomain(nextDomain), fullXDomain);
    if (!parsed) return;
    currentXDomain = parsed;
    renderAll();
  }

  function setPreviewXDomain(nextDomain) {
    previewDomain = clampTimeDomain(cloneTimeDomain(nextDomain), fullXDomain);
    renderPreviewSpan();
    persistInteractionState();
  }

  function handleWheelZoom(event) {
    if (!event || (!event.ctrlKey && !event.altKey)) return false;
    if (event.ctrlKey && event.altKey) return false;

    const rect = container.getBoundingClientRect();
    const pointerX = clamp(event.clientX - rect.left - margin.left, 0, innerWidth);
    const pointerY = clamp(event.clientY - rect.top - margin.top, 0, innerHeight);
    const factor = event.deltaY < 0 ? WHEEL_ZOOM_IN_FACTOR : WHEEL_ZOOM_OUT_FACTOR;

    if (event.ctrlKey) {
      const anchor = xScale.invert(pointerX);
      currentXDomain = zoomTimeDomainAround(currentXDomain, anchor, factor, fullXDomain);
      renderAll();
      return true;
    }
    if (event.altKey && hasSeries && !splitMode && !normalizationEnabled) {
      const anchor = sharedYScale.invert(pointerY);
      currentYDomain = zoomNumericDomainAround(currentYDomain, anchor, factor, fullYBounds);
      renderAll();
      return true;
    }
    return false;
  }

  interactionLayer.on("mousemove", onPointerMove);
  interactionLayer.on("mouseleave", hideTooltip);
  interactionLayer.on("pointerdown", onPointerDown);
  interactionLayer.on("pointermove", onPointerMove);
  interactionLayer.on("pointerup", onPointerUp);
  interactionLayer.on("pointercancel", onPointerCancel);

  renderAll();

  function resize() {
    renderLineChart(config);
  }

  function destroy() {
    if (rafHandle) {
      cancelAnimationFrame(rafHandle);
      rafHandle = null;
    }
    tooltip.remove();
    svg.remove();
  }

  return {
    destroy,
    resize,
    resetView,
    autoScaleY,
    setPreviewXDomain,
    applyExternalXDomain,
    handleWheelZoom,
  };
}

export function renderLineChart(config) {
  const { container } = config;
  if (!container) {
    return {
      destroy() {},
      resize() {},
      resetView() {},
      autoScaleY() {},
      setPreviewXDomain() {},
      applyExternalXDomain() {},
      handleWheelZoom() {
        return false;
      },
    };
  }

  let activeHandle = {
    destroy() {},
    resize() {},
    resetView() {},
    autoScaleY() {},
    setPreviewXDomain() {},
    applyExternalXDomain() {},
    handleWheelZoom() {
      return false;
    },
  };
  let disposed = false;

  void loadD3Module()
    .then((d3) => {
      if (disposed) return;
      requestAnimationFrame(() => {
        if (disposed) return;
        activeHandle = renderLineChartWithD3(d3, config);
      });
    })
    .catch(() => {
      if (disposed) return;
      activeHandle = renderEmpty(container, "Chart engine failed to load. Check network and refresh.");
    });

  return {
    destroy() {
      disposed = true;
      activeHandle.destroy();
    },
    resize() {
      if (disposed) return;
      activeHandle.resize();
    },
    resetView() {
      if (disposed) return;
      activeHandle.resetView?.();
    },
    autoScaleY() {
      if (disposed) return;
      activeHandle.autoScaleY?.();
    },
    setPreviewXDomain(domain) {
      if (disposed) return;
      activeHandle.setPreviewXDomain?.(domain);
    },
    applyExternalXDomain(domain) {
      if (disposed) return;
      activeHandle.applyExternalXDomain?.(domain);
    },
    handleWheelZoom(event) {
      if (disposed) return false;
      return activeHandle.handleWheelZoom?.(event) === true;
    },
  };
}
