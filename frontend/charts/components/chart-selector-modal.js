import { getItemAttributes, searchAssets } from "../services/api-client.js";

const MAX_ASSET_RESULTS = 50;

function toTagKey(tag) {
  const itemId = String(tag?.itemId || tag?.item_id || "").trim();
  const attributeId = String(tag?.attributeId || tag?.attribute_id || "").trim();
  const attributeName = String(tag?.attributeName || tag?.attribute_name || "").trim().toLowerCase();
  return `${itemId}::${attributeId || attributeName}`;
}

function normalizeTag(raw) {
  if (!raw) return null;
  const tag = {
    assetName: raw.assetName || raw.asset_name || "",
    itemId: raw.itemId || raw.item_id || "",
    attributeId: raw.attributeId || raw.attribute_id || "",
    attributeName: raw.attributeName || raw.attribute_name || "",
    label: raw.label || raw.attributeName || raw.attribute_name || "",
  };
  if (!tag.itemId || !(tag.attributeId || tag.attributeName)) {
    return null;
  }
  if (!tag.label) {
    tag.label = tag.attributeName || tag.attributeId;
  }
  tag.key = toTagKey(tag);
  return tag;
}

function attributeToTag(asset, attribute) {
  const labelSuffix = attribute.reference ? ` [${attribute.reference}]` : "";
  const tag = {
    assetName: asset.asset_name || "",
    itemId: asset.item_id || "",
    attributeId: attribute.id || "",
    attributeName: attribute.name || "",
    label: `${attribute.name || attribute.id || "Attribute"}${labelSuffix}`,
  };
  tag.key = toTagKey(tag);
  return tag;
}

function includesFilter(value, query) {
  if (!query) return true;
  return String(value || "").toLowerCase().includes(query.toLowerCase());
}

function closeExistingSelector() {
  const existing = document.querySelector(".chart-selector-overlay");
  if (existing) existing.remove();
}

