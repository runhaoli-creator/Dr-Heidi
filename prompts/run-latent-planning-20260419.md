# Run prompt — Latent World-Action Model exploration, anchored on Being-H0.7
# Date: 2026-04-19
# Style: focused with a small exploration spread (count=3, design-axis varied)

============================================================

I'm running an ideation session, focused on **Latent World-Action Models (Latent WAMs)** — the emerging line that puts a compact latent reasoning space between perception and action, instead of either (a) directly mapping observation → action like vanilla VLAs, or (b) explicitly generating future video at inference like Cosmos-Policy / Fast-WAM. Being-H0.7 just landed (2026-04-14) and is the cleanest articulation of this direction so far. I want ideas that push it forward.

## Step 1 — anchor

Anchors:

- **Being-H0.7 (BeingBeyond, 2026-04-14)**: the primary anchor. Dual-branch latent WAM with K=16 learnable latent queries; posterior branch sees future observations and is jointly aligned with the prior branch via L2 on hidden states + norm/rank regularization. SOTA on 6 sim benchmarks, ~60× more efficient than Cosmos-Policy.
  - Project page: https://research.beingbeyond.com/projects/being-h07/
  - PDF (already saved into the repo): `papers/2026-04/being-h07/pdf/paper.pdf`
  - **NOT on arXiv** — the `paper-digest` skill won't work on it directly. Handle manually (Step 1a).

- **JEPA-VLA / VLA-JEPA (cited in Being-H0.7 §2 as the closest prior on future-aware representation learning, refs [58] and [71])**: representative of the JEPA-style latent future prediction line that Being-H0.7 distinguishes itself from. I want at least one of these in the anchor set.

- **Cosmos-Policy (Being-H0.7 ref [9])** OR **Fast-WAM (ref [11])**: the explicit pixel-WAM baseline that Being-H0.7 challenges on efficiency. I want one of these as anchor for the "what we're moving away from" pole.

## Step 1a — manually ingest Being-H0.7

`paper-digest` only handles arxiv IDs. For Being-H0.7, do this manually:

1. Directory `papers/2026-04/being-h07/` and the PDF at `papers/2026-04/being-h07/pdf/paper.pdf` are already in place.
2. Run `pdftotext -layout papers/2026-04/being-h07/pdf/paper.pdf papers/2026-04/being-h07/pdf/paper.txt` to get extractable text.
3. Write `papers/2026-04/being-h07/metadata.json` matching the schema used by other papers in the KB. Fields:
   - `arxiv_id: "being-h07"` (synthetic; the parser keys on directory name, not real arxiv ID)
   - `title: "Being-H0.7: A Latent World-Action Model from Egocentric Videos"`
   - `summary`: paste the abstract verbatim from the .txt
   - `authors: ["BeingBeyond Team"]`
   - `published: "2026-04-14T00:00:00Z"`
   - `primary_category: "cs.RO"`
   - `categories: ["cs.RO", "cs.LG", "cs.CV"]`
   - `abs_url: "https://research.beingbeyond.com/being-h07"`
   - `pdf_url: "https://research.beingbeyond.com/projects/being-h07/being-h07.pdf"`
   - `matched_groups: ["wam"]`
   - `fetched_at`: today's UTC ISO timestamp
