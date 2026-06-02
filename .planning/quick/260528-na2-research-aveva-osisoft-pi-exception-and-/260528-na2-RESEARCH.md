# Quick Research 260528-na2: AVEVA/OSIsoft PI-Inspired Timeseries Compression

**Date:** 2026-05-28
**Scope:** Research only. No application code changed.
**Prompt:** Study AVEVA/OSIsoft PI exception and compression behavior for inspiration for future timeseries display and storage optimizations in Lighthouse Charts.

## Executive Takeaway

The useful lesson from AVEVA/OSIsoft PI is not "compress everything." It is the separation of concerns:

- **Exception reporting:** Reduce source/interface noise before sending values onward.
- **Compression testing:** Store only values needed to reconstruct the trend within a configured tolerance.
- **Visualization retrieval:** Make display payloads match the viewport and use case.

For Lighthouse, the highest-ROI next step is **viewport-aware display aggregation**, not permanent lossy storage compression. We should first add a backend display-reduction mode such as M4/min-max-first-last aggregation with transparent metadata, then consider PI-inspired storage compression only if we later own a persisted timeseries cache/archive.

## Source Confidence

High confidence:

- AVEVA/OSIsoft training workbooks and AVEVA pages confirm the two-stage exception/compression model, core attributes, default starting values, and the display effect where live snapshot values may disappear after refresh from compressed archives.
- Visualization literature strongly supports M4/min-max-first-last aggregation for line charts because it preserves first, last, min, and max points per pixel-width time bucket.

Medium confidence:

- Public sources describe the swinging-door concept, but exact PI implementation details are not fully public. Any implementation should be described as "PI-inspired", not PI-compatible.

## PI Concepts Worth Borrowing

### Exception Reporting

Exception reporting is an upstream filter. It runs near the interface/data source and suppresses values considered insignificant. Public AVEVA/OSIsoft materials describe it as a deadband/time-gate mechanism controlled by point attributes:

- `ExcDev` or `ExcDevPercent`: value deadband.
- `ExcMin`: minimum time between reported values, normally zero unless suppressing noisy bursts.
- `ExcMax`: maximum staleness guard. The next received value passes after the maximum interval, even if within the deadband.

Practical interpretation for Lighthouse:

- This is useful only if we control ingestion or an intermediate materialized cache.
- Do not apply one global exception deadband. It must be per tag/sensor and based on instrument precision or SME-tuned operational tolerance.
- Exception-style filtering is risky for alarm investigation if it suppresses short transients.

### Compression Testing

Compression testing is archive-side. It reduces long-term stored events while preserving trend fidelity within a tolerance. Public materials commonly describe this as a swinging-door-style linear trend compression.

Relevant attributes:

- `CompDev` or `CompDevPercent`: maximum tolerated value deviation from reconstructed trend.
- `CompMin`: minimum time between archive writes, usually zero unless throttling a noisy tag.
- `CompMax`: maximum time between archive writes, used as a periodic retention/staleness guard.

Practical interpretation for Lighthouse:

- Compression is lossy. It is acceptable only when the use case tolerates interpolation/reconstruction error.
- Store or return metadata that says data was reduced and how many raw points were represented.
- Preserve event/alarm windows at higher fidelity than normal background periods.
- Step/digital/status values need different logic than analog values. Linear swinging-door compression is a poor default for discrete state changes.

### Snapshot vs Archive Display Effect

AVEVA/OSIsoft training material calls out a user-visible effect: a live trend may show many current/snapshot values, then show fewer values after refresh from the archive where compression has been applied.

Practical interpretation for Lighthouse:

- If we introduce display reduction, the UI must label it clearly. Otherwise users will read "fewer points" as data loss.
- For operations workflows, a chart should expose "display reduced from N to M points" and offer exact reload/zoom behavior when needed.

## Current Lighthouse Timeseries Path

Local code inspection found no current display decimation or storage compression. The project uses coarse window selection, in-memory caching, and tag-level incremental loading.

Backend:

- `backend/app/main.py`: mounts chart API under `/api/v1/charts`.
- `backend/app/api/charts.py`: `get_timeseries_batch()` is the main multi-tag endpoint.
- `backend/app/api/charts.py`: `_resolve_auto_window()` chooses coarse query windows such as `15m`, `1h`, `6h`, and `1d`.
- `backend/app/services/profiling_adapter.py`: `ProfilingAdapter.get_timeseries_from_attribute()` resolves attribute references and calls `workspace.get_item_time_series(..., fill_func="PREV")`.
- `backend/app/services/profiling_adapter.py`: `_normalize_timeseries()` converts the DataFrame to numeric `SeriesPoint` payloads and drops nulls.
- `backend/app/services/profiling_adapter.py`: `_timeseries_cache` is an in-memory 120-second backend cache keyed by workspace, item, attribute, date range, and window.

Frontend:

