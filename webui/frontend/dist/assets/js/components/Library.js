/* Library sidebar — list of papers in KB, click to view notes.md modal. */
import { showPaperModal } from "./Modal.js";

export function renderLibrary(papers, lastFileWrite) {
  const el = document.createElement("aside");
  el.className = "library";

  const head = document.createElement("div");
  head.className = "library-header";
  const digested = papers.filter(p => p.digested).length;
  head.innerHTML = `<span>📚 Library</span><span class="count">${digested} digested · ${papers.length - digested} metadata</span>`;
  el.appendChild(head);

  const list = document.createElement("div");
  list.className = "library-list";
  // Show digested papers first
  const sorted = [...papers].sort((a, b) => Number(b.digested) - Number(a.digested) || (b.published || "").localeCompare(a.published || ""));
  for (const p of sorted.slice(0, 200)) {
    const item = document.createElement("div");
    item.className = "paper-item";
    if (lastFileWrite && lastFileWrite.path && lastFileWrite.path.includes(p.arxiv_id)) {
      item.classList.add("highlight");
    }
    item.innerHTML = `
      <div class="check ${p.digested ? "" : "no"}">${p.digested ? "✓" : "·"}</div>
      <div>
        <div class="title">${escapeHtml(p.title)}</div>
        <div class="id">${p.arxiv_id}${p.matched_groups && p.matched_groups.length ? ' · ' + p.matched_groups.join(", ") : ''}</div>
      </div>
    `;
    item.addEventListener("click", () => showPaperModal(p.arxiv_id));
    list.appendChild(item);
  }
  el.appendChild(list);
  return el;
}

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"]/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;",
  }[c]));
}
