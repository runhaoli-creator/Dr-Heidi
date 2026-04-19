/* Validator stamp card with C1-C5 ✓/✗ + final verdict stamp. */
import { inspectorSprite } from "../sprites/index.js";

const CHECK_LABELS = {
  C1: "claim-capability",
  C2: "benchmark fitness",
  C3: "circularity",
  C4: "expected-signal",
  C5: "Risks ↔ Approach",
};

export function renderValidatorStamp(validator) {
  const card = document.createElement("div");
  card.className = "validator-card";

  const sprite = document.createElement("div");
  sprite.style.width = "90px"; sprite.style.height = "120px"; sprite.style.margin = "0 auto 4px";
  sprite.innerHTML = inspectorSprite("happy");
  card.appendChild(sprite);

  const title = document.createElement("div");
  title.style.fontWeight = "600";
  title.style.marginBottom = "8px";
  title.textContent = "Inspector's verdict";
  card.appendChild(title);

  const checks = document.createElement("div");
  checks.className = "checks";
  for (const c of validator.checks || []) {
    const id = document.createElement("div");
    id.style.fontFamily = "var(--mono)"; id.textContent = c.id;
    const lbl = document.createElement("div");
    lbl.textContent = CHECK_LABELS[c.id] || "";
    const mk = document.createElement("div");
    mk.className = c.ok ? "ok" : "ng";
    mk.textContent = c.ok ? "✓" : "✗";
    checks.appendChild(id); checks.appendChild(lbl); checks.appendChild(mk);
  }
  if (!validator.checks || !validator.checks.length) {
    checks.textContent = "(no detailed checks parsed)";
    checks.style.color = "var(--ink-soft)";
  }
  card.appendChild(checks);

  const stamp = document.createElement("div");
  stamp.className = "stamp " + (validator.verdict || "pass");
  stamp.textContent = (validator.verdict || "pass").toUpperCase();
  card.appendChild(stamp);

  return card;
}
