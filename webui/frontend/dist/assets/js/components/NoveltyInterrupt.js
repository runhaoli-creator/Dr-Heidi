/* Novelty-checker walk-on overlay.
   Per user spec: parallel spawns multiply into N mini-librarians in a row.
   Single spawn = full librarian sprite + bubble.
*/
import { librarianSprite, miniLibrarianSprite } from "../sprites/index.js";
import { showInspectionPanel } from "./InspectionPanel.js";

export function renderNoveltyInterrupt(noveltyAgents, state) {
  const wrap = document.createElement("div");
  wrap.style.position = "absolute";
  wrap.style.left = "50%";
  wrap.style.top = "10px";
  wrap.style.transform = "translateX(-50%)";
  wrap.style.zIndex = "8";
  wrap.style.display = "flex";
  wrap.style.flexDirection = "column";
  wrap.style.alignItems = "center";
  wrap.style.gap = "8px";
  wrap.style.pointerEvents = "none";   // wrap is transparent to clicks
  wrap.style.maxWidth = "560px";

  // Decide whether to show the parallel-row view or the collapsed single-librarian view.
  // Per spec: librarians multiply into N, collapse back to 1 for summary when all done.
  const aliveCount = noveltyAgents.filter(a => {
    const ag = state.agents[a.agent_id];
    return ag && ag.status !== "done";
  }).length;
  const allDone = aliveCount === 0 && noveltyAgents.length > 0;
  const n = allDone ? 1 : noveltyAgents.length;
  const displayList = allDone
    ? [noveltyAgents[noveltyAgents.length - 1]]   // collapse to the latest one
    : noveltyAgents;

  if (n === 1) {
    // single librarian, compact sprite + small bubble
    const a = displayList[0];
    const block = document.createElement("div");
    block.style.position = "relative";
    block.style.display = "flex";
    block.style.flexDirection = "row";
    block.style.alignItems = "flex-start";
    block.style.gap = "10px";
    block.style.cursor = "pointer";
    block.style.pointerEvents = "auto";        // clicks land here

    const body = document.createElement("div");
    body.style.width = "70px"; body.style.height = "92px"; body.style.flexShrink = "0";
    const ag = state.agents[a.agent_id];
    const status = ag && ag.status === "speaking" ? "speaking" : (allDone ? "speaking" : "alert");
    body.innerHTML = librarianSprite(status);
    block.appendChild(body);

    if (a.text) {
      const bubble = document.createElement("div");
      bubble.className = "bubble";
      bubble.style.position = "relative";
      bubble.style.maxWidth = "440px";
      bubble.style.marginTop = "10px";
      bubble.style.fontSize = "12.5px";
      bubble.textContent = (a.text || "").slice(0, 360) + ((a.text || "").length > 360 ? "…" : "");
      block.appendChild(bubble);
    }
    block.addEventListener("click", () => showInspectionPanel(a.agent_id));
    wrap.appendChild(block);
  } else {
    // multiple parallel — row of mini-librarians + a single shared headline bubble
    const banner = document.createElement("div");
    banner.className = "bubble";
    banner.style.position = "relative";
    banner.style.maxWidth = "440px";
    banner.style.fontWeight = "600";
    banner.style.fontSize = "12.5px";
    banner.style.pointerEvents = "auto";
    banner.textContent = `${n} librarians researching in parallel`;
    wrap.appendChild(banner);

    const row = document.createElement("div");
    row.style.display = "flex"; row.style.gap = "4px"; row.style.alignItems = "flex-end";
    row.style.pointerEvents = "auto";
    for (const a of noveltyAgents) {
      const mini = document.createElement("div");
      mini.style.width = "44px"; mini.style.height = "60px";
      mini.style.cursor = "pointer";
      mini.title = `librarian #${noveltyAgents.indexOf(a) + 1}`;
      mini.innerHTML = miniLibrarianSprite();
      mini.addEventListener("click", () => showInspectionPanel(a.agent_id));
      row.appendChild(mini);
    }
    wrap.appendChild(row);
  }
  return wrap;
}
