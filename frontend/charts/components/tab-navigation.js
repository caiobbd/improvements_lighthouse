function createTabButton(page, isActive, handlers) {
  const tab = document.createElement("div");
  tab.className = `tab-pill${isActive ? " active" : ""}`;
  tab.dataset.pageId = page.id;

  const main = document.createElement("button");
  main.type = "button";
  main.className = "tab-pill-main";
  main.title = page.name;
  main.addEventListener("click", () => handlers.onActivate(page.id));

  const label = document.createElement("span");
  label.textContent = page.name;
  label.className = "tab-label";
  main.append(label);

  if (page.dirty) {
    const dot = document.createElement("span");
    dot.className = "dirty-dot";
    dot.title = "Unsaved changes";
    main.append(dot);
  }

  const rename = document.createElement("button");
  rename.type = "button";
  rename.className = "tab-pill-action icon-button";
  rename.textContent = "Edit";
  rename.title = "Rename page";
  rename.setAttribute("aria-label", `Rename page ${page.name}`);
  rename.addEventListener("click", (event) => {
    event.stopPropagation();
    const nextName = window.prompt("Rename page", page.name);
    if (!nextName || !nextName.trim()) return;
    handlers.onRename(page.id, nextName.trim());
  });

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "tab-pill-action tab-pill-delete icon-button";
  remove.textContent = "X";
  remove.title = "Delete page";
  remove.setAttribute("aria-label", `Delete page ${page.name}`);
  remove.disabled = handlers.totalPages <= 1;
  remove.addEventListener("click", (event) => {
    event.stopPropagation();
    if (!window.confirm(`Delete page "${page.name}"?`)) return;
    handlers.onDelete(page.id);
  });

  tab.append(main, rename, remove);
  return tab;
}

function createAddPageButton(onAddPage) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "primary-button";
  button.textContent = "New Page";
  button.addEventListener("click", () => {
    onAddPage();
  });
  return button;
}

function createTabStrip(pages, activePageId, handlers) {
  const strip = document.createElement("div");
  strip.className = "tab-strip";

  pages.forEach((page) => {
    strip.append(
      createTabButton(page, page.id === activePageId, {
        ...handlers,
        totalPages: pages.length,
      }),
    );
  });

  return strip;
}

function createPageActions(snapshot, actions) {
  const page = snapshot.pages.find((item) => item.id === snapshot.activePageId) || snapshot.pages[0];
  const wrapper = document.createElement("div");
  wrapper.className = "page-actions";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "secondary-button";
  trigger.textContent = "Actions";

  const menu = document.createElement("div");
  menu.className = "page-actions-menu";

  const duplicate = document.createElement("button");
  duplicate.type = "button";
  duplicate.textContent = "Duplicate Page";
  duplicate.addEventListener("click", () => {
    actions.duplicatePage(page.id);
  });

  const rename = document.createElement("button");
  rename.type = "button";
  rename.textContent = "Rename Page";
  rename.addEventListener("click", () => {
    const nextName = window.prompt("Rename page", page.name);
    if (!nextName || !nextName.trim()) return;
    actions.renamePage(page.id, nextName.trim());
  });

  const remove = document.createElement("button");
  remove.type = "button";
  remove.textContent = "Delete Page";
  remove.disabled = snapshot.pages.length <= 1;
  remove.addEventListener("click", () => {
    if (!window.confirm(`Delete page "${page.name}"?`)) return;
    actions.deletePage(page.id);
  });

  menu.append(duplicate, rename, remove);
  wrapper.append(trigger, menu);
  return wrapper;
}

export function renderTabNavigation(container, snapshot, actions) {
  container.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.className = "tab-navigation";

  const strip = createTabStrip(snapshot.pages, snapshot.activePageId, {
    onActivate: actions.setActivePage,
    onRename: actions.renamePage,
    onDelete: actions.deletePage,
  });

  const controls = document.createElement("div");
  controls.className = "tab-navigation-controls";
  controls.append(createAddPageButton(actions.addPage), createPageActions(snapshot, actions));

  wrapper.append(strip, controls);
  container.append(wrapper);
}