- `frontend/charts/services/api-client.js`: `getTimeSeriesByTags()` calls the batch endpoint, keeps a 60-second API cache, and deduplicates in-flight requests.
- `frontend/charts/components/chart-card.js`: `load()` keeps already rendered series and fetches only missing tags when the date/window context is unchanged.
- `frontend/charts/components/chart-card.js`: incremental loading is tag-level only. There is no time-range incremental loading.
- `frontend/charts/components/d3-line-chart.js`: `renderLineChartWithD3()` renders `line.points` directly into SVG paths.

Implication:

- The current bottleneck surface is likely payload size plus SVG path/render/interaction cost for large ranges and many tags.
- The safest first optimization should reduce display points while preserving visible shape and preserving raw-source semantics.

## Recommended Future Architecture

### 1. Add Viewport-Aware Display Aggregation First

Add an optional backend reduction mode to the timeseries endpoints:

```text
GET /timeseries-batch?...&reduction=visual_m4&viewport_width=1200&max_points_per_series=4800
```

Recommended first algorithm: **M4 aggregation**.

M4 groups points by the same time-to-pixel transform used by the chart and returns up to four original points per bucket:

- First point in bucket.
- Last point in bucket.
- Minimum value point.
- Maximum value point.

Why M4 first:

- Simple to implement in Python without a new dependency.
- Preserves visible extrema and bucket boundary continuity.
- Easy to explain to operations users.
- Better fit than averaging because alarms, spikes, and dips matter.

Response metadata should include:

```json
{
  "reduction": "visual_m4",
  "raw_point_count": 250000,
  "returned_point_count": 3840,
  "bucket_count": 960,
  "viewport_width": 1200,
  "exact_values": true,
  "visual_only": true
}
```

The returned values should be original observations, not averaged synthetic values, unless explicitly labeled otherwise.

### 2. Preserve Exactness for Operational Interactions

If the backend returns reduced points, hover and pinned cursors become approximate unless the UI can request exact local detail.

Recommended behavior:

- On initial wide-range load, return reduced points plus metadata.
- On zoom into a smaller domain, refetch that narrower time range with a smaller window or `reduction=none`.
- Around alarm/event spans, either disable reduction or use a higher point budget.
- In the legend/chart status area, show a compact badge such as `Reduced: 250k -> 3.8k`.

### 3. Keep Storage Compression Separate

If Lighthouse later persists its own timeseries cache/archive, introduce PI-inspired storage compression as a separate pipeline:

```text
raw source values
  -> quality/gap normalization
  -> optional exception deadband
  -> optional linear-trend compression
  -> persisted compressed series with metadata
  -> display aggregation at query time
```

Recommended metadata per sensor/config:

- `value_deadband`: engineering-unit deadband.
- `compression_deviation`: tolerated reconstruction error.
- `min_interval`: default `0`.
- `max_interval`: staleness guard.
- `step_mode`: analog vs step/digital handling.
- `preserve_event_windows`: always true for alarm-context traces.
- `source_precision` and `unit_of_measurement`.

Do not apply storage compression to:

- Regulatory/contractual exact records.
- Event-triggered calculations where every emitted result matters.
- Digital/status tags unless using transition-preserving logic.
- Alarm windows without explicit validation.

### 4. Add a Range/Pyramid Cache Later

After display aggregation proves useful, add a materialized range cache:

- Raw or near-raw short-horizon cache for recent investigation windows.
- M4/min-max-first-last buckets at common resolutions for long-range trends.
- Cache keys include workspace, item, attribute, date range, source window, reduction mode, and reduction parameters.

This is more useful for the current product than archive compression because Charts primarily needs fast visual investigation across user-selected ranges.

## Algorithm Comparison

| Candidate | Best Use | Pros | Risks |
|---|---|---|---|
| M4 / min-max-first-last | First display aggregation implementation | Preserves extrema and bucket boundaries; easy to explain; dependency-free | Does not optimize visual salience as well as LTTB in every case |
| MinMaxLTTB | Later display aggregation for very large series | Strong visual quality and faster than raw LTTB with preselection | More complex; likely dependency or optimized implementation needed |
| Swinging Door Trending | Future storage compression | Good for analog process signals and long-term archive reduction | Lossy; needs per-tag tuning; poor for step/digital values |
| Simple averaging | Rollups and summary statistics | Useful for KPI summaries | Bad default for alarms because spikes can disappear |
| Every-Nth sampling | Never as default | Easy | Can miss short operational deviations entirely |

## Implementation Sketch: Display M4

Backend pseudo-flow:

```python
def reduce_series_m4(points, start_ts, end_ts, viewport_width):
    bucket_count = max(1, int(viewport_width))
    buckets = [[] for _ in range(bucket_count)]

    for point in points:
        if point.timestamp < start_ts or point.timestamp > end_ts:
            continue
        x = int((point.timestamp - start_ts) / (end_ts - start_ts) * (bucket_count - 1))
        buckets[x].append(point)

    selected = []
    for bucket in buckets:
        if not bucket:
            continue
        first = bucket[0]
        last = bucket[-1]
        min_point = min(bucket, key=lambda p: p.value)
        max_point = max(bucket, key=lambda p: p.value)
        selected.extend([first, min_point, max_point, last])

    return sorted(dedupe_by_timestamp_and_value(selected), key=lambda p: p.timestamp)
```

