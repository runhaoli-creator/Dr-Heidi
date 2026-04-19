/* The main scene: two main characters with bubbles, novelty/validator overlays. */
import { renderCharacter } from "./Character.js";
import { renderBubble } from "./Bubble.js";
import { renderNoveltyInterrupt } from "./NoveltyInterrupt.js";
import { renderValidatorStamp } from "./ValidatorStamp.js";
import { showInspectionPanel } from "./InspectionPanel.js";

const MAIN_ORDER = ["lead-researcher", "reviewer"];

export function renderStage(state) {
  const stage = document.createElement("div");
  stage.className = "stage";

  const floor = document.createElement("div");
  floor.className = "stage-floor";
  stage.appendChild(floor);

  // Pick the most-recent agent_id per main role to display
  const mainsByRole = {};
  for (const role of MAIN_ORDER) {
    const agentsForRole = Object.values(state.agents).filter(a => a.role === role);
    if (agentsForRole.length) mainsByRole[role] = agentsForRole[agentsForRole.length - 1];
  }

  const row = document.createElement("div");
  row.className = "character-row";

  // Slot 1: ideator (left)
  row.appendChild(renderSlot("lead-researcher", mainsByRole["lead-researcher"], state, "right"));
  // Slot 2: reviewer (right)
  row.appendChild(renderSlot("reviewer", mainsByRole["reviewer"], state, "left"));

  stage.appendChild(row);

  // Novelty interrupt overlay (always rendered if any novelty agent active in last 90s)
  if (state.noveltyActive && state.noveltyActive.length) {
    stage.appendChild(renderNoveltyInterrupt(state.noveltyActive, state));
  }

  // Validator stamp overlay
  if (state.validator) {
    stage.appendChild(renderValidatorStamp(state.validator));
  }

  return stage;
}

function renderSlot(role, agent, state, bubbleSide) {
  if (!agent) {
    // empty slot — show ghosted role placeholder
    const ph = document.createElement("div");
    ph.className = "character away";
    ph.innerHTML = `
      <div class="body" style="opacity:.3"></div>
      <div class="label">${role === "lead-researcher" ? "Ideator" : "Reviewer"}</div>
      <div class="substatus">— offstage —</div>
    `;
    return ph;
  }
  const bubble = state.bubbles[agent.agent_id];
  const bubbleEl = bubble ? renderBubble(bubble, bubbleSide, { tool: agent.lastTool ? agent.lastTool.tool : "" }) : null;
  return renderCharacter(agent, {
    bubble: bubbleEl,
    onClick: () => showInspectionPanel(agent.agent_id),
  });
}
