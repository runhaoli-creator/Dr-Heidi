/* Top-level app: routes between Home (run picker) and Run (stage). */
import { store } from "./state.js";
import { api } from "./api.js";
import { startReplay, stopReplay } from "./eventStream.js";
import { renderStage } from "./components/Stage.js";
import { renderTransport } from "./components/Timeline.js";
import { renderLibrary } from "./components/Library.js";
import { showIdeaModal, closeModal } from "./components/Modal.js";
import { closeInspectionPanel } from "./components/InspectionPanel.js";
import { fireConfetti } from "./components/Confetti.js";

const root = document.getElementById("app");

let lastAcceptedSlug = null;

async function bootstrap() {
  try {
    const [runs, papers, ideas] = await Promise.all([
      api.runs(), api.papers(), api.ideas(),
    ]);
    store.set({ runs, papers, ideas });
  } catch (e) {
    root.innerHTML = `<div class="error-box">Backend unreachable. Is the FastAPI server running?<br><br>${escapeHtml(String(e))}</div>`;
    return;
  }
  // initial route
  const path = window.location.pathname;
  if (path.startsWith("/run/")) {
    const runId = decodeURIComponent(path.slice(5));
    enterRun(runId);
  } else {
    store.set({ route: { name: "home" } });
  }
  // listen for URL changes (back/forward)
  window.addEventListener("popstate", () => {
    const p = window.location.pathname;
    if (p.startsWith("/run/")) {
      enterRun(decodeURIComponent(p.slice(5)));
    } else {
      stopReplay();
      store.set({ route: { name: "home" } });
    }
  });
  store.subscribe(rerender);
  rerender(store.state);
}

async function enterRun(runId) {
  closeInspectionPanel(); closeModal();
  history.pushState({}, "", `/run/${encodeURIComponent(runId)}`);
  try {
    const run = await api.run(runId);
    store.set({ route: { name: "run", runId }, run });
    startReplay(runId, { speed: store.state.speed || "4" });
  } catch (e) {
    store.set({ route: { name: "home" }, run: null });
    console.error(e);
  }
}

function leaveRun() {
  stopReplay();
  closeInspectionPanel(); closeModal();
  history.pushState({}, "", "/");
  store.set({ route: { name: "home" }, run: null, events: [], headSeq: 0, agents: {}, bubbles: {}, noveltyActive: [], validator: null });
}

function rerender(state) {
  // detect newly-accepted idea for confetti
  if (state.acceptedIdea && state.acceptedIdea.slug !== lastAcceptedSlug) {
    lastAcceptedSlug = state.acceptedIdea.slug;
    fireConfetti();
  } else if (!state.acceptedIdea) {
    lastAcceptedSlug = null;
  }

  if (state.route.name === "home") {
    root.innerHTML = "";
    root.appendChild(renderHeader(state));
    root.appendChild(renderHome(state));
  } else {
    root.innerHTML = "";
    root.appendChild(renderHeader(state, true));
    root.appendChild(renderRunPage(state));
  }
}

function renderHeader(state, inRun = false) {
  const h = document.createElement("header");
  h.className = "app-header";
  const brand = document.createElement("div");
  brand.className = "brand";
  brand.innerHTML = `<span class="logo">🦔</span> <span>Dr. Heidi</span> <small style="color:var(--ink-soft);font-weight:400">replay viewer</small>`;
  brand.addEventListener("click", () => leaveRun());
  h.appendChild(brand);

  if (inRun && state.run) {
    const meta = document.createElement("div");
    meta.className = "header-meta";
    meta.innerHTML = `<strong>${escapeHtml(state.run.title || state.run.run_id)}</strong> &nbsp;·&nbsp; ${escapeHtml(state.run.project_label || "")} &nbsp;·&nbsp; ${state.run.start_ts.replace("T", " ").slice(0, 19)}`;
    h.appendChild(meta);
  }

  const spacer = document.createElement("div");
  spacer.className = "header-spacer";
  h.appendChild(spacer);

  // sound toggle
  const sound = document.createElement("button");
  sound.className = "sound-toggle ghost";
  sound.textContent = state.sound ? "🔊" : "🔇";
  sound.title = "Toggle sound";
  sound.addEventListener("click", () => store.set({ sound: !state.sound }));
  h.appendChild(sound);

  // token meter
  const tok = document.createElement("span");
  tok.className = "tok-meter";
  // We don't have real per-token usage here; show event count + estimated tokens by char count
  const charCount = state.events.reduce((acc, e) => acc + ((e.payload && e.payload.text) ? e.payload.text.length : 0), 0);
  const estTokens = Math.round(charCount / 4);
  tok.innerHTML = `⛁ ${state.events.length} ev · ~${formatNum(estTokens)} tok`;
  tok.title = "Estimated from text length (≈4 chars/token). Real per-call usage isn't always persisted.";
  h.appendChild(tok);

  return h;
}

