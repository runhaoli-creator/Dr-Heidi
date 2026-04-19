# Round 0 vs Round 1 — Dr. Heidi Delta Report
date: 2026-04-18

## Headline
Round 1 validates the Round-0 architectural patches. Calibration improved; one clean accept emerged; validator caught 1 patch issue in 3 fresh ideas (vs. 2+4 retroactively on Round 0). No rejects either round — n is still too small to prove the reject pathway works, but the trash-checklist is now visibly applied.

## Metrics

| Metric | Round 0 (n=4) | Round 1 (n=3) |
|---|---|---|
| Reviewer `accept` | 0/4 (0%) | **1/3 (33%)** |
| Reviewer `improve` | 4/4 (100%) | 2/3 (67%) |
| Reviewer `reject` | 0/4 (0%) | 0/3 (0%) |
| Citation integrity | 4/4 ✓ | 3/3 ✓ |
| Novelty-checker invoked | ✗ (agent didn't exist) | 3/3 ✓ — found adjacent priors in every case |
| Validator verdict: pass | N/A | 2/3 |
| Validator verdict: patch | N/A | 1/3 (1 ✗ on C4 only) |
| Validator verdict: downgrade | N/A | 0/3 |
| Per-review wall-clock | 80+ min (timeout) / 90 s (lean) | ~100–160 s |

## What changed

1. **Reviewer spec slimmed** — inline rubric + non-trash checklist; ≤15 tool calls.
2. **`novelty-checker` agent built** — WebSearch-based adjacent-prior detection; reviewer delegates Novelty scoring to it.
3. **`idea-validator` agent built** — second-pass consistency checker (5-point: claim-capability, benchmark fitness, circularity, expected-signal groundedness, Risks↔Approach).
4. **Lead prompt tightened** — every expected-signal claim must cite a derivation; benchmark-fitness annotation required; no proxy MVEs using a different backbone than the target paper.

## Retroactive validation on Round 0 ideas

| Round 0 idea | Validator verdict | ✗ count |
|---|---|---|
| risk-aware-particle-planner | patch | 2 (C2 proxy-MVE mislabels regime; C4 CVaR-epistemic overclaim) |
| vla-critic-counterfactual-dagger | patch | 4 (C2 LIBERO-Goal category error; C3 residual shared-video-bias; C4 +15 SR ungrounded; C5 cross-embodiment IDM contradiction) |

These are real issues the Round-0 reviewer didn't catch because its job was fixing flagged concerns, not re-auditing the fix. The validator's existence means they're now visible to the user alongside the accepted idea.

## What the novelty-checker found (Round 1)

| Idea | Closest adjacent priors | Verdict |
|---|---|---|
| bidirectional-flow-matched-wam | mimic-video (2512.15692), VITA (2507.13231), BiFM (2603.24942) | adjacent, not collision |
| contact-reward-scorer-for-wm-mcts | STORM (2511.03077), VLA-Reasoner (2509.22643), TSMCTS (2502.17235) | adjacent, not collision |
| learned-working-memory-for-hierarchical-vla | MemoryVLA (2508.19236), CoMEM (2505.17670), EchoVLA (2511.18112) | adjacent, not collision |

None of these would have been caught by local-KB-only search — they're direct collision risks for a Round-0 version of the pipeline.

## Honest remaining limits

1. **Still 0 rejects** across 7 total ideas. The trash-checklist is being applied but nothing has failed it yet. Either lead naturally drafts above the reject floor (plausible; it's a strong lead) or the bar is still slightly soft. Needs n≥15 to tell apart.

2. **Single reviewer per idea.** A reviewer blindspot ships an idea unchecked except by the validator — which is a consistency check, not a novelty/impact reviewer. For borderline cases (sum 11–12), a second-opinion reviewer is the next upgrade.

3. **No ground truth.** "Top-tier quality" is still only measurable by real submission. Our Grade-A audit and validator are proxies.

4. **Validator is conservative about `downgrade`.** 0/5 ideas downgraded across both rounds. Might be right (none had fatal issues), might be cautious. A 2-strikes rule (≥3 ✗ marks = downgrade) would be stricter; left lenient for now.

5. **`gap-analyst` still not built.** Lead re-reads all `gaps.md` per session; aggregated gaps would sharpen direction and reduce redundant reading.

## Verdict

The pipeline is meaningfully better than Round 0:
- Novelty-checker closes the external-prior-art hole.
- Validator closes the reviewer-misses-its-own-fix hole.
- Reviewer spec fits within tool budget and is calibrating better.

It is **not** a "Perfect State" — that isn't a real endpoint. But the ideas produced in Round 1 (especially `contact-reward-scorer-for-wm-mcts` which is a clean accept + validator pass) are submission-grounded at a level that matches what a strong PhD student would write up as a project proposal.

For routine use from here: invoke `/ideate` after each `paper-scout`+`paper-digest` cycle; read accepted ideas + validator patch lists; the produced ideas are starting points, not submittable artifacts.
