---
id: idea-20260418-04
slug: vla-critic-counterfactual-dagger
created: 2026-04-18
status: accepted
target_venue: ICRA
citations:
  - arxiv: 2604.11351
    role: method-inspiration
    note: WM-DAgger provides the world-model-based corrective-action synthesis pipeline (EAC-WM, pivot sampling, consistency filter) that we extend.
  - arxiv: 2604.11351
    role: gap-source
    note: WM-DAgger's symmetric deviate-then-return trajectories cannot cover velocity drift / asymmetric / multi-modal recoveries; filter is single-frame DINOv2 and prunes on terminal similarity only — authors flag both as open gaps.
  - arxiv: 2604.13733
    role: method-inspiration
    note: VLAJS shows a pretrained VLA can be used as a *directional* auxiliary signal (cosine misalignment loss) that is robust to OOD teacher cameras and to teachers with weak execution skill.
  - arxiv: 2604.09330
    role: enabling-technique
    note: VAG's synchronized dual-stream video+action flow-matching gives a generator that jointly produces (video, action) pairs, closing the loop we need to score recoveries on both modalities.
  - arxiv: 2604.09330
    role: baseline
    note: Reviewer addition — VAG's action branch is also used as a *baseline action-scoring* head (alternative to VLA critic) to isolate the value of the VLA's semantic prior vs. VAG's own joint generator.
would_benefit_from:
  - "VLAC (arxiv 2509.15937, 2025) — VLA used as a process reward model that scores state-pair transitions for online RL. Single critic, online deployment, scores single transitions (not N-way recoveries). Establishes 'VLA-as-critic' as a primitive; our delta is two-VLA *intersection* ranking applied to N=8 widened recoveries in an offline DAgger pipeline."
  - "VLA-in-the-Loop (OpenReview ICLR 2026) — online event-triggered WM+IDM corrector at deployment that decodes IDM actions to recover from base-VLA failures on grasping tasks. Single composite WM, single corrector path, runs at deployment time. We differ on: offline data-augmentation (vs. deployment correction), N-way recovery proposals (vs. one corrected trajectory), two-VLA intersection ranking (vs. no ranking)."
  - "Counterfactual VLA / CF-VLA (arxiv 2512.24426, Dec 2025) — autonomous-driving VLA with a 'rollout-filter-label' loop that mines high-value scenes from a base VLA's rollouts and labels counterfactual reasoning traces for retraining. Architecturally close in spirit (rollout→filter→label→retrain), but: (a) different domain (driving meta-actions vs. tabletop manipulation), (b) self-ranking from one VLA vs. our two-VLA intersection, (c) no separate IDM step. The closest 2025 prior on the loop pattern; our delta lives in the manipulation-action geometry, the multi-critic intersection, and the IDM-shortcut-breaking step."
  - "Compliant Residual DAgger / CR-DAgger (arxiv 2506.16685, NeurIPS 2025) — DAgger with residual corrections from humans for contact-rich tasks. Establishes residual-DAgger framing; we replace humans with VLA critics over WM-synthesized recoveries."
---

## Title
VLA-Critic Counterfactual DAgger: Using a Vision-Language-Action Teacher as a Failure-Ranker over World-Model Recoveries

## Problem
WM-DAgger (2604.11351) synthesizes OOD recovery data by rolling out a learned world model on **hand-designed symmetric deviate-then-return trajectories at expert-average speed**. This covers a narrow slice of the compounding-error manifold: the gaps.md explicitly lists velocity drift, orientation drift, asymmetric recoveries, and multi-modal recoveries as uncovered regimes. Worse, the consistency filter is one scalar — DINOv2 cosine similarity on the terminal synthesized frame — which misses mid-trajectory hallucinations and cannot distinguish "the WM produced a plausible-looking but semantically wrong recovery" from "the WM produced a genuine recovery." Separately, VLAJS (2604.13733) demonstrates that a pretrained VLA, even a weak one, emits directionally useful action hints and is robust to OOD teacher cameras. This sits unused in the WM-DAgger pipeline, where the VLA is only the downstream student, never the teacher.