function renderHome(state) {
  const home = document.createElement("div");
  home.className = "home";
  home.innerHTML = `
    <h1>Replay viewer</h1>
    <div class="sub">Watch past Dr. Heidi ideation runs as a two-character drama. Click any run below.</div>
  `;
  if (!state.runs.length) {
    home.innerHTML += `<p><em>No runs detected yet. Run <code>/ideate</code> in Claude Code on this project, then refresh.</em></p>`;
    return home;
  }
  // group runs by project
  const byProj = {};
  for (const r of state.runs) {
    (byProj[r.project_label] = byProj[r.project_label] || []).push(r);
  }
  for (const proj of Object.keys(byProj)) {
    const h2 = document.createElement("h3");
    h2.style.marginTop = "26px"; h2.style.fontSize = "13px"; h2.style.color = "var(--ink-soft)";
    h2.style.textTransform = "uppercase"; h2.style.letterSpacing = ".06em";
    h2.textContent = proj;
    home.appendChild(h2);
    const list = document.createElement("ul");
    list.className = "run-list";
    for (const r of byProj[proj]) {
      const li = document.createElement("li");
      li.className = "run-card";
      const left = document.createElement("div");
      left.innerHTML = `
        <div class="title">${escapeHtml(r.title)}</div>
        <div class="meta">${r.start_ts.replace("T", " ").slice(0, 19)} · ${r.agent_count} agents</div>
      `;
      const roles = document.createElement("div");
      roles.className = "roles";
      for (const role of r.roles) {
        const pill = document.createElement("span");
        pill.className = "role-pill " + role;
        pill.textContent = role;
        roles.appendChild(pill);
      }
      li.appendChild(left); li.appendChild(roles);
      li.addEventListener("click", () => enterRun(r.run_id));
      list.appendChild(li);
    }
    home.appendChild(list);
  }
  return home;
}

function renderRunPage(state) {
  const page = document.createElement("div");
  page.className = "run-page";

  const row = document.createElement("div");
  row.className = "stage-row";
  row.appendChild(renderStage(state));
  row.appendChild(renderLibrary(state.papers, state.lastFileWrite));
  page.appendChild(row);

  page.appendChild(renderTransport(state));

  // Accepted-idea floating banner (top-right)
  if (state.acceptedIdea) {
    const banner = document.createElement("div");
    banner.style.position = "fixed";
    banner.style.bottom = "100px"; banner.style.right = "350px";
    banner.style.background = "var(--bg-card)";
    banner.style.border = "2px solid var(--green)";
    banner.style.borderRadius = "10px";
    banner.style.padding = "10px 14px";
    banner.style.boxShadow = "var(--shadow)";
    banner.style.zIndex = "20";
    banner.style.maxWidth = "260px";
    banner.innerHTML = `<div style="font-weight:600;margin-bottom:4px">🎉 Idea accepted</div>
      <div style="font-size:12.5px"><a href="#" data-slug="${escapeHtml(state.acceptedIdea.slug)}">${escapeHtml(state.acceptedIdea.slug)}</a></div>`;
    banner.querySelector("a").addEventListener("click", (e) => { e.preventDefault(); showIdeaModal(state.acceptedIdea.slug); });
    page.appendChild(banner);
  }

  return page;
}

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"]/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;",
  }[c]));
}
function formatNum(n) {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return (n / 1000).toFixed(1) + "k";
  return (n / 1_000_000).toFixed(1) + "M";
}

bootstrap();
