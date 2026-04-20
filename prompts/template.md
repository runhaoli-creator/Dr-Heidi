# Full ideation workflow — fill-in-the-blanks template

Copy everything between the `===` markers into a fresh Claude Code chat
in this project. Replace all `<...>` placeholders.

============================================================

I'm running a complete ideation workflow. Please execute the steps below
in order, in one go — don't pause to ask me between steps unless something
fundamental fails.

## Step 1 — establish anchor

I have N papers that are the core anchors for this round. They represent
the direction I want to push:

- <arxiv_id_1>: <one sentence: why it matters, what I want from it>
- <arxiv_id_2>: <...>
- <arxiv_id_3>: <...>

Please:
(a) Run `paper-digest` on these N papers (skip any already digested).
(b) Write a seed file at `seeds/<choose-a-slug>.md` capturing my research
    direction below, structured per the seed schema (`kind`, `priority`,
    `tags`, the standard sections):

    """
    <2-4 sentences describing your research direction. Include:
     - what specific problem you're solving
     - what mechanism / move you think is load-bearing
     - what you explicitly do NOT want to do (style anti-patterns)>
    """

    Use `priority: high` and `tags: [<vla, wam, world-model, …>]`.

## Step 2 — extend the knowledge base

Run `paper-scout` once with default flags. Then from the scout's output,
pick M papers that look most relevant to my direction and **batch-digest
them in parallel** (spawn multiple `paper-digest` Tasks in one message,
not sequentially). Selection criteria:

- Prefer published in the last 6 months
- Prefer abstracts that mention <2-3 of your direction's core keywords>
- Skip surveys, position papers, pure theory

If scout doesn't surface enough relevant papers, fall back to picking
M-k metadata-only papers from the existing KB whose titles look adjacent
to my direction. List your picks before digesting so I can sanity-check
the selection.

## Step 3 — ideate

Run `/ideate` with these parameters:

- **count**: K
- **scope**: Strictly anchor on the seed at `seeds/<slug>.md` I just
  asked you to write. Each idea must satisfy:
  * cites at least 1 of my anchor papers (as `method-inspiration` or
    `gap-source`)
  * cites at least 2 other papers from the broader KB (force
    cross-pollination, not just reshuffling my anchors)
  * MVE must be startable on <your resource ceiling, e.g. "a single A100
    in one week using public LIBERO data">
  * target venue: <NeurIPS / CoRL / ICRA / ICLR / RSS / CVPR>

**Reviewer calibration for this batch**: I want the reject pathway to
actually fire. If an idea is trivial, unfalsifiable, or fails any of the
non-trash checklist items, reject it cleanly — do NOT rescue it into an
"improve". The 0/8 reject rate from prior batches is a known calibration
weakness.

## Step 4 — honest report

After ideation finishes, give me:

- A clean list of accepted ideas: `<slug> · one-sentence pitch · venue · top risk`
- The Validator block summary for each: `pass | patch | downgrade-to-reject`,
  plus any concrete patch items
- An honest meta-evaluation paragraph: which idea in this batch you'd
  pursue first and why; which you'd drop and why; whether the whole
  batch feels like genuine novelty or all-mid-tier. Don't flatter me —
  if the answer is "all three are mediocre", say so.

============================================================
