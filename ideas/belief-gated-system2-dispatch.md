---
id: idea-20260418-03
slug: belief-gated-system2-dispatch
created: 2026-04-18
status: accepted
target_venue: CoRL
citations:
  - arxiv: 2604.11302
    role: method-inspiration
    note: 3D-ALP provides the world-model + MCTS + persistent SE(3) anchor substrate for the System-2 branch.
  - arxiv: 2604.11302
    role: gap-source
    note: 3D-ALP is strictly worse than greedy by 0.29 SR on non-memory steps; authors explicitly list hybrid System-1 / System-2 switching as a concrete testable improvement (gaps.md).
  - arxiv: 2604.07426
    role: enabling-technique
    note: GIRL's K=5 ensemble Expected Information Gain gives a calibrated epistemic-uncertainty signal at every step — the gate we need that 3D-ALP lacks.
  - arxiv: 2604.13942
    role: method-inspiration
    note: Goal2Skill's dual-system cerebrum/cerebellum framework and Φ_verify checkpoint design — but with a *learned uncertainty gate* replacing the VLM's linguistic verifier.
would_benefit_from:
  - "StreamVLA (arxiv 2602.01100, Feb 2026) — dual-system VLA with a 'Lock-and-Gated' mechanism that triggers slow thinking on detected sub-task transitions. The slow path is *textual decomposition + visual goal imagination*, not MCTS-over-WM, and the trigger mechanism (rule vs. learned classifier) is undisclosed. Establishes 'gated dual-system VLA' as a 2026 design pattern; we differentiate on the System-2 substrate (3D-anchored MCTS vs. text/image-gen) and the gate signal (counterfactual-regret on K=5 EIG vs. sub-task transition)."
  - "AC²-VLA (arxiv 2601.19634, Jan 2026) — adaptive computation *within* a single VLA forward pass via cache reuse, layer skipping, and token pruning, trained by action-guided self-distillation. Orthogonal axis: AC²-VLA is intra-policy compute pruning (no external planner); ours is inter-policy dispatch. The two could compose, but neither subsumes the other."
  - "E-MCTS (Deep Exploration by Planning with Epistemic Uncertainty) — adds epistemic uncertainty to MCTS for *exploration*, not for gating planner-vs-reactive dispatch. Adjacent on the ensemble-EIG-in-planning axis; not a collision."
---

## Title
Belief-Gated System-2 Dispatch: When to Invoke a World-Model Planner and When to Stay Reactive

## Problem
3D-ALP (2604.11302) gains +0.645 memory-task SR by running MCTS over a world-model oracle, but *loses* 0.29 SR on non-memory steps relative to a plain greedy reactive policy. Their own gap register names the fix — "hybrid System-1 / System-2 switching" — as the concrete next step but does not prototype it. Goal2Skill (2604.13942) implements a coarse version (VLM planner + VLA executor) but switches at sub-task boundaries via hand-coded post-conditions; it cannot react at the control-step granularity that 3D-ALP's failure pattern demands. More fundamentally, neither work has a principled signal that says "the reactive policy is about to enter a region where imagination / lookahead helps," so deploying System-2 becomes an always-on cost. What's missing is a **belief-uncertainty gate**: a per-step, learnable classifier that predicts whether the reactive policy is at risk of a long-horizon failure and dispatches search *only* when the expected regret of being reactive exceeds the expected cost of search.

## Core Idea
Train a scalar gate `g_t ∈ [0,1]` that fires System-2 search only when the reactive VLA's epistemic-value disagreement crosses a threshold, where the disagreement signal is GIRL-style Expected Information Gain over a deep ensemble of value heads. Gate firing is **self-supervised**: the training label is whether a 3D-ALP rollout from that state would have improved return over the reactive rollout — a counterfactual computed offline once and distilled into a cheap predictor for deployment.

