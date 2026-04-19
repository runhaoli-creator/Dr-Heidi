/* SVG sprite primitives.
   Each sprite is parameterized by a `state` string:
     "idle" | "thinking" | "tool" | "writing" | "speaking" | "happy" | "frown"
   Sprites use flat-vector style with a small color palette per role. */

const COLORS = {
  ink: "#1f2024",
  paper: "#fbf9f4",
  warm: "#f4cf6e",
  pink: "#f9c8d2",
  blue: "#cfdbff",
  teal: "#bfece8",
  green: "#cfeed9",
  purple: "#e0cdf5",
  red: "#f8c7c1",
};

function eyes(state, cx1 = 50, cx2 = 80) {
  if (state === "thinking") {
    return `<g><line x1="${cx1 - 4}" y1="58" x2="${cx1 + 4}" y2="58" stroke="${COLORS.ink}" stroke-width="2.5" stroke-linecap="round"/><line x1="${cx2 - 4}" y1="58" x2="${cx2 + 4}" y2="58" stroke="${COLORS.ink}" stroke-width="2.5" stroke-linecap="round"/></g>`;
  }
  if (state === "happy") {
    return `<g><path d="M${cx1 - 4} 58 q4 -4 8 0" stroke="${COLORS.ink}" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M${cx2 - 4} 58 q4 -4 8 0" stroke="${COLORS.ink}" stroke-width="2.5" fill="none" stroke-linecap="round"/></g>`;
  }
  return `<g><circle cx="${cx1}" cy="58" r="3" fill="${COLORS.ink}"/><circle cx="${cx2}" cy="58" r="3" fill="${COLORS.ink}"/></g>`;
}