## Core Idea
Turn the VLA from a student into a **counterfactual critic**: for each pivot state in an expert trajectory, let the world model generate a **diverse set of N divergent recovery trajectories** (not a single symmetric one), then use a pretrained VLA's directional agreement with each trajectory's action stream as a *ranking score* — the VLA answers "which of these imagined recoveries looks like the kind of recovery I would produce from this state?" Aggregate over trajectories to get a dense, per-step, VLA-endorsed recovery dataset, replacing the symmetric-geometric heuristic with a learned semantic prior.

## Approach
1. **Diverse recovery proposal.** At pivot timestep m in an expert clip, sample N=8 unit directions v_d ∈ S^2 uniformly on the sphere (dropping WM-DAgger's 120° cone; we want multi-modal coverage). For each v_d, draw a speed scalar s ∈ [0.5, 1.5] × expert-avg-speed. For each (v_d, s), build a length-2k asymmetric trajectory: deviation phase of 2k/3 steps in direction v_d at speed s, recovery phase of 4k/3 steps whose endpoint is the expert's k-th future state but whose shape is *free* (sampled from a rectified-flow prior conditioned on endpoints only).
2. **Joint video+action synthesis.** Roll each of the N trajectories through a joint video-action generator built on VAG's dual-stream flow-matching architecture (2604.09330), so every recovery yields an **aligned** (video, action) sequence rather than just video. VAG's existing AgiBot and LIBERO checkpoints provide the initialization.
3. **VLA critic score.** For each recovery, query a pretrained VLA (OpenVLA-OFT or π0.5) on the synthesized video frames and receive a predicted action stream `a^VLA_{t}`. Compute per-step cosine alignment — the same directional loss used by VLAJS (2604.13733) — between `a^VLA_t` and the synthesized action stream `a^syn_t`. Average across the recovery horizon to get a scalar score `s_crit`.
4. **Per-step gating.** Accept a synthesized recovery into the augmented dataset iff (a) `s_crit > τ_dir` (VLA endorses direction), (b) WM-DAgger's DINOv2 filter passes (frames look physically plausible), and (c) action velocity profile fits a per-embodiment smoothness prior (guards against teleportation artifacts from step 2). Importantly, (a) and (b) are near-orthogonal: (b) rules out hallucinated pixels; (a) rules out plausible pixels paired with semantically wrong actions. Together they catch the dual failure modes WM-DAgger's single filter misses.
5. **Student training.** Aggregate expert demos + filtered recoveries; train the downstream policy (Gr00t N1.5 or π0.5) with the standard flow-matching / MSE objective. No change to the student architecture.

Because the VLA is used only as a *scoring function*, it can be weak on closed-loop execution (VLAJS's robustness result) while still being useful as a ranker — this is the observation that makes the scheme practical.

## Why Now
- 2604.11351 published concrete numbers showing WM-synthesized DAgger works (93.3% on 5-shot soft bag vs 26.7% BC) and explicitly named asymmetric/velocity-drift/multi-modal coverage as the frontier.
- 2604.13733 established that cosine-direction loss from a pretrained VLA is a useful, OOD-robust supervision signal that does not require the VLA to execute well — the exact property we need to turn the VLA into a cheap, broadly-applicable critic.
- 2604.09330 released a dual-stream video+action generator that emits aligned (video, action) outputs rather than video-only, enabling step 2 above to run without the IDM post-hoc action recovery that WM-DAgger has to rely on.

## Expected Contribution
- A new filtering criterion for WM-DAgger-style pipelines that catches semantic action errors, not just pixel hallucinations, by using a VLA as a direction-sense critic.
- A method that generalizes to asymmetric and multi-modal recoveries without hand-engineered speed/direction priors.
- On WM-DAgger's towel-folding task (46.7% ceiling noted in gaps.md) target ≥60% SR by expanding the effective recovery manifold.
- On multi-modal variants of the soft-bag-push / pick-and-place benchmarks (two valid grasp strategies per task), target ≥+15 SR over WM-DAgger, whose cone-constrained sampler cannot represent the second mode.

## Minimum Viable Experiment (MVE)
- **Setup:** Reproduce WM-DAgger on its 4 tasks (soft bag, pick-and-place, ballot, towel) using the released EAC-WM + Gr00t N1.5 stack. Add a 2-task multi-modal variant (two valid grasp strategies).
- **Variants:** (a) WM-DAgger vanilla, (b) + diverse sampling only (step 1), (c) + VAG dual-stream synthesis (step 2), (d) + VLA critic (step 3), (e) full pipeline.
- **Metrics:** Success rate per task, multi-modal coverage rate, fraction of synthesized trajectories accepted by each filter, ablation on critic strength (which VLA).
- **Expected signal:** Full pipeline ≥ WM-DAgger on all 4 original tasks; ≥+13 SR on towel folding (where WM-DAgger plateaus); ≥+15 SR on multi-modal variants; critic-only ablation (d) recovers ≥70% of full-pipeline gain, showing the VLA ranker is the dominant new ingredient.

## Risks & Failure Modes
- **Weak VLAs score randomly on hallucinated frames.** The VLA's directional prediction may depend on textures the WM gets wrong, making `s_crit` noisy. Mitigation: require (a) AND (b) — DINOv2 filter first, VLA critic second; measure the VLA's inter-view directional consistency (VLAJS Fig. 10 analogue) as a sanity check before deploying it as a critic.
- **VLA agrees with all 8 diverse directions.** If the VLA is diffuse, its filtering rate is too permissive. Mitigation: use soft-max temperature and require `s_crit` to be in the top-k of the 8 samples, not just above an absolute threshold.
- **Critic introduces VLA's own biases.** The student could inherit a weak VLA's systematic errors. Mitigation: re-run the selection with two different VLA critics (OpenVLA-OFT and π0.5) and keep only the intersection.

## Not To Be Confused With
This is not distillation from a VLA teacher (the student never imitates the VLA's actions) and not WM-DAgger with a second filter: the VLA is used to **rank** a fundamentally wider set of proposal trajectories that WM-DAgger's cone-and-symmetric-speed generator could not produce in the first place. The VLAJS directional loss is borrowed, but its target here is counterfactual trajectory *scoring* rather than on-policy PPO regularization.

---

## Review
reviewer: dr-agent-reviewer
date: 2026-04-18

**Scores**
- Novelty: 4/5 — using a pretrained VLA as a counterfactual ranker over a widened WM proposal set is a distinct composition, not just a second filter bolted onto WM-DAgger.
- Impact: 4/5 — directly attacks WM-DAgger's named frontier gaps (towel 46.7% ceiling, multi-modal/velocity-drift recoveries) and the single-filter bottleneck; result would be picked up by the Gr00t / π0.5 student-training line.
- Feasibility: 4/5 — EAC-WM + Gr00t N1.5, VAG dual-stream, and OpenVLA-OFT/π0.5 are all reproducible; the main uncertainty is whether VAG transfers to pivot-state conditioning and whether the "endpoint-conditioned rectified-flow prior" in step 1 is trainable from available data.
- Sum: 12/15

**Venue fit:** ICRA primary target is right; CoRL as secondary if the critic-as-ranker framing is sharpened beyond WM-DAgger's particular setup. Not NeurIPS/CVPR — too method-in-a-pipeline.

**Strengths**
- Correctly identifies WM-DAgger's single-scalar DINOv2 terminal-frame filter as orthogonal to semantic action error, and argues the (a)∧(b) gating from a principled decomposition.
- VLAJS-style robustness-of-weak-VLAs-as-critic justification (Section "Approach", final paragraph) is exactly the right enabling observation and is correctly cited.
- MVE ablation ladder (a)→(e) cleanly attributes gain to the critic vs. diverse sampling vs. joint synthesis — including the critic-only rung (d) that tests the central claim.

**Concerns**
- **Approach step 1 ("Diverse recovery proposal"):** The "rectified-flow prior conditioned on endpoints only" is under-specified. What data is it trained on? If it is only trained on expert trajectories it cannot produce OOD asymmetric shapes; if on Play Data it may be too noisy. Needs a concrete training source.
- **Approach step 3 ("VLA critic score"):** The cosine score compares VLA's predicted actions to VAG's synthesized actions. Both conditioned on the same synthesized video frames — the VLA may simply agree with whatever VAG emitted when the frames look in-distribution, not because the recovery is correct. The scheme needs an independence argument or a randomization check (e.g., VLA score on shuffled (video, action) pairs).
- **Approach step 4 ("Per-step gating"):** (a) "VLA endorses direction" on synthesized video frames is not orthogonal to (b) "DINOv2 says frames look plausible" in the way claimed — if (b) fails, the VLA's (a) signal is also meaningless. The pipeline should be (b) first, then (a) computed only on the (b)-passing set, and the paper should report the conditional accept rate.
- **Expected Contribution / MVE:** "Multi-modal variants of soft-bag-push / pick-and-place (two valid grasp strategies per task)" is not anchored to an existing benchmark. Either cite LIBERO-Object/LIBERO-Goal variants with known multi-modality or state that this is a new evaluation protocol the paper introduces (with inter-rater criteria for "distinct modes").
- **Risks:** The "run two VLA critics and keep the intersection" mitigation (OpenVLA-OFT ∩ π0.5) should be an affirmative design choice, not a post-hoc fallback — include it in the method and ablate the intersection-vs-union cost.

**Verdict:** improve
**Rationale:** The core thesis — VLA-as-ranker over a widened WM proposal set — is novel, well-motivated by the cited gaps, and the MVE is concrete. But the circularity risk in step 3 (VLA scores VAG using the video VAG produced) and the under-specified endpoint-conditioned prior in step 1 are fixable with one paragraph each, not a rewrite. Sum 12/15 lands just below the accept bar because of these two specification gaps.

## Revised Version (reviewer amendments)

### What I changed and why
- Changed Approach step 1: specified the asymmetric-recovery prior as a conditional flow-matching model trained on *real expert trajectories with artificial pivot-then-recover splices*, not free-form. Addresses: "rectified-flow prior conditioned on endpoints only is under-specified."
- Changed Approach step 3: added an independence guard — the VLA critic is scored on (video, action) pairs where the action stream is also *re-inferred by a frozen Inverse Dynamics Model from the synthesized video*, not read off from VAG. This breaks the VAG→action→VLA shortcut. Addresses: "circularity in step 3."
- Changed Approach step 4: reordered gating to (b)→(a) and report conditional accept rate. Addresses: "(a) and (b) are not orthogonal when (b) fails."
- Changed MVE: replaced ad-hoc multi-modal variants with LIBERO-Goal (which has known bimodal task decompositions) and added a small custom "two-grasp" extension with a pre-registered rubric. Addresses: "not anchored to an existing benchmark."
- Changed Risks/Method: promoted the two-VLA intersection from mitigation to default method. Addresses: "affirmative design choice, not post-hoc."
- Kept Problem, Core Idea, Why Now, Not To Be Confused With: these are load-bearing and correctly framed.

### Revised Core Idea
Turn a pretrained VLA into a *counterfactual critic* that ranks a diverse, asymmetric set of world-model-generated recovery trajectories — using IDM-inferred (not generator-emitted) action streams for the critic query so the score cannot trivially agree with the generator — and train the student VLA only on the intersection of two VLA critics' top-ranked recoveries.

### Revised Approach
(1) **Asymmetric-recovery prior.** Construct paired training data by taking real expert trajectories, choosing random pivot m and horizon k, and treating the segment from m to m+k as an endpoint-conditioned target; train a small conditional flow-matching model p(trajectory | state_m, state_{m+k}, direction v_d, speed s) on these splices. At inference, sample v_d uniformly on S^2 and s ∈ [0.5, 1.5]× expert-avg; draw N=8 shapes per pivot. (2) **Joint video+action synthesis.** Roll each trajectory through VAG (2604.09330) to get aligned (video, action_VAG) pairs. (3) **IDM-re-inferred actions.** Run a frozen Inverse Dynamics Model on the synthesized video alone to obtain action_IDM, independent of VAG's action head. (4) **VLA critic score.** Query two pretrained VLAs (OpenVLA-OFT and π0.5) on the synthesized frames; compute per-step cosine alignment between each VLA's predicted action and action_IDM; average over horizon for s_crit^{VLA1}, s_crit^{VLA2}. (5) **Gating.** First apply DINOv2 terminal-frame filter (keep above-median); on survivors compute s_crit^{VLA1}, s_crit^{VLA2}; accept recoveries in top-k under *both* critics. Report conditional accept rates at each stage. (6) **Student training.** Aggregate expert + accepted recoveries; train Gr00t N1.5 with standard flow-matching.

### Revised MVE
- **Setup:** Reproduce WM-DAgger on its 4 original tasks (soft bag, pick-and-place, ballot, towel folding) using released EAC-WM + Gr00t N1.5. Add LIBERO-Goal for multi-modal evaluation and a 2-task pre-registered "two-grasp" extension.
- **Baselines:** (a) WM-DAgger vanilla; (b) + diverse sampling (step 1 prior); (c) + VAG joint synthesis (step 2); (d) + IDM-independent single-VLA critic (steps 3–4, one critic); (e) full pipeline with two-VLA intersection; (f) VAG-action-head-as-critic (to isolate VLA semantic prior vs. VAG's own generator, per reviewer-added baseline in frontmatter).
- **Metrics:** Success rate per task; multi-modal coverage rate on LIBERO-Goal; conditional accept rate at each filter stage; ablation on critic identity.
- **Expected signal:** (e) ≥ WM-DAgger on all 4 original tasks; ≥+13 SR on towel folding; ≥+15 SR on LIBERO-Goal multi-modal subset; (d) recovers ≥70% of (e)'s gain; (f) underperforms (d) by ≥5 SR (confirming the VLA's semantic prior, not just VAG's generator, carries the signal).

### Revised Risks
- Endpoint-conditioned prior overfits to near-expert shapes and fails to produce genuinely OOD recoveries; mitigate by training with aggressive v_d / s augmentation and reporting KL between proposal and expert action distributions.
- IDM is itself noisy on synthesized frames, making action_IDM and VLA prediction correlated through shared video-feature biases; mitigate by cross-embodiment IDM (train IDM on a held-out embodiment's real data) and report score stability vs. IDM temperature.
- Two-VLA intersection is too strict and accept rate collapses below 5%; mitigate by reporting the Pareto frontier over intersection threshold and falling back to weighted-sum of the two critic scores if needed.

---

## Validator
validator: dr-agent-validator
date: 2026-04-18

**Checklist**
- C1 Claim-capability alignment: ✓ — VAG joint video+action generation, VLAJS directional cosine loss / OOD-camera robustness, and WM-DAgger's named gaps all match the paper notes.
- C2 Benchmark fitness: ✗ — LIBERO-Goal varies goal/language specification, not action-space modality (Revised MVE line "LIBERO-Goal for multi-modal evaluation" and "≥+15 SR on LIBERO-Goal multi-modal subset" are category errors). The pre-registered "two-grasp" extension is the appropriate vehicle; LIBERO-Goal should be cast as a goal-specification generalization test, not a multi-modal-action test.
- C3 Circularity: ✗ — Revised step 3 labels IDM-inferred actions as breaking the VAG→VLA shortcut, but both IDM and VLA consume the SAME VAG-synthesized video; shared video-feature biases (esp. VAG hallucination artifacts) can still correlate action_IDM with the VLA's prediction. The revised Risks acknowledges exactly this, so the Approach's "independent of VAG's action head" wording overclaims — the correct framing is attenuated-not-broken.
- C4 Expected-signal groundedness: ✗ — "≥+15 SR on LIBERO-Goal multi-modal subset" has no derivation or reference point (compounded by the C2 category error). The "≥+13 SR on towel folding" is anchored (WM-DAgger 46.7% → 60% target from the Expected Contribution section) and is fine.
- C5 Risks-vs-Approach contradiction: ✗ — The Approach needs action_IDM accurate on the test-training embodiment, but Risks mitigates IDM noise by training on a *held-out* embodiment — a cross-embodiment IDM will be worse (not cleaner) on the target-embodiment synthesized video, so the mitigation fights the Approach's constraint.

**Verdict:** patch

**Required patches**
- Revised MVE / Revised Approach: Demote LIBERO-Goal to a *goal-language generalization* probe; make the pre-registered two-grasp extension the primary action-multi-modal benchmark, and rewrite the "≥+15 SR on LIBERO-Goal multi-modal subset" expected-signal line as "≥+15 SR on two-grasp extension vs. WM-DAgger, derived from WM-DAgger's cone sampler covering ~1 of 2 grasp modes (upper bound 50% SR on bimodal tasks)."
- Revised Approach step 3: Replace "independent of VAG's action head" with "attenuated from VAG's action head (shared-video-feature bias remains; quantified via Risks check on IDM temperature and shuffled-pair null)"; add shuffled-pair randomization (VLA score on mismatched (video_i, action_j) pairs) to the MVE as a C3 falsification check.
- Revised Risks (IDM noise item): Replace "cross-embodiment IDM (train IDM on a held-out embodiment's real data)" with "train IDM on the target embodiment's real teleop data disjoint from expert trajectories used for the asymmetric-recovery prior, and report action_IDM error against ground-truth actions on real held-out trajectories" — preserves the independence probe without contradicting the Approach's requirement that IDM generalize to the test embodiment.

---

## Related Work — Audit 2026-04-19
audit_round: novelty-recheck
priors_added: VLAC (2509.15937), VLA-in-the-Loop (ICLR 2026), CF-VLA (2512.24426), CR-DAgger (2506.16685)

The Round-0 audit (round0_audit.md) already flagged this idea as conditional pass with VLAC and VLA-in-the-Loop as adjacency risks. The 2026-04-19 audit ran a fresh live novelty-checker (which the original Round-0 review could not, because the agent didn't exist yet) and confirms the original concern plus surfaces a December-2025 paper — Counterfactual VLA (CF-VLA) — that is even closer in pipeline shape than the originally-flagged priors.

**Prior 1 — VLAC (arxiv 2509.15937).** A unified VLA + process-reward-model that *alternately generates reward and action tokens* for online RL on real robots. Critic and policy share weights. Scores state-pair transitions; not N-way recovery ranking; not offline data augmentation.

**Prior 2 — VLA-in-the-Loop (OpenReview, ICLR 2026).** A composite world model used as an *on-demand event-triggered corrector*: when the base VLA fails or drifts, the WM+IDM produces a corrected action that the robot executes online. Single corrector path, single composite WM, deployment-time only.

**Prior 3 — CF-VLA / Counterfactual VLA (arxiv 2512.24426, Dec 2025).** Autonomous-driving VLA that "mines high-value scenes from a base (non-counterfactual) VLA's rollouts and labels counterfactual reasoning traces for subsequent training rounds." This is a **rollout → filter → label → retrain** pipeline — architecturally the same shape as ours. Differences from the abstract: single VLA self-ranks (no separate critic mentioned); driving meta-actions, not manipulation primitives; no separate IDM step; counterfactual generation is at the meta-action / reasoning-trace level, not low-level recovery trajectories in a world model.

**Prior 4 — CR-DAgger (arxiv 2506.16685, NeurIPS 2025).** DAgger with residual corrections for contact-compliant manipulation; corrections come from humans, not VLA critics.

### Sharpened Delta

The "rollout-filter-label loop using a separate critic to label corrections" framing is no longer fully available — CF-VLA owns it for driving, VLAC owns the "VLA-as-critic" half, and VLA-in-the-Loop owns the "WM+IDM corrector" half.

What this idea uniquely combines, *and only* via composition:
1. **Two-VLA *intersection* ranking, not single-critic scoring.** VLAC is a single critic. CF-VLA self-ranks from one VLA. Our pipeline accepts a recovery only if both OpenVLA-OFT and π0.5 (heterogeneous architectures, heterogeneous training data) place it in the top-k. This is an empirically testable *bias-cancellation* claim: a recovery that one VLA's idiosyncratic prior favors but the other rejects is filtered out. The MVE's two-VLA-intersection-vs-single-critic ablation is the load-bearing test.
2. **IDM-inferred actions specifically to break the VAG → VLA shortcut.** VLA-in-the-Loop uses IDM-decoded actions, but feeds them straight to the robot. VLAC and CF-VLA never separate the action-generator from the action-scorer at all. We force the *scoring action stream* (consumed by the VLA critic) to come from a frozen IDM run on the synthesized video alone, *not* from the joint generator's action head — so the critic cannot trivially agree with whatever the generator emitted. The shuffled-pair randomization check (validator-required, in the MVE) directly tests whether this independence is real.
3. **N=8 widened asymmetric recovery proposals per pivot, on tabletop manipulation.** WM-DAgger's symmetric 120° cone covers a single-mode recovery family. CF-VLA's meta-action counterfactuals cover semantic alternatives in driving. Neither covers asymmetric / multi-modal velocity-drift recoveries in manipulation. The endpoint-conditioned flow-matching prior + uniform S^2 sampling is what enables that.
4. **Manipulation-action geometry is structurally different from driving.** CF-VLA's domain is roughly 2D continuous control with strong kinematic priors. Manipulation is 6D + gripper, with contact-discontinuous reward landscapes. The recovery-trajectory representation (asymmetric flow-matching prior in 6D + gripper) is not portable from CF-VLA without rebuild.

Why the difference matters: if the two-VLA intersection (vs. single critic) carries no SR gain in the (e)-vs-(d) ablation, the most defensible claim collapses to "WM-DAgger + a wider proposal set + IDM action recovery" — which is structurally close to VLA-in-the-Loop ported offline. The intersection is the linchpin.

### Honest novelty verdict (post-audit)

The narrowest of the four. Pursue, but with these amendments:
- **Promote ablation (e) vs. (d) — two-VLA intersection vs. single critic — to a primary headline result, not a side ablation.** Without this delta, CF-VLA + a manipulation port (which someone will write within 6 months) likely subsumes the contribution.
- **Add a CF-VLA-style baseline (g): single-VLA self-ranking with the same N=8 proposal set and the same IDM action-recovery step.** This isolates the multi-critic intersection from the wider-proposal / IDM-decoupling improvements, head-to-head against the closest 2025 pipeline.
- **Domain-honesty:** in Related Work, explicitly note that CF-VLA's autonomous-driving result *does not* port — same loop pattern, different action geometry — and frame our manipulation contribution as the first instantiation of the rollout-filter-label loop *with multi-critic intersection in 6D+gripper*.
- **Demote venue from ICRA primary to ICRA-or-workshop conditional on the (e)-vs-(d)-vs-(g) ablation landing.** If two-VLA intersection adds < 3 SR over single-VLA self-ranking, this is a workshop paper.
