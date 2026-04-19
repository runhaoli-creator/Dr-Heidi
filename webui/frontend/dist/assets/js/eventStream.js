/* Consume SSE event stream for one run, drive the store. */

import { store } from "./state.js";
import { api } from "./api.js";

const MAIN_ROLES = new Set(["lead-researcher", "reviewer"]);

function freshAgentSlot(role, agent_id, idx) {
  return {
    role, agent_id, idx,
    status: "idle",                // idle | thinking | tool | writing | speaking | done
    lastTool: null,
    tools: [],                     // recent tools, capped
    speakingText: "",              // current speech bubble text
    speakingFull: null,            // null while still streaming, full string when complete
    thoughtText: "",               // current thought bubble
    visible: true,
    alive: true,
    isMain: MAIN_ROLES.has(role),
  };
}

export function startReplay(runId, { speed = "4", fromSeq = 0 } = {}) {
  // close any prior connection
  if (window.__SSE__) try { window.__SSE__.close(); } catch (e) {}
  // reset state for this run
  store.set({
    events: [],
    headSeq: fromSeq,
    agents: {},
    bubbles: {},
    noveltyActive: [],
    validator: null,
    tokens: { in: 0, out: 0, ev: 0 },
    paused: false,
    speed,
    lastFileWrite: null,
    acceptedIdea: null,
  });

  const url = api.eventsUrl(runId, { speed, fromSeq });
  const es = new EventSource(url);
  window.__SSE__ = es;

  es.addEventListener("agent-event", (raw) => {
    try {
      const ev = JSON.parse(raw.data);
      handle(ev);
    } catch (e) {
      console.error("bad event payload", e);
    }
  });
  es.addEventListener("stream-done", () => {
    es.close();
    store.set({ paused: false });
    window.__SSE__ = null;
  });
  es.onerror = (err) => {
    console.error("SSE error", err);
  };
  return es;
}

export function stopReplay() {
  if (window.__SSE__) {
    try { window.__SSE__.close(); } catch (e) {}
    window.__SSE__ = null;
  }
}

function ensureAgent(role, agent_id) {
  const s = store.state.agents;
  if (!agent_id) return null;
  if (!s[agent_id]) {
    const idx = Object.keys(s).filter(id => s[id].role === role).length;
    s[agent_id] = freshAgentSlot(role, agent_id, idx);
  }
  return s[agent_id];
}

function pushTool(a, tool, args_summary) {
  a.tools.push({ tool, args_summary, ts: Date.now() });
  if (a.tools.length > 10) a.tools.splice(0, a.tools.length - 10);
  a.lastTool = { tool, args_summary };
  a.status = "tool";
}

function setSpeech(a, text) {
  a.speakingText = text;
  a.speakingFull = text;
  a.status = "speaking";
  store.state.bubbles[a.agent_id] = {
    kind: "speech",
    text, full: text, agent_id: a.agent_id, role: a.role,
  };
}

function setThought(a, text) {
  a.thoughtText = text;
  a.status = "thinking";
  store.state.bubbles[a.agent_id] = {
    kind: "thought",
    text, full: text, agent_id: a.agent_id, role: a.role,
  };
}

function clearBubble(agent_id) {
  delete store.state.bubbles[agent_id];
}

function handle(ev) {
  const s = store.state;
  s.events.push(ev);
  s.headSeq = ev.seq;
  s.tokens.ev = s.events.length;

  switch (ev.type) {
    case "marker":
      // markers are signals only; rendered on timeline by the events array
      break;

    case "agent.spawn": {
      const role = ev.agent_role;
      const agent_id = ev.agent_id;
      if (!agent_id) break;
      const a = ensureAgent(role, agent_id);
      a.alive = true;
      a.visible = true;
      a.status = "thinking";
      // For novelty-checker, also push to noveltyActive list
      if (role === "novelty-checker") {
        s.noveltyActive.push({ agent_id, role, text: "", started: ev.ts });
      }
      break;
    }

    case "agent.thinking": {
      const a = ensureAgent(ev.agent_role, ev.agent_id);
      if (!a) break;
      const text = (ev.payload && ev.payload.text) || "";
      setThought(a, text);
      break;
    }

    case "agent.tool_use": {
      const a = ensureAgent(ev.agent_role, ev.agent_id);
      if (!a) break;
      pushTool(a, ev.payload.tool || "?", ev.payload.args_summary || "");
      // Sometimes tool_use immediately follows speech — keep bubble; just update status under sprite
      break;
    }

    case "agent.tool_result": {
      const a = ensureAgent(ev.agent_role, ev.agent_id);
      if (!a) break;
      // Don't change status — next agent.text or tool_use will
      break;
    }

    case "agent.text": {
      const a = ensureAgent(ev.agent_role, ev.agent_id);
      if (!a) break;
      const text = (ev.payload && ev.payload.text) || "";
      const looksLikeFile = ev.payload && ev.payload.looks_like === "file_content";
      if (looksLikeFile) {
        a.status = "writing";
      } else {
        setSpeech(a, text);
        // For novelty-checker active bursts, latch the text on the active list
        if (a.role === "novelty-checker") {
          const last = s.noveltyActive.find(n => n.agent_id === a.agent_id);
          if (last) last.text = text;
        }
      }
      break;
    }

    case "file.write": {
      const path = ev.payload.path || "";
      const kind = ev.payload.kind || "other";
      s.lastFileWrite = { path, kind, ts: ev.ts };
      // accepted idea reveal
      if (kind === "accepted") {
        const slug = path.split("/").pop().replace(/\.md$/, "");
        s.acceptedIdea = { slug, path, ts: ev.ts };
      }
      // signal: highlight library if a paper notes/gaps was written
      if (kind === "digest_notes" || kind === "digest_gaps") {
        // pulse handled by Library component reading lastFileWrite
      }
      break;
    }

    case "agent.done": {
      const a = ensureAgent(ev.agent_role, ev.agent_id);
      if (!a) break;
      a.status = "done";
      a.alive = false;
      // Don't clear the main characters' bubbles — keep last speech visible.
      // But for novelty-checker & validator, clear (we render their state separately).
      if (ev.agent_role === "novelty-checker" || ev.agent_role === "idea-validator") {
        clearBubble(a.agent_id);
      }
      // Validator: extract checks from its last text
      if (ev.agent_role === "idea-validator") {
        const lastTextEv = [...s.events].reverse().find(
          e => e.agent_id === ev.agent_id && e.type === "agent.text"
        );
        if (lastTextEv) {
          s.validator = parseValidatorOutput(lastTextEv.payload.text || "");
        }
      }
      // For novelty-checker: keep them for a bit, then collapse
      if (ev.agent_role === "novelty-checker") {
        // Keep on active list a moment more; UI handles fade-out
      }
      break;
    }
  }
  store.emit();
}

/* Parse validator's output text to extract C1-C5 checks + verdict. */
function parseValidatorOutput(text) {
  const checks = [];
  const re = /-\s*(C\d)[^:]*:\s*([✓✗xX])/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    checks.push({ id: m[1], ok: m[2] === "✓" });
  }
  let verdict = "pass";
  if (/verdict[:\s]+downgrade/i.test(text)) verdict = "downgrade";
  else if (/verdict[:\s]+patch/i.test(text)) verdict = "patch";
  else if (/verdict[:\s]+pass/i.test(text)) verdict = "pass";
  return { checks, verdict };
}
