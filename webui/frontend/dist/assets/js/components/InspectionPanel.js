/* Slide-in inspection panel for one agent's full event log. */
import { store } from "../state.js";
import { TOOL_ICON } from "../sprites/index.js";

let openPanel = null;

export function showInspectionPanel(agentId) {
  closeInspectionPanel();
  const state = store.state;
  const agent = state.agents[agentId];
  if (!agent) return;
  const events = state.events.filter(e => e.agent_id === agentId);

  const panel = document.createElement("aside");
  panel.className = "inspect-panel open";
  panel.innerHTML = `
    <header>
      <span class="title">${escapeHtml(agent.role)}<br><small style="font-family:var(--mono);font-size:11px;color:var(--ink-soft)">${agent.agent_id.slice(0, 12)}…</small></span>
      <button class="close">close ✕</button>
    </header>
    <div class="body"></div>
  `;
  panel.querySelector(".close").addEventListener("click", closeInspectionPanel);

  const body = panel.querySelector(".body");

  // status section
  const statusSec = section("Status");
  statusSec.appendChild(p(`<strong>Status:</strong> ${agent.status} · ${agent.alive ? "alive" : "done"}`));
  statusSec.appendChild(p(`<strong>Tools used:</strong> ${countTools(events)}`));
  body.appendChild(statusSec);

  // text history
  const texts = events.filter(e => e.type === "agent.text" || e.type === "agent.thinking");
  if (texts.length) {
    const sec = section("Output (latest first)");
    for (const t of texts.slice().reverse().slice(0, 6)) {
      const pre = document.createElement("pre");
      pre.style.background = t.type === "agent.thinking" ? "var(--accent-soft)" : "var(--line-soft)";
      pre.textContent = (t.payload?.text || "").slice(0, 600);
      sec.appendChild(pre);
    }
    body.appendChild(sec);
  }

  // tool log
  const tools = events.filter(e => e.type === "agent.tool_use");
  if (tools.length) {
    const sec = section(`Tools (${tools.length})`);
    for (const t of tools.slice(-12)) {
      const row = document.createElement("div");
      row.style.marginBottom = "4px";
      row.innerHTML = `<span style="font-family:var(--mono);font-size:11.5px"><span style="margin-right:4px">${TOOL_ICON[t.payload.tool] || TOOL_ICON.default}</span>${escapeHtml(t.payload.tool)}</span> <small style="color:var(--ink-soft)">${escapeHtml(t.payload.args_summary || "")}</small>`;
      sec.appendChild(row);
    }
    body.appendChild(sec);
  }

  // file writes
  const writes = events.filter(e => e.type === "file.write");
  if (writes.length) {
    const sec = section(`Files written (${writes.length})`);
    for (const w of writes) {
      sec.appendChild(p(`<code>${escapeHtml(w.payload.path)}</code> · <em>${w.payload.kind}</em>`));
    }
    body.appendChild(sec);
  }

  document.body.appendChild(panel);
  openPanel = panel;
}

export function closeInspectionPanel() {
  if (openPanel) {
    openPanel.remove();
    openPanel = null;
  }
}

function section(title) {
  const s = document.createElement("div");
  s.className = "section";
  s.innerHTML = `<h4>${title}</h4>`;
  return s;
}
function p(html) {
  const el = document.createElement("p");
  el.style.margin = "0 0 6px";
  el.innerHTML = html;
  return el;
}
function countTools(events) {
  const counts = {};
  for (const e of events) if (e.type === "agent.tool_use") counts[e.payload.tool] = (counts[e.payload.tool] || 0) + 1;
  return Object.entries(counts).map(([k, n]) => `${k}×${n}`).join(", ") || "none";
}
function escapeHtml(s) {
  return String(s || "").replace(/[&<>"]/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;",
  }[c]));
}