Key details:

- Preserve point order after selection.
- Preserve gap boundaries; do not connect across null/data-quality gaps that the source intended as gaps.
- Include reduction parameters in backend and frontend cache keys.
- Keep tests with spikes, flat lines, step changes, sparse gaps, duplicate timestamps, and alarm-window ranges.

## Implementation Sketch: PI-Inspired Storage Compression

Only use this if Lighthouse owns persisted timeseries storage. For now, treat it as future research.

```text
For each incoming tag stream:
1. Sort or buffer within a bounded reorder window.
2. Preserve bad/uncertain quality transitions and gaps.
3. Apply exception deadband to suppress noise below instrument precision.
4. Apply linear-trend compression with max deviation and max interval.
5. Always retain alarm/event boundaries and configured periodic heartbeat points.
6. Store compression metadata with the series version/config.
```

Validation should replay raw data and compare:

- Point-count reduction.
- Max absolute reconstruction error.
- Error distribution by operating regime.
- Spike/step preservation.
- Alarm recognition impact.
- Operator-reviewed visual parity.

## Recommended Sequencing

1. **Benchmark current charts.** Instrument point counts, payload bytes, fetch time, D3 render time, and hover/pin latency for representative ranges and tag counts.
2. **Implement `visual_m4` as opt-in.** Start backend-side so payload size and SVG render cost both improve.
3. **Expose reduction metadata.** Show a compact "display reduced" badge and keep exact reload on zoom.
4. **Protect alarm/event windows.** Add high-fidelity mode for active event spans and pinned-cursor investigation.
5. **Evaluate MinMaxLTTB or `tsdownsample`.** Only after M4 benchmarks show remaining limitations.
6. **Research materialized range cache.** Add bucketed storage before considering lossy persisted compression.
7. **Consider storage compression last.** Only with raw-data replay, per-sensor tuning, and SME acceptance.

## Pitfalls To Avoid

- Do not market this as PI-compatible. Use "PI-inspired" or "historian-inspired".
- Do not average or every-Nth sample operational charts by default.
- Do not use a global deadband across all sensors.
- Do not reduce alarm windows the same way as non-event background data.
- Do not hide reduction from users.
- Do not change frontend cache keys without adding all reduction parameters.
- Do not let reduced points drive exact-value workflows without a refinement fetch.
- Do not apply linear compression to step/digital tags without transition-preserving logic.
- Do not ignore out-of-order events if/when ingestion is introduced.

## Candidate Acceptance Criteria For A Future Phase

- Wide-range chart load returns fewer than `4 * viewport_width * visible_series` points when `visual_m4` is enabled.
- Returned points preserve min and max per visible pixel bucket.
- A synthetic one-point spike remains visible after reduction.
- A step-change fixture preserves transition boundaries.
- Zooming into a reduced range refetches higher-fidelity data.
- The UI clearly indicates when a series is display-reduced.
- Pinned cursor exact-value behavior is either exact by refinement fetch or explicitly labeled approximate.
- Backend and frontend cache keys include reduction parameters.

## Sources

- AVEVA PI Server product page: https://www.aveva.com/en/products/aveva-pi-server/
- AVEVA presentation page, "Exception, Compression, and their Impacts on AVEVA PI System performance": https://www.aveva.com/en/perspectives/presentations/2023/exception--compression--and-their-impacts-on-aveva--pi-system--performance/
- OSIsoft/AVEVA PI System Administrator workbook: https://cdn.osisoft.com/learningcontent/pdfs/PISystemAdministratorForITProfessionalsWorkbook.pdf
- AVEVA Community learning excerpt, "How Data Moves through the PI System": https://community.aveva.com/pi-square-community/learning-forums/f/forum/94545/how-data-moves-through-the-pi-system
- AVEVA Community verified discussion on `ExcMin` and `CompMin`: https://community.aveva.com/pi-square-community/f/forum/98259/pi-archive-compression-settings---deviation-and-minimum-time
- Apache StreamPipes Swinging Door Trending filter docs: https://streampipes.apache.org/docs/pe/org.apache.streampipes.processors.filters.jvm.sdt/
- M4 paper, "M4: A Visualization-Oriented Time Series Data Aggregation": https://www.vldb.org/pvldb/vol7/p797-jugel.pdf
- Plotly-Resampler paper: https://arxiv.org/abs/2206.08703
- MinMaxLTTB paper: https://arxiv.org/abs/2305.00332
- `tsdownsample` SoftwareX article: https://www.sciencedirect.com/science/article/pii/S2352711025000123
