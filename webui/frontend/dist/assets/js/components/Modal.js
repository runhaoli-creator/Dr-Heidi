/* Modal dialogs for paper / idea content. */
import { api } from "../api.js";

let currentModal = null;

function open(content) {
  close();
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.appendChild(content);
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
  document.body.appendChild(backdrop);
  currentModal = backdrop;
  document.addEventListener("keydown", handleEsc);
}
function close() {
  if (currentModal) {
    currentModal.remove();
    currentModal = null;
    document.removeEventListener("keydown", handleEsc);
  }
}
function handleEsc(e) { if (e.key === "Escape") close(); }

function modalShell(title) {
  const m = document.createElement("div");
  m.className = "modal";
  m.innerHTML = `
    <header>
      <span class="title">${escapeHtml(title)}</span>
      <button class="close">close ✕</button>
    </header>
    <div class="body"><div class="content"><em>loading…</em></div></div>
  `;
  m.querySelector(".close").addEventListener("click", close);
  return m;
}

export async function showPaperModal(arxivId) {
  const m = modalShell(`paper · ${arxivId}`);
  open(m);
  const body = m.querySelector(".content");
  try {
    const notes = await api.paper(arxivId, "notes").catch(() => null);
    let html = "";
    if (notes && notes.text) {
      html += `<pre>${escapeHtml(notes.text)}</pre>`;
    } else {
      html += `<p><em>This paper has not been digested yet (no notes.md). Showing metadata.</em></p>`;
      const meta = await api.paper(arxivId, "metadata").catch(() => null);
      if (meta) html += `<pre>${escapeHtml(meta.text)}</pre>`;
    }
    body.innerHTML = html;
  } catch (e) {
    body.innerHTML = `<p style="color: var(--red)">${escapeHtml(String(e))}</p>`;
  }
}

export async function showIdeaModal(slug) {
  const m = modalShell(`idea · ${slug}`);
  open(m);
  const body = m.querySelector(".content");
  try {
    const text = (await api.idea(slug)).text;
    // Render markdown lightly: turn ## headings into bold, keep --- separators
    body.innerHTML = `<pre>${escapeHtml(text)}</pre>`;
  } catch (e) {
    body.innerHTML = `<p style="color: var(--red)">${escapeHtml(String(e))}</p>`;
  }
}

export function closeModal() { close(); }

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"]/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;",
  }[c]));
}
