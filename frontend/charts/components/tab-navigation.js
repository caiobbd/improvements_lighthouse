const TAB_CLOSE_GLYPH = "\u00D7";

function createTab(page, isActive, canDelete, actions) {
  const tab = document.createElement("div");
  tab.className = `browser-tab${isActive ? " active" : ""}`;
  tab.dataset.pageId = page.id;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "browser-tab-button";
  button.title = page.name;
  button.setAttribute("aria-label", `Open page ${page.name}`);
  button.addEventListener("click", () => actions.setActivePage(page.id));

  const label = document.createElement("span");
  label.className = "browser-tab-label";
  label.textContent = page.name;
  button.append(label);

  if (page.dirty) {
    const dot = document.createElement("span");
    dot.className = "dirty-dot";
    dot.title = "Unsaved changes";
    dot.setAttribute("aria-label", "Unsaved changes");
    button.append(dot);
  }

  tab.append(button);

  if (canDelete) {
    const close = document.createElement("button");
    close.type = "button";
    close.className = "browser-tab-close";
    close.textContent = TAB_CLOSE_GLYPH;
    close.title = `Delete page ${page.name}`;
    close.setAttribute("aria-label", `Delete page ${page.name}`);
    close.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!window.confirm(`Delete page "${page.name}"?`)) return;
      actions.deletePage(page.id);
    });
    tab.append(close);
  }

  return tab;
}

function createAddTabButton(onAddPage) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "browser-tab-add";
  button.textContent = "+";
  button.title = "Create new page";
  button.setAttribute("aria-label", "Create new page");
  button.addEventListener("click", () => onAddPage());
  return button;
}

export function renderTabNavigation(container, snapshot, actions) {
  container.innerHTML = "";

  const strip = document.createElement("div");
  strip.className = "browser-tab-strip";
  const canDelete = snapshot.pages.length > 1;

  snapshot.pages.forEach((page) => {
    strip.append(createTab(page, page.id === snapshot.activePageId, canDelete, actions));
  });

  strip.append(createAddTabButton(actions.addPage));
  container.append(strip);
}
