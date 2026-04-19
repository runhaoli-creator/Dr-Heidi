# Dr. Agent

## Overview
A research idea generator for Embodied AI / Robotics, focused on WAM (World-Action Models) and VLA (Vision-Language-Action) directions. Dr. Agent autonomously scans fresh arXiv uploads, digests them into a local knowledge base, and synthesizes user-provided seed ideas with the latest literature to propose high-impact, grounded research directions.

## Target Venue
- Venue: TBD
- Deadline: TBD

## Architecture (build sequence)

**Phase 1 — Foundation (current):** arXiv ingestion + per-paper digestion.
- `paper-scout` skill → `scripts/arxiv_fetch.py`: query arXiv, dedup, save metadata.
- `paper-digest` skill: fetch PDF, extract structured notes + gaps per paper.

**Phase 2 — Ideation (dual-agent peer review + co-authoring):**
- `lead-researcher` agent drafts ideas to `ideas/_draft/`, each citing **≥3 recent papers with innovative methodologies** (from `papers/`; user seeds are optional).
- `reviewer` agent peer-reviews every draft on novelty / impact / feasibility with a CVPR/NeurIPS/ICRA bar. Verdicts:
  - **accept** — strong as drafted
  - **improve** — reviewer itself rewrites the flawed parts in a `## Revised Version` block (not just flags them)
  - **reject** — fundamentally trash (already done, unfalsifiable, trivial, or infeasible)
- `ideate` skill orchestrates brainstorm → parallel review → present only accepted (tagged `[clean accept]` or `[reviewer-amended]`). No revision-bouncing; single pass.

**Phase 3 — Depth (partially built):**
- `novelty-checker` (built 2026-04-18) — live WebSearch/WebFetch for prior-art collisions; reviewer now delegates Novelty scoring to it. Round 0 proved local-KB-only novelty checks miss close prior art like VLAC and VLA-in-the-Loop.
- `gap-analyst` (not built) — will aggregate `gaps.md` across digests to surface recurring unanswered questions.

**Phase 4 — Automation:** cron daily arXiv scan + weekly trend digest.

## Knowledge Base Layout
```
queries/<topic>.yaml            arXiv search groups (keywords + categories)
papers/YYYY-MM/<arxiv_id>/      per-paper: metadata.json, pdf/, notes.md, gaps.md
seeds/                          user anchor papers + half-formed ideas
trends/                         synthesized weekly/monthly reports
ideas/                          generated ideas w/ novelty/impact/feasibility + citations
scripts/                        python helpers (arxiv_fetch.py, …)
ideas/_draft/                   ideas awaiting or in review
ideas/_rejected/                ideas that failed peer review (kept to avoid rehashing)
ideas/<slug>.md                 accepted ideas (shown to user)
.claude/skills/<name>/SKILL.md  project-local skills: paper-scout, paper-digest, ideate
.claude/agents/<name>.md        project-local subagents: lead-researcher, reviewer, …
```

## Tech Stack
- Python 3.9+ (system python works; `.venv/` is provisioned)
- Deps: `pyyaml` (see `requirements.txt`)
- CLI tools: `pdftotext` (Poppler), `curl`, arXiv API (`export.arxiv.org`)

## Key Commands
```bash
# Fetch latest arXiv papers into the KB
.venv/bin/python scripts/arxiv_fetch.py --query-file queries/wam_vla.yaml

# Fetch just one group (debug / focused refresh)
.venv/bin/python scripts/arxiv_fetch.py --group vla --max-per-group 20

# Install deps into venv
.venv/bin/pip install -r requirements.txt
```

## Conventions
- Follow global style from `~/.claude/CLAUDE.md` (type hints, f-strings, concise).
- **Every generated idea must cite ≥3 recent papers with innovative methodologies** (grounding requirement; seeds optional).
- **Dual-agent gate:** lead-researcher drafts, reviewer critiques, only accepted ideas reach the user.
- Never auto-push; never amend without asking.
- Digests are ≤500 words; ideas keep their review history inline.

## Notes for Claude
- "scan arxiv" / "find new papers" / "refresh KB" → invoke `paper-scout`.
- "digest <id>" / "read paper X" → invoke `paper-digest`.
- "brainstorm" / "ideate" / "what should I work on" / "propose directions" → invoke `ideate`.
- Don't commit fetched paper metadata without showing the user what's new first.
- Don't fabricate arxiv IDs — only cite what's in `papers/`. If the KB is too thin to ground 3 citations, run `paper-scout` first rather than inventing.
- Large artifacts (PDFs, wandb, checkpoints) are gitignored; keep them that way.
