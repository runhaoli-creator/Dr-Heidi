/* Render a character (sprite + label + tool stack + bubble). */
import { ideatorSprite, reviewerSprite, librarianSprite, inspectorSprite, TOOL_ICON } from "../sprites/index.js";

const SPRITE_FOR_ROLE = {
  "lead-researcher": ideatorSprite,
  "reviewer": reviewerSprite,
  "novelty-checker": librarianSprite,
  "idea-validator": inspectorSprite,
};

const LABEL_FOR_ROLE = {
  "lead-researcher": "Ideator",
  "reviewer": "Reviewer",
  "novelty-checker": "Librarian",
  "idea-validator": "Inspector",
};

const SUBSTATUS_FOR_STATE = {
  idle: " ",
  thinking: "thinking…",
  tool: "running tool",
  writing: "writing…",
  speaking: "speaking",
  done: "done",
};

export function renderCharacter(agent, opts = {}) {
  const role = agent.role;
  const sprite = SPRITE_FOR_ROLE[role] || ideatorSprite;
  const label = LABEL_FOR_ROLE[role] || role;
  const sub = agent.status === "tool" && agent.lastTool
    ? `${agent.lastTool.tool}…`
    : SUBSTATUS_FOR_STATE[agent.status] || agent.status;
  const visualState = stateToVisual(agent.status, agent.role);

  const el = document.createElement("div");
  el.className = "character" + (agent.alive ? "" : " away");
  el.dataset.agentId = agent.agent_id;
  el.dataset.role = role;

  const body = document.createElement("div");
  body.className = "body";
  body.innerHTML = sprite(visualState);
  el.appendChild(body);

  const lbl = document.createElement("div");
  lbl.className = "label";
  lbl.textContent = label;
  el.appendChild(lbl);

  const ss = document.createElement("div");
  ss.className = "substatus";
  ss.textContent = sub;
  el.appendChild(ss);

  // tool stack
  if (agent.tools && agent.tools.length) {
    const stack = document.createElement("div");
    stack.className = "tool-stack";
    const recent = agent.tools.slice(-3);
    for (const t of recent) {
      const b = document.createElement("div");
      b.className = "tool-badge";
      const icon = TOOL_ICON[t.tool] || TOOL_ICON.default;
      b.innerHTML = `<span class="icon">${icon}</span><span>${escapeHtml(t.tool)}${t.args_summary ? ' · ' + escapeHtml(t.args_summary).slice(0, 40) : ''}</span>`;
      stack.appendChild(b);
    }
    el.appendChild(stack);
  }

  // bubble (positioned absolutely relative to character)
  if (opts.bubble) {
    el.appendChild(opts.bubble);
  }

  if (opts.onClick) {
    el.addEventListener("click", opts.onClick);
  }
  return el;
}

function stateToVisual(status, role) {
  if (status === "thinking") return "thinking";
  if (status === "tool" || status === "writing") return "writing";
  if (status === "speaking") return "speaking";
  if (status === "done") {
    if (role === "reviewer") return "frown";
    return "happy";
  }
  return "idle";
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;",
  }[c]));
}
