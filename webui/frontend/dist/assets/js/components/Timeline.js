/* Timeline scrubber with markers + transport controls. */
import { store } from "../state.js";
import { startReplay, stopReplay } from "../eventStream.js";

const MARKER_LABELS = {
  run_started: "start",
  papers_loaded: "papers ready",
  draft_written: "draft",
  novelty_called: "novelty?",
  novelty_returned: "novelty✓",
  first_critique: "first critique",
  verdict_decided: "verdict",
  revision_started: "revision",
  validator_stamped: "validator",
  run_done: "done",
};
const MARKER_GLYPH = {
  draft_written: "📝",
  novelty_called: "✋",
  novelty_returned: "📚",
  verdict_decided: "⚖",
  validator_stamped: "✓",
  run_done: "🏁",
  run_started: "▶",
};

export function renderTransport(state) {
  const bar = document.createElement("div");
  bar.className = "transport";

  // controls
  const ctrl = document.createElement("div");
  ctrl.className = "transport-controls";
  const pauseBtn = document.createElement("button");
  pauseBtn.textContent = state.paused ? "▶ play" : "⏸ pause";
  pauseBtn.addEventListener("click", () => togglePause());
  ctrl.appendChild(pauseBtn);

  const restartBtn = document.createElement("button");
  restartBtn.textContent = "⟲ restart";
  restartBtn.addEventListener("click", () => {
    if (state.run) startReplay(state.run.run_id, { speed: state.speed, fromSeq: 0 });
  });
  ctrl.appendChild(restartBtn);

  const speedWrap = document.createElement("div");
  speedWrap.className = "speed";
  for (const sp of ["1", "2", "4", "max"]) {
    const b = document.createElement("button");
    b.textContent = sp + (sp === "max" ? "" : "×");
    if (sp === state.speed) b.classList.add("active");
    b.addEventListener("click", () => {
      if (state.run) {
        store.set({ speed: sp });
        startReplay(state.run.run_id, { speed: sp, fromSeq: state.headSeq });
      }
    });
    speedWrap.appendChild(b);
  }
  ctrl.appendChild(speedWrap);
  bar.appendChild(ctrl);

  // timeline scrubber
  const tl = document.createElement("div");
  tl.className = "timeline";
  const track = document.createElement("div");
  track.className = "timeline-track";
  tl.appendChild(track);

  const total = (state.run && state.run.event_count) ? state.run.event_count - 1 : Math.max(state.events.length - 1, 1);
  const headPct = Math.min(100, (state.headSeq / total) * 100);

  const fill = document.createElement("div");
  fill.className = "timeline-fill";
  fill.style.width = headPct + "%";
  tl.appendChild(fill);

  // markers
  if (state.run && state.run.markers) {
    for (const m of state.run.markers) {
      const pct = Math.min(100, (m.seq / total) * 100);
      const md = document.createElement("div");
      md.className = "timeline-marker";
      md.style.left = pct + "%";
      md.dataset.marker = m.marker;
      md.textContent = MARKER_GLYPH[m.marker] || "•";
      const tt = document.createElement("div");
      tt.className = "tt";
      tt.textContent = MARKER_LABELS[m.marker] || m.marker;
      md.appendChild(tt);
      md.addEventListener("click", (e) => {
        e.stopPropagation();
        if (state.run) startReplay(state.run.run_id, { speed: state.speed, fromSeq: m.seq });
      });
      tl.appendChild(md);
    }
  }
  // playhead
  const head = document.createElement("div");
  head.className = "timeline-head";
  head.style.left = headPct + "%";
  tl.appendChild(head);

  // click anywhere on track to seek
  tl.addEventListener("click", (e) => {
    const rect = tl.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const seq = Math.max(0, Math.floor(x * total));
    if (state.run) startReplay(state.run.run_id, { speed: state.speed, fromSeq: seq });
  });

  bar.appendChild(tl);

  // status
  const stat = document.createElement("div");
  stat.className = "transport-status";
  stat.textContent = `seq ${state.headSeq} / ${total}  ·  ev ${state.events.length}`;
  bar.appendChild(stat);

  return bar;
}

function togglePause() {
  const s = store.state;
  if (s.paused) {
    if (s.run) startReplay(s.run.run_id, { speed: s.speed, fromSeq: s.headSeq });
    store.set({ paused: false });
  } else {
    stopReplay();
    store.set({ paused: true });
  }
}