export function openChartSelectorModal({ initialTags = [], requireSelection = true } = {}) {
  closeExistingSelector();

  return new Promise((resolve) => {
    const selectedTags = new Map();
    initialTags.map(normalizeTag).filter(Boolean).forEach((tag) => selectedTags.set(tag.key, tag));

    const state = {
      loadingAssets: false,
      loadingAttributes: false,
      hasSearchedAssets: false,
      assetQuery: "",
      attributeQuery: "",
      assets: [],
      selectedAsset: null,
      attributes: [],
      error: "",
    };

    const overlay = document.createElement("div");
    overlay.className = "chart-selector-overlay";

    const panel = document.createElement("section");
    panel.className = "chart-selector-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", "Chart selector");

    panel.innerHTML = `
      <header class="chart-selector-header">
        <h2>Select Variables</h2>
        <button type="button" class="ghost-button" data-role="close">Close</button>
      </header>
      <div class="chart-selector-body">
        <section class="selector-pane">
          <h3>Select an Asset</h3>
          <form class="selector-search-form" data-role="asset-search-form">
            <input type="search" placeholder="Search assets" data-role="asset-search" />
            <button type="submit" class="secondary-button" data-role="asset-submit">Search</button>
          </form>
          <div class="selector-list" data-role="asset-list"></div>
        </section>
        <section class="selector-pane">
          <h3>Select Attributes</h3>
          <input type="search" placeholder="Filter attributes" data-role="attribute-search" />
          <div class="selector-list" data-role="attribute-list"></div>
        </section>
      </div>
      <div class="selector-selected">
        <span class="control-label">Selected</span>
        <div class="selector-selected-list" data-role="selected-list"></div>
      </div>
      <footer class="chart-selector-footer">
        <span class="selector-error" data-role="error"></span>
        <div class="selector-footer-actions">
          <button type="button" class="ghost-button" data-role="cancel">Cancel</button>
          <button type="button" class="primary-button" data-role="apply">Apply</button>
        </div>
      </footer>
    `;

    overlay.append(panel);
    document.body.append(overlay);

    const refs = {
      assetSearchForm: panel.querySelector('[data-role="asset-search-form"]'),
      assetSearch: panel.querySelector('[data-role="asset-search"]'),
      attributeSearch: panel.querySelector('[data-role="attribute-search"]'),
      assetList: panel.querySelector('[data-role="asset-list"]'),
      attributeList: panel.querySelector('[data-role="attribute-list"]'),
      selectedList: panel.querySelector('[data-role="selected-list"]'),
      error: panel.querySelector('[data-role="error"]'),
      apply: panel.querySelector('[data-role="apply"]'),
      cancel: panel.querySelector('[data-role="cancel"]'),
      close: panel.querySelector('[data-role="close"]'),
    };

    function setError(message = "") {
      state.error = message;
      refs.error.textContent = message;
    }

    function renderSelectedTags() {
      refs.selectedList.innerHTML = "";
      const tags = Array.from(selectedTags.values());
      if (!tags.length) {
        const empty = document.createElement("span");
        empty.className = "selector-empty";
        empty.textContent = "No attributes selected";
        refs.selectedList.append(empty);
      } else {
        tags.forEach((tag) => {
          const chip = document.createElement("span");
          chip.className = "selector-chip";
          chip.textContent = tag.label;
          refs.selectedList.append(chip);
        });
      }
      refs.apply.disabled = requireSelection && tags.length === 0;
    }

    function renderAssets() {
      refs.assetList.innerHTML = "";
      if (state.loadingAssets) {
        refs.assetList.innerHTML = '<div class="selector-status">Searching assets...</div>';
        return;
      }
      if (!state.hasSearchedAssets) {
        refs.assetList.innerHTML = '<div class="selector-status">Type and click Search to list assets</div>';
        return;
      }
      if (!state.assets.length) {
        refs.assetList.innerHTML = '<div class="selector-status">No assets found</div>';
        return;
      }

      state.assets.forEach((asset) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `selector-list-item${state.selectedAsset?.item_id === asset.item_id ? " active" : ""}`;
        button.textContent = asset.asset_name;
        button.addEventListener("click", () => {
          void selectAsset(asset);
        });
        refs.assetList.append(button);
      });
    }

    function renderAttributes() {
      refs.attributeList.innerHTML = "";
      refs.attributeSearch.disabled = !state.selectedAsset;
      if (!state.selectedAsset) {
        refs.attributeList.innerHTML = '<div class="selector-status">Select an asset</div>';
        return;
      }
      if (state.loadingAttributes) {
        refs.attributeList.innerHTML = '<div class="selector-status">Loading attributes...</div>';
        return;
      }

      const filtered = state.attributes.filter((attribute) =>
        includesFilter(`${attribute.name} ${attribute.reference || ""}`, state.attributeQuery),
      );
      if (!filtered.length) {
        refs.attributeList.innerHTML = '<div class="selector-status">No attributes found</div>';
        return;
      }

      filtered.forEach((attribute) => {
        const tag = attributeToTag(state.selectedAsset, attribute);
        const key = tag.key;

        const row = document.createElement("label");
        row.className = "selector-attribute-row";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = selectedTags.has(key);
        checkbox.addEventListener("change", () => {
          if (checkbox.checked) {
            selectedTags.set(key, tag);
          } else {
            selectedTags.delete(key);
          }
          renderSelectedTags();
        });

        const text = document.createElement("span");
        text.textContent = tag.label;

        row.append(checkbox, text);
        refs.attributeList.append(row);
      });
    }

    async function loadAssets(query) {
      state.loadingAssets = true;
      state.hasSearchedAssets = true;
      setError("");
      renderAssets();

      try {
        const payload = await searchAssets(query, MAX_ASSET_RESULTS);
        state.assets = Array.isArray(payload?.results) ? payload.results : [];

        if (state.selectedAsset) {
          const stillPresent = state.assets.find((asset) => asset.item_id === state.selectedAsset.item_id);
          state.selectedAsset = stillPresent || null;
        }
        if (!state.selectedAsset) {
          state.attributes = [];
          state.loadingAttributes = false;
          renderAttributes();
        }
      } catch (error) {
        setError(error?.message || "Unable to search assets.");
        state.assets = [];
      } finally {
        state.loadingAssets = false;
        renderAssets();
      }
    }

    async function selectAsset(asset) {
      state.selectedAsset = asset;
      state.attributeQuery = "";
      refs.attributeSearch.value = "";
      renderAssets();
      state.loadingAttributes = true;
      state.attributes = [];
      renderAttributes();

      try {
        const payload = await getItemAttributes({
          item_id: asset.item_id,
          asset_name: asset.asset_name,
          timeseries_only: true,
        });
        state.attributes = Array.isArray(payload?.attributes) ? payload.attributes : [];
      } catch (error) {
        setError(error?.message || "Unable to load attributes.");
        state.attributes = [];
      } finally {
        state.loadingAttributes = false;
        renderAttributes();
      }
    }

    function cleanup(returnValue) {
      document.removeEventListener("keydown", onKeyDown);
      overlay.remove();
      resolve(returnValue);
    }

    function onKeyDown(event) {
      if (event.key === "Escape") {
        cleanup(null);
      }
    }

    refs.assetSearch.addEventListener("input", () => {
      state.assetQuery = refs.assetSearch.value.trim();
      setError("");
    });

    refs.assetSearchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      state.assetQuery = refs.assetSearch.value.trim();
      void loadAssets(state.assetQuery);
    });

    refs.attributeSearch.addEventListener("input", () => {
      state.attributeQuery = refs.attributeSearch.value.trim();
      renderAttributes();
    });

    refs.cancel.addEventListener("click", () => cleanup(null));
    refs.close.addEventListener("click", () => cleanup(null));
    refs.apply.addEventListener("click", () => cleanup(Array.from(selectedTags.values())));

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) cleanup(null);
    });

    document.addEventListener("keydown", onKeyDown);

    renderSelectedTags();
    renderAssets();
    renderAttributes();
  });
}
