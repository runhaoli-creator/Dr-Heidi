# Round 0 Audit — Dr. Agent Dual-Agent Pipeline
date: 2026-04-18

## Pipeline Output
- **KB populated:** 83 papers via `paper-scout`; 8 digested with structured notes.md + gaps.md.
- **Drafts produced:** 4 (lead-researcher, ~30 min).
- **Reviews produced:** 4 (reviewer, ~90s each with leaned prompt; original spec timed out at 80+ min).
- **Verdicts:** 4× `improve`, 0× `accept`, 0× `reject`.

## Grade-A Rubric Results (per idea)

| Idea | Cite Integrity | External Novelty | MVE Concrete | Grounding | Venue Fit |
|---|---|---|---|---|---|
| risk-aware-particle-planner | ✓ 3/3 real | ✓ no direct collision (SVGD+CVaR in WAV-latent novel) | ✓ dataset/baseline/metric/signal all named | 3/3 | NeurIPS fine |
| self-supervised-affordance | ✓ 4/4 real (+1 reviewer-added) | ⚠ adjacent work exists (UAD ICCV'25 uses DINOv2 for unsupervised affordance; DINO-WM overlaps) — still distinct framing (counterfactual action-dim perturbation) | ✓ all named | 3/3 | CVPR fine |
| belief-gated-system2-dispatch | ✓ 3/3 real | ✓ no direct collision | ✓ with reviewer-added 500-A6000h budget | 3/3 | CoRL fine |
| vla-critic-counterfactual-dagger | ✓ 3/3 real | ⚠ **close adjacency**: VLAC (arXiv 2509.15937, VLA-Critic process reward model), VLA-in-the-Loop (OpenReview 2026, WM + IDM corrector), Compliant Residual DAgger — reviewer's IDM-independence fix is exactly the discriminator, but the adjacency wasn't flagged internally | ✓ all named | 2/3 (slight circularity patched by reviewer) | ICRA fine |

**Grade-A threshold: citation PASS + external novelty PASS + MVE ≥ 3/4 + grounding ≥ 2/3 + venue fit YES.**

| Idea | Grade-A? |
|---|---|
| risk-aware-particle-planner | ✅ pass |
| self-supervised-affordance | ⚠ conditional pass — novelty narrow, cite UAD/DINO-WM in related-work |
| belief-gated-system2-dispatch | ✅ pass |
| vla-critic-counterfactual-dagger | ⚠ conditional pass — novelty narrow, must cite VLAC and VLA-in-the-Loop and sharpen the discriminator |

**Batch metric: 2 clean Grade-A + 2 conditional Grade-A out of 4.**

## Observed Defects

### D1 — Reviewer spec bloat → timeouts (critical)
- Original `reviewer.md` procedure required reading the full spec file + idea + ≥2 cited notes.md + grep across `papers/**/notes.md` + grep across `ideas/` + write review + maybe Revised Version + frontmatter update + mv. ~15–25 tool calls per review; streams idle-timed out at 80+ min cumulative.
- Lean inline prompt cut to 5 tool calls / ~90s per review with no observable quality drop.
- **Fix:** replace the spec's exhaustive procedure with the leaner version (≤12 tool calls; 1 cited notes.md instead of ≥2; skip full grep-sweeps).

### D2 — No external novelty check (critical)
- Reviewer only searches the local KB (83 metadata + 8 digested). If a direct prior-art collision exists in a paper not yet in the KB, the reviewer cannot catch it.
- Concrete miss: `vla-critic-counterfactual-dagger` has plausible collisions with VLAC (2509.15937) and VLA-in-the-Loop that a local grep cannot surface.
- **Fix:** add `novelty-checker` subagent with WebSearch/WebFetch; reviewer calls it before scoring Novelty; Novelty score is gated by its findings.

### D3 — Reviewer calibration skews toward `improve` (moderate)
- 0/4 rejected, 0/4 clean accept. Either (a) lead consistently drafts at mid-tier where improve is always rational, or (b) reviewer rescues even weak ideas.
- n=4 is too small to disambiguate. Monitor over more rounds.
- **Partial fix:** require reviewer to explicitly score against the "trash" criteria (already done / unfalsifiable / trivial / infeasible) — forces discriminating thinking even when borderline.

### D4 — Lead-researcher slow (moderate)
- ~30 min for 4 drafts. Not critical but limits pipeline throughput.
- Not addressing this round — only runs once per ideate session.

### D5 — Grounding reads too shallow at review time (minor)
- Lean reviewer reads ONE cited notes.md. Enough for speed, but can miss contradictions between the idea's approach and a second citation's actual content.
- **Fix:** reviewer briefs inline now request "the most load-bearing citation" — accept the trade-off for speed.

## Strengths (keep)
- **Citation integrity 100%** — 0 fabricated arxiv IDs across 4 ideas and 1 reviewer-added citation.
- **Diversity 4/4** — each idea uses a distinct primitive (planning objective / representation supervision / dispatch / failure-data curation).
- **Reviewer produces real surgery** — caught a sign-inverted loss, a circularity bug in VLA critic scoring, an SVGD-scalability afterthought → load-bearing fix. The Revised Versions are concrete (compute budgets, named baselines, sharper MVEs).
- **MVE concreteness** — all 4 Revised Versions name dataset + baseline + metric + expected signal magnitude. That's above most workshop-grade drafts.
- **Lead's diversity requirement worked** — no two ideas reuse the same primitive.
