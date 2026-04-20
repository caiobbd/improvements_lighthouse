import { createLegendPanel } from "./legend-panel.js";
import { renderLineChart } from "./d3-line-chart.js";

export function openFullChart({ chartTitle, series, hiddenSeries, onToggleSeries }) {
  const overlay = document.createElement("div");
  overlay.className = "fullscreen-overlay";

  const panel = document.createElement("section");
  panel.className = "fullscreen-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");

  const header = document.createElement("div");
  header.className = "chart-card-header";

  const title = document.createElement("h2");
  title.className = "chart-card-title";
  title.textContent = chartTitle;

  const close = document.createElement("button");
  close.type = "button";
  close.className = "primary-button";
  close.textContent = "Close";

  const body = document.createElement("div");
  body.className = "chart-card-body";
  body.style.minHeight = "560px";

  const legendHost = document.createElement("div");

  let renderHandle = renderLineChart({
    container: body,
    series,
    hiddenSeries,
    height: 560,
  });

  function refreshLegend() {
    legendHost.innerHTML = "";
    legendHost.append(
      createLegendPanel({
        series,
        hiddenSeries,
        onToggle: (name) => {
          onToggleSeries(name);
          renderHandle.destroy();
          renderHandle = renderLineChart({
            container: body,
            series,
            hiddenSeries,
            height: 560,
          });
          refreshLegend();
        },
      }),
    );
  }

  function closeModal() {
    renderHandle.destroy();
    overlay.remove();
    window.removeEventListener("keydown", onKeyDown);
  }

  function onKeyDown(event) {
    if (event.key === "Escape") {
      closeModal();
    }
  }

  close.addEventListener("click", closeModal);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeModal();
    }
  });
  window.addEventListener("keydown", onKeyDown);

  header.append(title, close);
  panel.append(header, body, legendHost);
  overlay.append(panel);
  refreshLegend();

  document.body.append(overlay);
  return closeModal;
}