## Approach
Two-phase training pipeline over a shared codebase instrumented with both a reactive VLA (OpenVLA-OFT or WAV's action decoder) and a 3D-ALP planner (InSpatio-WorldFM backbone, MCTS re-rooted per 2604.11302, kinematic bridge intact).

**Phase A — Collect gate labels.** Over a task distribution that includes memory-required, occlusion-heavy, and visible-only episodes (we use 3D-ALP's E3 plus an augmented LIBERO split with procedural occlusions):
1. At each timestep t, run both branches. Record (a) the reactive trajectory's terminal return R_reactive and (b) the 3D-ALP trajectory's terminal return R_plan.
2. Compute the binary label y_t = 1 iff R_plan > R_reactive + margin.
3. Record per-step features: K=5 value-head EIG σ_V(s_t), world-model one-step reconstruction residual ||Enc(I_real) − z_ref||, and number of occluded tracked objects from 3D-ALP's SE(3) scene graph.

**Phase B — Learn the gate.** Fit a small MLP g_θ: features_t → [0,1] with BCE loss against y_t, plus a cost-aware margin term `max(0, g_θ(s_t)(C_plan − C_reactive) − λ(R_plan − R_reactive))` that penalizes firing when the planner's wall-clock cost C_plan (known: ~2.4 s/frame on an A6000 per 3D-ALP's own measurement) exceeds its benefit.

**Deployment.** At every control step t:
- Compute features_t on-robot (ensemble forward pass is the only added cost, ~15% compute per 2604.07426's budget).
- If g_θ(features_t) > τ → run 3D-ALP with a compute budget scaled by g_θ (higher g → deeper MCTS).
- Else → reactive VLA.

The gate is trained once per embodiment and is transferable across tasks sharing the same observation space, because features (EIG, WM residual, occlusion count) are task-agnostic. Unlike Goal2Skill's VLM post-condition checks, the gate runs at every control step at <1ms latency.

## Why Now
- 2604.11302 gave us a concrete System-2 primitive (MCTS + SE(3) anchor) with published numbers on when it helps (memory-required steps) and when it hurts (visible steps) — so we have a ready-made oracle to train against.
- 2604.07426 showed that K=5 value-head EIG is a calibrated, cheap uncertainty signal for model-based RL, and proposed a distilled single-pass student (5.1% overhead) that can run on-robot.
- 2604.13942 confirmed that a dual-system hierarchy beats monolithic VLAs by 3× on long-horizon RMBench, validating that the switching locus is the right place to add intelligence — just not via hand-coded language verifiers.

## Expected Contribution
- First cost-aware dispatcher for System-1/System-2 manipulation control, with an explicit regret-vs-cost trade-off baked into the loss.
- On 3D-ALP's E3 benchmark, target ≥0.60 memory SR (matching full 3D-ALP) while recovering ≥0.70 SR on visible steps (matching the reactive policy), eliminating the −0.29 SR penalty.
- On long-horizon LIBERO-Long, target ≥+2.0 SR over the reactive baseline with ≤1.5× average wall-clock (vs. always-on 3D-ALP at ~4×).
- A released dataset of (state, feature-vector, gate-label) tuples for benchmarking future gates.

## Minimum Viable Experiment (MVE)
- **Setup:** Reuse 3D-ALP's E3 (30 episodes × 3 seeds) + a 4-task LIBERO-Long subset with procedural occlusion injection.
- **Baselines:** (a) greedy reactive, (b) always-on 3D-ALP, (c) naive oracle gate (cheat with ground-truth occlusion flag only).
- **Ours:** learned gate g_θ trained on Phase A data from 3 training tasks and evaluated zero-shot on held-out tasks.
- **Metrics:** memory-SR, non-memory-SR, mean compute cost per episode (in seconds), gate precision/recall against the oracle cheat label.
- **Expected signal:** non-memory SR ≥ greedy − 0.02 (recovers most of the lost precision); memory SR ≥ 3D-ALP − 0.05; compute cost ≤ 0.4 × always-on 3D-ALP.

## Risks & Failure Modes
- **EIG is dominated by irrelevant uncertainty.** Ensemble disagreement can spike due to lighting / texture variance unrelated to control-relevant epistemic risk; the gate fires spuriously. Mitigation: condition EIG on task embedding and regress σ_V against only future-return variance (not reconstruction variance).
- **Gate label is non-stationary.** Once the student learns the gate, the reactive policy changes (the gate is part of the loop), so the R_reactive distribution used to generate y_t is stale. Mitigation: iterate Phase A/B in a DAgger-style loop, re-collecting labels under the current gate.
- **System-2 dispatch is too late in truly reactive failures.** Some failures (slip, force overshoot) happen within a single step — the gate cannot help. We do not claim it does: the method targets the *memory-vs-precision* trade-off 3D-ALP specifically exposes, not control-frequency reactivity.

## Not To Be Confused With
This is not Goal2Skill's dual-system hierarchy (2604.13942) ported to 3D-ALP: Goal2Skill dispatches at sub-task boundaries via VLM language verifiers, while our gate fires at every control step from a learned scalar ensemble-uncertainty signal, and we optimize a cost-regret trade-off explicitly rather than relying on hand-designed post-conditions. It is also not "always-on ensemble uncertainty": the gate uses the ensemble to decide *when to plan*, not to weight the plan.

---

## Review
reviewer: dr-agent-reviewer
date: 2026-04-18

**Scores**
- Novelty: 4/5 — Dual-system dispatch is a known framing, but a regret-vs-cost loss over GIRL-style EIG with counterfactual planner-vs-reactive labels at control-step granularity is a genuinely new formulation.
- Impact: 4/5 — Directly resolves the −0.29 SR non-memory penalty that 3D-ALP's own gap register flags; likely to be picked up by the VLA-planner and world-model-MCTS sub-community and sets a benchmark that others can compare against.
- Feasibility: 4/5 — All primitives exist in the cited KB (3D-ALP oracle, OpenVLA-OFT reactive, K=5 GIRL ensemble), the MVE is concretely scoped to E3 + LIBERO-Long, but the Phase-A counterfactual double-rollout compute budget is not quantified and the DAgger re-labelling loop is mentioned but not costed.
- Sum: 12/15

**Venue fit:** CoRL is the right target — the System-1/System-2 dispatch question is central to the VLA / world-model planning discussion there, and the manipulation-scale MVE matches CoRL's empirical bar. Secondary fit: RSS (planning-under-uncertainty track).

**Strengths**
- Problem is diagnosed from a published, measured defect (non-memory SR drop) rather than hand-waved — the gap is named in 2604.11302's own future-work list.
- Cost-aware loss term with a real wall-clock number (2.4 s/frame measured) is unusually concrete for an idea-stage draft.
- "Not To Be Confused With" section correctly distinguishes from Goal2Skill's coarse VLM-verifier gate and from ensemble-weighted planning — shows the author has triangulated against neighbours.

**Concerns**
- Phase A (Collect gate labels): running both branches at every step over 3D-ALP's E3 plus a LIBERO-Long subset is ~2.4 s × control-steps × episodes × seeds; no budget is given. A single pass could easily hit hundreds of A6000-hours. This needs an explicit compute estimate or a subsampling strategy (e.g. label only at EIG-high states and use propensity reweighting).
- Risks & Failure Modes (label non-stationarity): the DAgger mitigation is named but un-costed. Each iteration repeats Phase A, so a 2-iteration loop doubles compute; the draft should specify how many iterations the MVE budgets.
- Expected Contribution (released dataset): the "(state, feature-vector, gate-label) tuples" dataset is promised but the schema, license, and size are unspecified — either commit to a concrete artefact or drop the bullet.
- Approach §Phase B cost-aware margin: the penalty `max(0, g_θ(s)(C_plan − C_reactive) − λ(R_plan − R_reactive))` is sign-inverted — if C_plan > C_reactive and we *want* the gate to fire anyway when R_plan ≫ R_reactive, the penalty as written pushes g_θ down even at high-benefit states. Needs either sign correction or a worked example.
- Expected Contribution (target ≥0.60 memory SR): 3D-ALP hit 0.650 with the full planner; a gated version that plans less often should target slightly lower but not 0.60 flat — justify why −0.05 SR is acceptable or tighten the target.

**Verdict:** improve
**Rationale:** The idea is well-grounded, novel enough, and the MVE is specific; all five concerns are paragraph-scale fixes (compute budget, DAgger iteration count, dataset spec, margin sign, target justification) rather than fundamental issues. With those pinned down, this is a clear CoRL submission.

## Revised Version (reviewer amendments)

### What I changed and why
- Changed Approach §Phase A: added explicit compute budget and a subsampling strategy — addresses: "Phase A counterfactual double-rollout compute is not quantified".
- Changed Approach §Phase B: corrected the cost-aware margin sign and restated as a hinge on expected regret — addresses: "margin term is sign-inverted".
- Changed Risks §label non-stationarity: committed to 2 DAgger iterations with a fixed re-labelling budget — addresses: "DAgger mitigation is un-costed".
- Changed Expected Contribution: replaced the flat memory-SR target with a regret-efficiency curve target, and specified the released dataset schema — addresses: "target 0.60 is arbitrary" and "dataset under-specified".
- Kept Core Idea, Why Now, Not To Be Confused With: these are sound and load-bearing; edits would dilute them.

### Revised Core Idea
Train a scalar gate `g_t ∈ [0,1]` that fires System-2 (3D-ALP MCTS) only when a K=5 ensemble's Expected Information Gain and world-model residual jointly predict positive counterfactual regret of the reactive policy, with the training label computed offline from paired planner-vs-reactive rollouts and a cost-aware hinge loss that internalises the planner's ~2.4 s/frame wall-clock.

### Revised Approach
Two-phase pipeline on a shared codebase running OpenVLA-OFT (reactive) and 3D-ALP (System-2) against InSpatio-WorldFM.

**Phase A — Collect gate labels (budget: 500 A6000-hours).** Rather than double-rollout at every control step, we restrict label collection to *candidate-informative* states: run the reactive policy to completion on each episode, then for every state whose on-policy K=5 EIG σ_V(s_t) is above the 60th percentile of that episode's distribution, branch a 3D-ALP rollout from s_t and record (R_plan, R_reactive, features_t). Unlabelled states receive a weak label (y_t = 0 with propensity-weighted loss). This caps per-episode planner invocations at ≤0.4 × episode-length, bringing the E3 + 4-task LIBERO-Long split to ~500 A6000-hours (measured from 3D-ALP's 2.4 s/frame × planner depth D=2 × B=4).

**Phase B — Learn the gate.** Fit a small MLP g_θ: features_t → [0,1] with BCE loss against y_t, plus a cost-aware hinge
`L_cost = g_θ(s_t) · max(0, C_plan − λ(R_plan − R_reactive))`
which is zero when the expected return uplift dominates the wall-clock cost and active (pushing g_θ down) only when the planner is expected to lose on regret-per-second. λ is a scalar set by matching the greedy policy's cost on a validation split.

**DAgger.** Iterate Phase A → Phase B exactly twice, re-collecting ~20% of labels under the trained gate's state distribution on the second pass (budget: +100 A6000-hours).

**Deployment.** Per control step, compute features_t (~15% added compute from the ensemble forward pass), threshold g_θ against τ chosen on the validation split, dispatch 3D-ALP with MCTS depth scaled by ⌈2·g_θ⌉ ∈ {1,2}.

### Revised MVE
- **Dataset:** 3D-ALP's E3 (30 ep × 3 seeds) + a 4-task LIBERO-Long subset with procedural occlusion injection; label-collection budget 500 A6000-hours Phase A + 100 Phase B.
- **Baselines:** (a) greedy reactive, (b) always-on 3D-ALP, (c) ground-truth occlusion-flag oracle gate, (d) fixed-threshold EIG-only gate (no counterfactual training).
- **Metrics:** regret-efficiency curve — SR recovered vs. compute spent, swept over τ. Headline points: (i) at ≤0.4× always-on compute, memory SR ≥ 0.60 *and* non-memory SR ≥ greedy − 0.02; (ii) gate AUPRC against the oracle cheat label ≥ 0.75.
- **Released artefact:** CSV of (episode_id, step_t, feature_vector, R_plan, R_reactive, y_t) tuples with schema documented in the repo; CC-BY-4.0.
- **Expected signal:** the learned gate dominates baseline (d) on AUPRC by ≥0.1 (confirming the counterfactual label carries signal beyond raw EIG) and dominates (b) on regret-efficiency by ≥2× on the non-memory segment.

### Revised Risks
- Phase A label budget underestimated: the 60th-percentile EIG threshold may still select too many states on occlusion-heavy LIBERO episodes, blowing the 500 A6000-hour cap. Fallback: lower to 40th-percentile with explicit discussion of label-coverage bias.
- DAgger collapse: if the gate learns to always-fire on the second iteration, the re-labelled distribution becomes indistinguishable from always-on 3D-ALP. Mitigation: freeze the cost term λ across iterations and monitor gate firing rate as a training-time assertion.
- Cross-embodiment transfer unverified: the claim "trained once per embodiment and transferable across tasks" is not tested in the MVE (held-out tasks share embodiment). This is a scoped limitation, not a fix.

---

## Related Work — Audit 2026-04-19
audit_round: novelty-recheck
priors_added: StreamVLA (2602.01100), AC²-VLA (2601.19634), E-MCTS

The original Round-0 review predated the `novelty-checker` agent and ran zero live web searches. A 2026-04-19 audit using the patched novelty-checker pipeline surfaced two recent (Jan / Feb 2026) gated-VLA papers and one MCTS+epistemic-uncertainty prior. None is a direct collision.

**Prior 1 — StreamVLA (Lin et al., arxiv 2602.01100, Feb 2026).** A dual-system VLA whose "Lock-and-Gated" mechanism triggers slow thinking *only* on detected sub-task transitions. Slow path = textual task decomposition + visual goal-image generation. Achieves 98.5% LIBERO with 48% latency reduction. The trigger label and classifier head are not disclosed in the abstract.

**Prior 2 — AC²-VLA (arxiv 2601.19634, Jan 2026).** Conditions a single VLA's compute graph on observation+instruction+previous-action context to enable "cognition reuse across timesteps, token pruning, and selective execution of model components" within one forward pass. Trained by action-guided self-distillation; 1.79× speedup at 29.4% FLOPs.

**Prior 3 — E-MCTS (OpenReview).** Adds epistemic-uncertainty bonuses to MCTS for *exploration* in model-based RL. Uses ensemble disagreement at the planner level.

### Sharpened Delta

The "first learned gate over a slow VLA path" framing is no longer available — StreamVLA owns it. The "first VLA with adaptive compute" framing is no longer available — AC²-VLA owns it. The "epistemic-uncertainty inside MCTS" framing is no longer available — E-MCTS owns it.

What this idea uniquely does, the *triple* together:
1. **The System-2 substrate is a 3D-anchored MCTS-over-WM planner** (3D-ALP, 2604.11302), with measured ~2.4 s/frame wall-clock, not text decomposition + image-gen (StreamVLA) or intra-pass compute pruning (AC²-VLA). The gate's cost-aware loss is *load-bearing* precisely because the System-2 cost is two orders of magnitude higher than StreamVLA's slow path; a sub-task-transition rule would catastrophically over-trigger.
2. **The gate is supervised by counterfactual planner-vs-reactive *regret*, not by sub-task transitions or distillation targets.** This is a fundamentally different supervision regime: StreamVLA's trigger label (whatever it is) is task-structural; ours is rollout-derived (R_plan − R_reactive). An EIG-only baseline (B-d in the MVE) directly tests whether the regret label adds signal beyond raw uncertainty.
3. **AC²-VLA composes orthogonally.** Our gate dispatches at the policy level; AC²-VLA prunes within a policy. A future paper could stack: gate selects {reactive-dense, reactive-pruned, MCTS-shallow, MCTS-deep}. This is acknowledged but scoped out.

Why the difference matters: the cost-aware hinge `L_cost = g_θ(s_t) · max(0, C_plan − λ(R_plan − R_reactive))` cannot be derived from a transition detector — it requires the counterfactual rollout pair as supervision. If the regret signal is uninformative beyond EIG (B-d wins), the contribution collapses and the right paper is StreamVLA + EIG threshold.

### Honest novelty verdict (post-audit)

Pursue, with two amendments:
- **Promote B-d (fixed-threshold EIG-only gate, no counterfactual training) from "baseline (d)" to a primary head-to-head.** It is now the cleanest test of whether the *counterfactual-regret label* — the genuinely new supervision — is doing work, given that StreamVLA already establishes the gate-the-slow-path concept and EIG is now a published 2025 idea (E-MCTS).
- **Frame the contribution as "gate calibration via counterfactual regret labels," not "first learned gate for VLA."** The dispatch-vs-reactive-VLA framing is now crowded; the calibration signal is the unique part.
