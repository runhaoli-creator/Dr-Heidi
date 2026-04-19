---
name: ideate
description: Run Dr. Agent's dual-agent idea generation loop — Lead Researcher drafts research ideas grounded in recent innovative papers, then a Reviewer Agent peer-reviews each for novelty / impact / feasibility at top-tier venues (CVPR / NeurIPS / ICRA). Only ideas that pass review are presented to the user. Invoke when the user says "brainstorm ideas", "ideate", "what should I work on", "generate research directions".
---

# ideate

Dual-agent research idea generator with internal peer review.

## When to use
- User asks to brainstorm, ideate, propose directions, or "what should I work on".
- Invoked after fresh `paper-scout` + `paper-digest` runs (ideation is only as good as the digested KB).

## Workflow

### 0. Preflight

1. Check there are at least ~10 digested papers:
   ```bash
   find papers -name notes.md | wc -l
   ```
   If < 10, stop and tell the user to run `paper-scout` + `paper-digest` first. Ideation on an empty KB produces junk.

2. Ask the user (inline, one short question) for:
   - **Scope** (e.g., "long-horizon manipulation", "VLA data scaling"). Default: "any WAM/VLA topic with strong gaps in the KB".
   - **Count** of ideas to draft. Default: 5.

### 1. Brainstorm (Lead Researcher)

Spawn the `lead-researcher` subagent with a brief like:

> Draft N research ideas on <scope>. Read `papers/**/notes.md` and `papers/**/gaps.md`; prefer recent (past 12 months) and high-gap papers. Every idea cites ≥3 recent papers from `papers/` with `role` tags. User seeds in `seeds/` are optional — cite only if directly relevant. Write each idea to `ideas/_draft/<slug>.md` per the schema in your agent spec.

Do not proceed until the lead-researcher reports back with the list of draft files.

### 2. Peer Review + Co-author (Reviewer)

**Important orchestration note:** Subagents in the current runtime typically cannot spawn other subagents. So the `ideate` skill orchestrator (you, the parent) must run `novelty-checker` *first*, then pass its report to the `reviewer` inline. Do not assume the reviewer can spawn novelty-checker itself.

For each draft in `ideas/_draft/`:

1. **Spawn `novelty-checker` first.** Brief it with:
   > Idea pitch: <2-sentence pitch from the draft>. Core primitive: <the non-obvious move>. Check live arXiv / web for close prior art. Report in your spec's exact format: closest 0-3 priors, verdict (clean / adjacent / direct-collision), one-sentence rationale, what the reviewer should do.
   >
   > Per your spec, do NOT treat files in `ideas/` as prior art (those are Dr. Agent's own drafts including the one under review). If you want to surface overlap with a sister local idea, name it here: <list of relevant existing ideas, if any>.

2. **Spawn the `reviewer` subagent** with a brief that includes the novelty-checker's full report verbatim:
   > Review the idea at `ideas/_draft/<slug>.md`. Follow your full procedure in `.claude/agents/reviewer.md`. The `novelty-checker` has already run; its report is below. Use it for Novelty scoring and the non-trash "Not already done" checkbox; do NOT attempt to re-spawn novelty-checker.
   >
   > NOVELTY-CHECKER REPORT (verbatim):
   > <paste full novelty-checker output here>
   >
   > Then score novelty/impact/feasibility, apply the non-trash checklist, decide verdict (accept / improve / reject). For improve, write a concrete `## Revised Version` block. Edit the idea file in place, update frontmatter `status`, move the file to `ideas/` or `ideas/_rejected/` per verdict.

- **Parallelize:** for N drafts, spawn all N novelty-checkers in one message; once they return, spawn all N reviewers in one message.

Single review pass — no revision loop. The reviewer is the co-author for borderline ideas. The `novelty-checker` subagent is the only part of the pipeline with live-web access; local KB alone proved insufficient for novelty in Round 0.

### 3. Validation (Idea-Validator)

After all reviewers finish, spawn an `idea-validator` subagent for each file in `ideas/<slug>.md` (skip files in `_rejected/`). Brief:
> Validate the Revised Version in `ideas/<slug>.md` against the 5-point checklist: claim-capability alignment, benchmark fitness, circularity, expected-signal groundedness, Risks-vs-Approach contradiction. Emit `pass` / `patch` / `downgrade-to-reject` with a Validator block. Downgrade only on fatal contradictions; prefer `patch` for fixable issues.

Parallelize the validators (one per file, independent work). The validator is orthogonal to the reviewer — it checks consistency, not novelty/impact/feasibility. It was added after Round 0 diagnostic showed the reviewer often fixes the flagged concern but introduces or misses NEW issues in the fix itself (circular losses, benchmark category errors, unjustified expected-signal magnitudes).

### 4. Present to user

Only show the user ideas with `status: accepted` in `ideas/<slug>.md`. For each, detect whether the reviewer added a `## Revised Version` block (look for that literal heading) and tag it accordingly. Also detect the validator verdict and surface any `patch` items.

Format the presentation as:

```
## Accepted ideas (N of M passed peer review)

### 1. <title>   [Novelty x/5 · Impact y/5 · Feasibility z/5 · target <venue>] <tag>
<2-sentence pitch — if the reviewer rewrote it, pitch the revised version>
- Grounded in: <3+ arxiv_ids>
- MVE: <one line, from Revised if present, else original>
- File: `ideas/<slug>.md`

### 2. ...
```

Where `<tag>` encodes both stages:
- `[clean accept · validated]` — no reviewer changes, validator pass
- `[reviewer-amended · validated]` — reviewer rewrote, validator pass
- `[reviewer-amended · patch needed]` — reviewer rewrote, validator flagged concrete fixes (list them below)
- `[downgrade]` — validator caught a fatal issue post-review; idea moved to `_rejected/`

Also mention in one line: "K rejected (reviewer) + M downgraded (validator) — see `ideas/_rejected/` for what was trash and why."

## Principles
- **Never show the user a draft or a rejected idea** — only accepted.
- **Never skip peer review.** Even if the user says "just give me the ideas", the reviewer gate is non-negotiable — that's the point of this skill.
- **Don't inflate counts.** If only 2 of 5 ideas pass, present 2. Don't pad with rejects.
- **Distinguish clean accepts from reviewer-amended.** The user should know which ideas were strong as drafted vs. which ones the reviewer had to rescue.
- **Preserve the audit trail.** Accepted idea files contain the lead's original draft + reviewer's Review block + (if improved) the Revised Version. Don't collapse or rewrite this history.

## Do not
- Do not cite papers that aren't in `papers/` (fabricated arxiv IDs = instant reject).
- Do not let the lead-researcher also review its own ideas.
- Do not run a revision loop — the reviewer is the co-author now, it fixes ideas itself in one pass.
- Do not present drafts or rejections unless the user explicitly asks to see them.