function mouth(state, cx = 65) {
  if (state === "speaking") {
    return `<ellipse cx="${cx}" cy="74" rx="5" ry="3" fill="${COLORS.ink}"/>`;
  }
  if (state === "frown") {
    return `<path d="M${cx - 8} 78 q8 -6 16 0" stroke="${COLORS.ink}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  }
  if (state === "happy") {
    return `<path d="M${cx - 9} 72 q9 8 18 0" stroke="${COLORS.ink}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  }
  return `<line x1="${cx - 6}" y1="74" x2="${cx + 6}" y2="74" stroke="${COLORS.ink}" stroke-width="2.2" stroke-linecap="round"/>`;
}

/* Ideator — round face, glasses, clipboard */
export function ideatorSprite(state = "idle") {
  return `
  <svg viewBox="0 0 130 180" xmlns="http://www.w3.org/2000/svg">
    <!-- body -->
    <path d="M30 175 q-2 -55 35 -75 q37 20 35 75 z" fill="${COLORS.warm}" stroke="${COLORS.ink}" stroke-width="2.5" stroke-linejoin="round"/>
    <!-- arm holding clipboard (visible during writing/tool) -->
    ${state === "writing" || state === "tool" ? `
      <rect x="42" y="115" width="46" height="36" rx="3" fill="${COLORS.paper}" stroke="${COLORS.ink}" stroke-width="2"/>
      <rect x="56" y="110" width="18" height="6" rx="1" fill="${COLORS.ink}"/>
      <line x1="48" y1="125" x2="80" y2="125" stroke="${COLORS.ink}" stroke-width="1.2"/>
      <line x1="48" y1="132" x2="74" y2="132" stroke="${COLORS.ink}" stroke-width="1.2"/>
      <line x1="48" y1="139" x2="78" y2="139" stroke="${COLORS.ink}" stroke-width="1.2"/>
    ` : ``}
    <!-- head -->
    <circle cx="65" cy="60" r="35" fill="${COLORS.warm}" stroke="${COLORS.ink}" stroke-width="2.5"/>
    <!-- glasses -->
    <circle cx="50" cy="58" r="9" fill="none" stroke="${COLORS.ink}" stroke-width="2"/>
    <circle cx="80" cy="58" r="9" fill="none" stroke="${COLORS.ink}" stroke-width="2"/>
    <line x1="59" y1="58" x2="71" y2="58" stroke="${COLORS.ink}" stroke-width="2"/>
    ${eyes(state)}
    ${mouth(state)}
    <!-- hair tuft -->
    <path d="M40 30 q15 -18 28 -8 q-6 6 -3 14 z" fill="${COLORS.ink}"/>
  </svg>`;
}

/* Reviewer — square jaw, red pen, furrowed brow */
export function reviewerSprite(state = "idle") {
  const brow = state === "frown" || state === "thinking";
  return `
  <svg viewBox="0 0 130 180" xmlns="http://www.w3.org/2000/svg">
    <!-- body -->
    <path d="M30 175 q-2 -55 35 -75 q37 20 35 75 z" fill="${COLORS.pink}" stroke="${COLORS.ink}" stroke-width="2.5" stroke-linejoin="round"/>
    <!-- red pen -->
    ${state === "writing" || state === "tool" ? `
      <line x1="92" y1="100" x2="115" y2="123" stroke="${COLORS.ink}" stroke-width="2.5" stroke-linecap="round"/>
      <rect x="108" y="118" width="14" height="5" rx="1" fill="#e04a3e" stroke="${COLORS.ink}" stroke-width="1.5" transform="rotate(45 115 121)"/>
    ` : ``}
    <!-- head: square -->
    <rect x="32" y="28" width="66" height="68" rx="14" fill="${COLORS.pink}" stroke="${COLORS.ink}" stroke-width="2.5"/>
    <!-- brow if frowning/thinking -->
    ${brow ? `
      <line x1="44" y1="50" x2="56" y2="53" stroke="${COLORS.ink}" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="74" y1="53" x2="86" y2="50" stroke="${COLORS.ink}" stroke-width="2.5" stroke-linecap="round"/>
    ` : ``}
    ${eyes(state)}
    ${mouth(state)}
    <!-- side hair / sideburns -->
    <path d="M30 55 q3 -10 6 -8 v18 z" fill="${COLORS.ink}"/>
    <path d="M100 55 q-3 -10 -6 -8 v18 z" fill="${COLORS.ink}"/>
  </svg>`;
}

/* Librarian (novelty-checker) — small, holds a scroll, has a finger raised */
export function librarianSprite(state = "idle") {
  return `
  <svg viewBox="0 0 110 150" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 145 q-1 -45 33 -60 q34 15 33 60 z" fill="${COLORS.blue}" stroke="${COLORS.ink}" stroke-width="2.5" stroke-linejoin="round"/>
    <!-- scroll -->
    <g transform="translate(8 70)">
      <rect x="0" y="0" width="22" height="28" rx="2" fill="${COLORS.paper}" stroke="${COLORS.ink}" stroke-width="2"/>
      <line x1="3" y1="6" x2="19" y2="6" stroke="${COLORS.ink}" stroke-width="1.2"/>
      <line x1="3" y1="11" x2="17" y2="11" stroke="${COLORS.ink}" stroke-width="1.2"/>
      <line x1="3" y1="16" x2="19" y2="16" stroke="${COLORS.ink}" stroke-width="1.2"/>
    </g>
    <!-- raised finger arm -->
    ${state === "alert" || state === "speaking" ? `
      <line x1="85" y1="85" x2="100" y2="40" stroke="${COLORS.ink}" stroke-width="3" stroke-linecap="round"/>
      <circle cx="100" cy="38" r="4" fill="${COLORS.blue}" stroke="${COLORS.ink}" stroke-width="2"/>
    ` : ``}
    <!-- head -->
    <circle cx="55" cy="50" r="28" fill="${COLORS.blue}" stroke="${COLORS.ink}" stroke-width="2.5"/>
    <!-- bun -->
    <circle cx="55" cy="22" r="9" fill="${COLORS.ink}"/>
    <!-- glasses -->
    <circle cx="44" cy="50" r="7" fill="none" stroke="${COLORS.ink}" stroke-width="1.8"/>
    <circle cx="66" cy="50" r="7" fill="none" stroke="${COLORS.ink}" stroke-width="1.8"/>
    <line x1="51" y1="50" x2="59" y2="50" stroke="${COLORS.ink}" stroke-width="1.8"/>
    <circle cx="44" cy="50" r="2" fill="${COLORS.ink}"/>
    <circle cx="66" cy="50" r="2" fill="${COLORS.ink}"/>
    <line x1="50" y1="64" x2="60" y2="64" stroke="${COLORS.ink}" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`;
}

/* Inspector (validator) — stern, holds a clipboard, official */
export function inspectorSprite(state = "idle") {
  return `
  <svg viewBox="0 0 130 180" xmlns="http://www.w3.org/2000/svg">
    <path d="M30 175 q-2 -55 35 -75 q37 20 35 75 z" fill="${COLORS.green}" stroke="${COLORS.ink}" stroke-width="2.5" stroke-linejoin="round"/>
    <!-- clipboard with stamp -->
    <rect x="42" y="115" width="46" height="36" rx="3" fill="${COLORS.paper}" stroke="${COLORS.ink}" stroke-width="2"/>
    <rect x="56" y="110" width="18" height="6" rx="1" fill="${COLORS.ink}"/>
    <line x1="48" y1="125" x2="80" y2="125" stroke="${COLORS.ink}" stroke-width="1"/>
    <line x1="48" y1="132" x2="74" y2="132" stroke="${COLORS.ink}" stroke-width="1"/>
    <text x="65" y="148" text-anchor="middle" font-size="9" font-family="monospace" fill="${COLORS.red}" font-weight="bold">✓</text>
    <!-- head -->
    <ellipse cx="65" cy="55" rx="32" ry="36" fill="${COLORS.green}" stroke="${COLORS.ink}" stroke-width="2.5"/>
    ${eyes(state)}
    ${mouth(state)}
    <!-- moustache -->
    <path d="M50 70 q15 -4 30 0" stroke="${COLORS.ink}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <!-- official cap -->
    <rect x="35" y="20" width="60" height="6" fill="${COLORS.ink}"/>
    <rect x="40" y="14" width="50" height="8" rx="3" fill="${COLORS.ink}"/>
  </svg>`;
}

/* Compact mini-librarian sprite for parallel-spawn rows */
export function miniLibrarianSprite() {
  return `
  <svg viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 78 q0 -22 18 -32 q18 10 18 32 z" fill="${COLORS.blue}" stroke="${COLORS.ink}" stroke-width="2"/>
    <circle cx="30" cy="28" r="14" fill="${COLORS.blue}" stroke="${COLORS.ink}" stroke-width="2"/>
    <circle cx="30" cy="14" r="5" fill="${COLORS.ink}"/>
    <circle cx="25" cy="28" r="1.8" fill="${COLORS.ink}"/>
    <circle cx="35" cy="28" r="1.8" fill="${COLORS.ink}"/>
    <line x1="27" y1="36" x2="33" y2="36" stroke="${COLORS.ink}" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`;
}

export const TOOL_ICON = {
  Read: "📖", Glob: "🔍", Grep: "🔎",
  Bash: "⌨️", Edit: "✏️", Write: "📝",
  WebSearch: "🌐", WebFetch: "📡",
  Task: "🤖", Agent: "🤖",
  TodoWrite: "📋", NotebookEdit: "📓",
  default: "🛠"
};
