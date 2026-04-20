function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeUrl(url) {
  const raw = String(url ?? "").trim();
  if (!raw) return "#";
  if (/^https?:\/\//i.test(raw) || /^mailto:/i.test(raw)) {
    return raw;
  }
  return "#";
}

function applyInlineMarkdown(value) {
  let html = escapeHtml(value);
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
    const safeHref = sanitizeUrl(href);
    return `<a href="${escapeHtml(safeHref)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  });
  return html;
}

function renderFallback(source) {
  const escaped = escapeHtml(source).replace(/\n/g, "<br />");
  return escaped ? `<p>${escaped}</p>` : "";
}

function renderBlocks(source) {
  const lines = source.split("\n");
  const blocks = [];
  let paragraph = [];
  let listItems = [];

  function flushParagraph() {
    if (!paragraph.length) return;
    const joined = paragraph.join("<br />");
    blocks.push(`<p>${joined}</p>`);
    paragraph = [];
  }

  function flushList() {
    if (!listItems.length) return;
    blocks.push(`<ul>${listItems.map((item) => `<li>${item}</li>`).join("")}</ul>`);
    listItems = [];
  }

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }

    const listMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    if (listMatch) {
      flushParagraph();
      listItems.push(applyInlineMarkdown(listMatch[1]));
      return;
    }

    flushList();
    paragraph.push(applyInlineMarkdown(trimmed));
  });

  flushParagraph();
  flushList();
  return blocks.join("");
}

function renderSafeMarkdown(source) {
  const text = String(source ?? "").replace(/\r\n?/g, "\n").trim();
  if (!text) {
    return {
      html: "",
      hasContent: false,
      usedFallback: false,
    };
  }

  try {
    const html = renderBlocks(text);
    if (html.trim()) {
      return {
        html,
        hasContent: true,
        usedFallback: false,
      };
    }
  } catch (_error) {
    // Fallback to escaped raw text below.
  }

  return {
    html: renderFallback(text),
    hasContent: true,
    usedFallback: true,
  };
}

export { escapeHtml, renderSafeMarkdown };
