function getSeriesKey(line) {
  return String(line?.id || line?.name || "");
}

export function createLegendPanel({ series, hiddenSeries, onToggle, onRemove }) {
  const legend = document.createElement("div");
  legend.className = "legend-panel";

  const table = document.createElement("table");
  table.className = "legend-table";

  const body = document.createElement("tbody");

  series.forEach((line) => {
    const seriesKey = getSeriesKey(line);

    const row = document.createElement("tr");
    row.className = "legend-row";
    if (hiddenSeries.has(seriesKey)) {
      row.classList.add("hidden");
    }

    const labelCell = document.createElement("td");
    labelCell.className = "legend-cell legend-cell-label";
    const rowContent = document.createElement("div");
    rowContent.className = "legend-row-content";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "legend-toggle";

    const color = document.createElement("span");
    color.className = "legend-color";
    color.style.background = line.color || "#2a6f97";

    const label = document.createElement("span");
    label.className = "legend-label";
    label.textContent = line.name;

    toggle.append(color, label);
    toggle.addEventListener("click", () => {
      onToggle(seriesKey, line);
    });

    if (typeof onRemove === "function") {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "legend-remove";
      remove.textContent = "x";
      remove.title = `Remove ${line.name}`;
      remove.setAttribute("aria-label", `Remove ${line.name}`);
      remove.addEventListener("click", () => {
        onRemove(seriesKey, line);
      });
      rowContent.append(remove);
    }

    rowContent.append(toggle);

    labelCell.append(rowContent);
    row.append(labelCell);
    body.append(row);
  });

  table.append(body);
  legend.append(table);

  return legend;
}
