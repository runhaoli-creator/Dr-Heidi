# Status — Dr. Heidi

**Phase:** Phase 2 + Phase 3 (novelty-checker + idea-validator); Round 1 validated.
**Last updated:** 2026-04-18

## Done
### Phase 1 — Foundation
- arXiv fetch pipeline, `paper-scout`, `paper-digest`

### Phase 2 — Dual-agent ideation + reviewer co-authoring
- `lead-researcher`, `reviewer`, `ideate` skill

### Phase 3 (partial)
- `novelty-checker` agent (live WebSearch/WebFetch for adjacent priors)
- `idea-validator` agent (5-point consistency re-check: C1 capability, C2 benchmark fitness, C3 circularity, C4 signal grounding, C5 Risks↔Approach contradiction)

### Round 0 (baseline) — 2026-04-18
- 4 ideas drafted, 4 reviewed (all improve), 0 rejected, 100% citation integrity
- Retroactive validator caught 2 ✗ on risk-aware-particle-planner, 4 ✗ on vla-critic

### Round 1 (with patches) — 2026-04-18
- 3 ideas drafted under tighter lead prompt, 3 reviewed: 1 accept / 2 improve / 0 reject
- Novelty-checker surfaced real adjacent priors in all 3 cases
- Validator: 2 pass / 1 patch (C4 only) / 0 downgrade
- Full comparison: `trends/round1_comparison.md`

## Accepted ideas (7 total in `ideas/`)
**Round 0 (all reviewer-amended, all flagged by validator):**
- `risk-aware-particle-planner-for-wam.md` — NeurIPS
- `self-supervised-affordance-maps-from-real-play.md` — CVPR
- `belief-gated-system2-dispatch.md` — CoRL
- `vla-critic-counterfactual-dagger.md` — ICRA

**Round 1 (novelty-checker + validator in pipeline):**
- `bidirectional-flow-matched-wam.md` — improve, validator pass
- `contact-reward-scorer-for-wm-mcts.md` — **clean accept**, validator pass
- `learned-working-memory-for-hierarchical-vla.md` — improve, validator patch (C4)

## Next steps
- [ ] Build `gap-analyst` (Phase 3 completion) — aggregate `gaps.md` across digests
- [ ] Phase 4: cron daily `paper-scout` + weekly trend digest via `/schedule`
- [ ] Consider: second-opinion reviewer for borderline (sum 11–12) ideas
- [ ] Real test: take `contact-reward-scorer-for-wm-mcts` to a draft → see whether a colleague agrees with the CoRL verdict

## Known limits
- 0 rejects across 7 ideas. Either lead is above the reject floor or the bar is still slightly soft. Needs n≥15 to disambiguate.
- Single reviewer per idea. Validator is orthogonal (consistency, not novelty/impact).
- "Top-tier quality" is only measurable by real submission — internal rubric is a proxy.

## Blockers
- None.