4. Write `papers/2026-04/being-h07/notes.md` and `papers/2026-04/being-h07/gaps.md` following the exact schema in `.claude/skills/paper-digest/SKILL.md` (Title / Problem / Method / Key Results / Limitations split into Author-stated vs Observed / Open Questions & Gaps / Connections). Be especially thorough on the **Open Questions & Gaps** section since that's where ideation will pull from. Some directions worth surfacing in the gaps:
   - The posterior branch sees full future observations õ_{0:T} as raw pixels through a frozen ViT — could other supervision signals replace this (CoT reasoning traces, language descriptions of futures, action-token futures)?
   - K=16 latent queries is hand-picked; no ablation in the paper on how K scales with task complexity.
   - The alignment loss is plain L2 on hidden states — could InfoNCE / contrastive / regularized variants do better?
   - The prior-branch latent queries are static learnable parameters (one set for all tasks). Could they be instruction-conditional or task-dispatched?
   - The norm + rank regularizers (Eq. 6, Eq. 7) are added to prevent collapse but their hyperparameters are tuned, not derived. Adaptive variants?
   - The latent queries form a planning substrate but are never *searched over* at inference (it's one-shot prior-branch forward). Could MCTS-style or particle-based search over Q give more on hard tasks?
   - The paper has no real "Limitations" section and no failure-mode analysis. What does Being-H0.7 fail on that VLAs / WAMs don't?

## Step 2 — extend the KB

For the other two anchors (JEPA-VLA / VLA-JEPA and Cosmos-Policy or Fast-WAM):

1. Use `paper-scout` first with default flags to refresh the KB (this catches recently posted papers).
2. Then look up the arxiv IDs for the JEPA papers (refs [58] and [71] of Being-H0.7) and for Cosmos-Policy or Fast-WAM (refs [9] and [11]). Use WebSearch if the IDs aren't in the local KB metadata.
3. Run `paper-digest` on whichever ones you find. Skip if already digested.

Then **batch-digest 8 more papers in parallel** (spawn multiple `paper-digest` Tasks in one message, not sequentially) from the scout output, picking those most relevant to:

- latent reasoning / latent action representation in transformers
- dual-branch / teacher-student / posterior-distillation training schemes for VLA or world models
- alternatives to pixel-rollout in WAM (anything that compresses or skips the future-observation prediction step)
- egocentric video pretraining for embodied policies
- JEPA-style future-aware latent predictions

Selection criteria: prefer papers from the past 6 months; skip surveys, position papers, and pure theory.

## Step 3 — ideate

Run `/ideate` with these parameters:

- **count: 3**
- **scope**: "Anchored on the Being-H0.7 paper at `papers/2026-04/being-h07/notes.md`. The 3 ideas should each push Being-H0.7's design forward on a *different* design axis, so I get a small map of the space rather than three variants of the same move. Suggested axes (you can pick others if better):

  1. **Posterior supervision signal**: replace future-observation embeddings with something else (CoT reasoning traces, language-described futures, action-token futures, other-modality futures). Question: what's the cheapest posterior that still shapes useful latent reasoning?
  2. **Latent query structure**: replace static learnable Q with instruction-conditional, task-dispatched, or hierarchically-structured queries. Question: how does Q's parameterization affect generalization across embodiments?
  3. **Inference-time use of the latent space**: instead of one-shot prior forward, do something with Q at inference (search, particle filter, MPC over latent, ensemble). Question: can you recover most of Cosmos-Policy's planning power without paying its pixel-rollout cost?

  Each idea must:
  - cite Being-H0.7 (`papers/2026-04/being-h07/`) as `gap-source` or `method-inspiration`
  - cite at least 2 OTHER KB papers — force cross-pollination, not just Being-H0.7 + minor tweaks
  - have an MVE startable on a single A100 in 1 week using a public benchmark (LIBERO is the obvious one since Being-H0.7 reports 99.2% there)
  - target venue: NeurIPS or ICLR (Being-H0.7 itself feels NeurIPS-shaped; build on that)

  Reviewer calibration for this batch: be willing to reject. The 0/8 reject rate from prior batches is a known weakness. If an idea is just 'replace L2 alignment with InfoNCE' with no structural argument, reject it cleanly — do not rescue into improve."

## Step 4 — honest report

After ideation finishes, give me:

- A clean list of the 3 accepted ideas: `<slug> · one-sentence pitch · which design axis · venue · top risk`
- The Validator block summary for each: `pass | patch | downgrade-to-reject`, plus any patch items
- **A small comparison table**: rows = the 3 ideas; columns = (a) design axis attacked, (b) compute cost of MVE relative to Being-H0.7's setup, (c) what winning evidence would look like in concrete numbers, (d) which existing system (Being-H0.7, Cosmos-Policy, JEPA-VLA, etc.) it most directly threatens
- An honest meta-paragraph: which of the 3 you'd actually pursue first and why (consider both novelty and tractability), which you'd drop, and whether the batch as a whole feels like genuine extension of Being-H0.7's contribution or just shuffling its components. Don't flatter — if all 3 are mid-tier, say so explicitly.

============================================================

# Notes for me (not part of the prompt)

- **Why Being-H0.7 is a good anchor right now**: the paper landed days ago (2026-04-14), the architecture is unusual enough that it opens real design space, and the authors didn't write a strong limitations section so the gaps are wide open.
- **Why count=3 and three named axes**: you wanted to "explore" but you started from the focused template. Three ideas around three pre-named axes gives you the exploration spread without going full exploratory mode (which would be count=5+ and unconstrained mechanism).
- **If you want pure focused style instead**: drop count to 1, drop the three-axis instruction, and pick ONE axis (probably "posterior supervision signal" — most immediately promising). Then the prompt becomes `count: 1, scope: anchored on Being-H0.7, attack the posterior-supervision axis specifically`.
- **If you want pure exploratory style instead**: switch to `prompts/example_exploratory.md` as the base. Bump count to 4-5, drop the venue constraint, ask for a wider design map across more axes.
