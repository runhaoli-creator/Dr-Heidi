# Dr. Heidi web UI — v1 final report

A replay viewer that turns past Claude Code agent runs in this project into a watchable two-character drama. **Replay-only**, ships without API key, runs locally.

## How to run

```bash
./run.sh
```

Opens `http://127.0.0.1:8765/` automatically. Requires the `.venv-new` venv that was set up during build (the original `.venv` had a stale shebang from the project's earlier "Dr. Agent" name and could not be edited by this session).

To rebuild the venv from scratch:

```bash
python3 -m venv .venv-new
.venv-new/bin/pip install -e webui/backend
```

## What got built

### Phase 0a — JSONL parser + run detection (`webui/backend/dr_heidi_webui/parser.py`)
- Reads parent session JSONLs and per-subagent JSONLs from `~/.claude/projects/<encoded>/<session>/`.
- Normalizes to a flat `Event` stream with stable agent attribution. Schema in `events.py`.
- Detects "ideation runs" via gap-based heuristic (default 30-min inactivity gap; override via `detect_runs(..., inactivity_gap_s=N)`).
- Description-based role inference for legacy `general-purpose` subagents — so the older Dr. Agent session also replays.
- 15 pytest tests, all passing, against real fixtures from your two sessions.

### Phase 0b — FastAPI backend + SSE (`webui/backend/dr_heidi_webui/app.py`)
- Endpoints: `/api/health`, `/api/projects`, `/api/runs`, `/api/runs/{id}`, `/api/runs/{id}/events` (SSE), `/api/papers`, `/api/papers/{id}?part=…`, `/api/ideas`, `/api/ideas/{slug}`.
- SSE replay paces by real timestamp deltas with a 30s wall-cap so an idle gap doesn't stall playback. Speeds: `1` / `2` / `4` / `max`. `from_seq=N` lets the timeline scrubber resume at any event.
- Run cache invalidates by file mtime — reading a fresh run requires no restart.
- Serves the frontend SPA from `/`.
- 11 pytest tests on top of the parser tests. **26/26 backend tests pass.**

### Phase 0c — Frontend skeleton + character drama (`webui/frontend/dist/`)
- **Vanilla HTML/CSS + ES modules**, no bundler, no Node toolchain. (Detected absence of `node`/`npm`; pivoted from Svelte+Vite to vanilla. Documented in `Decisions made autonomously` below.)
- Two main characters: **Ideator** (yellow, glasses, clipboard) and **Reviewer** (pink, square jaw, red pen). Each has 5 visual states (idle/thinking/tool/writing/speaking + happy/frown for done state). Sprites are hand-coded SVG primitives.
- Speech bubbles (white) and thought bubbles (dashed blue, italic), positioned to either side of each character.
- Tool badges stack below each character (Read/Glob/Grep/Bash/Edit/Write/WebSearch/WebFetch + others, with emoji icons).
- Library sidebar lists all 83 papers in `papers/` with digested-status checkmarks; click any paper to open its `notes.md` in a modal.

### Phase 0d — Special states (novelty / validator / files)
- **Novelty-checker = Librarian** sprite that walks on with raised finger. Per spec: parallel spawns multiply into a **row of mini-librarians** (verified live with the 9-parallel batch from the recent audit run); collapses back to a **single librarian + summary bubble** once all parallel novelty agents have finished.
- **Validator = Inspector** sprite. Card slides in top-right with C1–C5 ✓/✗ marks (parsed from the validator's actual output text) and the verdict stamp (PASS / PATCH / DOWNGRADE), color-coded.
- **File writes** highlighted in the library when a paper digest is being written; for accepted ideas, a "🎉 Idea accepted" banner appears bottom-right with a clickable link to the rendered markdown.

### Phase 0e — Timeline + transport controls
- Bottom transport bar with: ⏸ pause / ▶ play (between agents only — pause mid-LLM-call isn't safe), ⟲ restart, speed selector (1×/2×/4×/max), playhead position display.
- Timeline scrubber across the bottom with **named markers** for `run_started`, `draft_written`, `novelty_called`, `novelty_returned`, `verdict_decided`, `revision_started`, `validator_stamped`, `run_done`. Hover for tooltip, click to jump (jump-snap, no rewind animation as you confirmed).
- Click anywhere on the empty track to seek to that fraction.

### Phase 0f — Inspection panel + token meter + idea reveal
- Click any character to open a **slide-in inspection panel** (right side) showing: status, tools-used summary, recent text/thinking output (last 6, latest first), tool log (last 12 with args), files written. ESC or × button closes.
- Click the librarian (single or any of the parallel mini-librarians) to inspect that specific novelty-checker.
- **Token meter** in the header (small, monospace): shows event count + estimated tokens (computed from text length at ~4 chars/token; per-call usage isn't always persisted so this is an honest estimate, with a tooltip explaining).
- **Confetti** fires once when an `accepted` idea is written. Banner with clickable link opens the idea's full markdown in a modal.
- **Sound toggle** in the header (default off). Currently a no-op visual control — sound effects not wired in this version (see "Cut from v1" below).

### Phase 0g — Sprite upgrade decision
- **Verdict: stay with SVG primitives.** I didn't have an image-gen tool available in this session to autonomously generate flat-vector character art, and the current sprites — while not fancy — are functionally distinguishable (yellow vs pink, glasses vs red pen, librarian with scroll vs inspector with clipboard + cap). The dramatic value comes from the bubbles + tool badges + special-state overlays, not the character art itself.
- Upgrading to image-gen sprites is a clean v2: replace the 4 SVG functions in `webui/frontend/dist/assets/js/sprites/index.js` with `<img>` tags pointing at a sprite sheet.

## Decisions made autonomously

| Decision | Why |
|---|---|
| **Vanilla HTML/CSS/JS instead of Svelte+Vite** | No `node`/`npm` on this Mac. Installing Node would have blocked progress. Vanilla works for the small surface area; component-like organization preserved via ES modules. Trade-off: no compile-time reactivity sugar, but the pub-sub store + `requestAnimationFrame`-throttled rerender keeps it smooth. |
| **`.venv-new` instead of fixing `.venv`** | The original `.venv` had a shebang pointing at `/Users/runhaoli/Desktop/Dr. Agent/...` which no longer exists; rebuilding required `rm -rf` which is denied by your settings. Created `.venv-new` and wired everything to point at it; harmless for v1, document-and-go. |
| **30-min inactivity gap for run detection** | The Dr. Heidi session had a 90-min audit-debug pause inside one ideation; bigger gaps would cluster too aggressively, smaller would split runs. Configurable via `detect_runs(..., inactivity_gap_s=N)`. |
| **Validator card top-right, not center stage** | Initial design (center stage) intercepted clicks on the main characters. Top-right is unobtrusive and visible without blocking. |
| **Bubble persists for done agents** | Lets you see the last thing they said even after they're "offstage". Cleared only for novelty/validator agents (whose state is rendered separately). |
| **Token meter shows ~estimated tokens** | Per-call `message.usage` isn't reliably present in the JSONL. Estimating from char count at 4 chars/token is honest; tooltip explains. |
| **No sound effects wired up** | Toggle exists but is a no-op. Adding ambient sounds (pen scratch, paper shuffle, ding) is genuinely small but felt below the v1 polish bar — better to ship clean than half-wired. |

## Cut from v1 (intentionally)

- **Image-gen sprite art** — judged not worth blocking on. SVG primitives suffice; v2 upgrade slot is clean.
- **Sound effects** — toggle is there, sounds are not.
- **Live runs (Phase 1 of the original plan)** — explicitly deferred per your "ship polished replay-only v1" call. Everything you'd need to add live: subprocess `claude -p` runner, two-source event merge (parent stream + JSONL tails), pause-between-agents via `asyncio.Event`. Architecture supports it; not built.
- **Per-event token usage breakdown** — only cumulative estimate shown.
- **Run list pagination** — works fine up to ~50 runs; you have ~5 right now.

## Known rough edges

- **First time loading a run shows "—offstage—" briefly** — the first events are the `run_started` marker + the first `agent.spawn`; characters appear once their first thinking/tool/text event arrives. Visually it's a 1–2 second blank moment.
- **Long file-write text dumps as a giant speech bubble** — when an agent writes a 5000-char idea file via `Edit`, the parser emits the full text as `agent.text` with `looks_like: "file_content"`. The Character render does swap to the "writing" pose, but the bubble (capped at 800 chars + "…") can still cover the other character. Acceptable, not pretty.
- **Timeline markers cluster** when many novelty calls happen in a small window (e.g., the 9-parallel batch). They're individually clickable but visually overlap. A 5+ marker collision detector + grouping would help.
- **The `.venv-new` venv name is awkward** — once you next get a chance to `rm -rf .venv && mv .venv-new .venv`, update the shebang in `webui/scripts/run.sh` (one line).
- **`from_seq` scrubbing after pause** restarts the SSE stream from the new position, which means the playhead snaps. This is the correct behavior per your "jump-snap, no rewind animation" call, but it does drop the stale state for the agents whose events came before the seek point. So if you scrub backward, the characters might appear "fresh" rather than mid-thought. Re-rendering past state from a stable derived projection (instead of a play-forward state machine) would fix this — meaningful work, deferred.
- **The original `.venv` is broken** but not deleted (denial of `rm -rf` in this environment). Doesn't affect anything but takes up disk.

## Test summary

```
26/26 backend tests pass    (pytest webui/backend)
- 15 parser tests against real fixtures
- 11 HTTP/SSE tests via FastAPI TestClient
```

Manual browser verification: 14 Playwright screenshots in `webui/_screenshots/` showing each major state (home, mid-run, novelty interrupt, validator stamp, accepted banner, inspection panel, paper modal, idea modal, marker jump). Final state at `webui/_screenshots/final_03_done.png`.

## File map

```
webui/
  backend/
    pyproject.toml
    dr_heidi_webui/
      __init__.py
      events.py               # event schema constants + Event dataclass
      parser.py               # JSONL → normalized events, run detection
      sessions.py             # RunRegistry — caches detected runs by mtime
      papers.py               # papers/ + ideas/ readers
      app.py                  # FastAPI app + SSE replay + static SPA mount
    tests/
      test_parser.py          # 15 tests
      test_app.py             # 11 tests
  frontend/
    dist/                     # served at /
      index.html
      assets/
        css/app.css
        js/
          app.js              # entry, routing, header, home, run page
          state.js            # pub/sub store with rAF-throttled emit
          api.js              # fetch wrappers
          eventStream.js      # SSE consumer + agent state-machine reducer
          components/
            Stage.js
            Character.js
            Bubble.js
            NoveltyInterrupt.js
            ValidatorStamp.js
            Library.js
            Modal.js
            Timeline.js       # transport bar + scrubber + markers
            InspectionPanel.js
            Confetti.js
          sprites/index.js    # 4 SVG sprite functions + tool icons
  scripts/
    run.sh                    # boots backend, opens browser
  _screenshots/               # Playwright manual-verify outputs
run.sh -> webui/scripts/run.sh
FINAL_REPORT.md               # this file
```

## What you'll see when you run it

1. `./run.sh` boots uvicorn and opens your browser.
2. Home page lists 5 detected runs grouped by project (Dr. Heidi: 1 / Dr. Agent: 4).
3. Click any run → stage view loads; first 1–2 seconds are blank as the first events stream in.
4. Two characters appear; the ideator does its thinking/tool work; speech bubbles type out.
5. When the reviewer is spawned, the librarian sprite walks on (full size for single, mini-row of 9 for the parallel audit batch). Once all librarians complete, they collapse to one.
6. The reviewer takes the stage, runs more tools, writes its review, decides a verdict.
7. The validator card slides in top-right with the C1–C5 marks and final stamp.
8. When an idea is accepted, confetti fires + banner appears bottom-right with a link to the rendered markdown.
9. Click any character or librarian to inspect their full event log in a slide-in panel; click any paper to read its digest; drag the timeline scrubber or click any marker to jump.
