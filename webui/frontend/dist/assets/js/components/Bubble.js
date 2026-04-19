/* Speech / thought bubble with simple typewriter rendering. */

export function renderBubble(b, side = "above", { tool = "" } = {}) {
  const el = document.createElement("div");
  el.className = "bubble " + (b.kind === "thought" ? "thought " : "") + side;
  // Truncate long text — keep first ~600 chars + "…"
  const text = (b.text || "").slice(0, 800);
  const truncated = text.length < (b.full || "").length;
  el.textContent = text + (truncated ? "…" : "");
  if (tool) {
    const meta = document.createElement("div");
    meta.className = "bubble-meta";
    meta.innerHTML = `<span>${b.role}</span><span>${tool}</span>`;
    el.appendChild(meta);
  }
  return el;
}
