---
id: idea-20260418-06
slug: contact-reward-scorer-for-wm-mcts
created: 2026-04-18
status: accepted
target_venue: CoRL
citations:
  - arxiv: 2604.11302
    role: gap-source
    note: 3D-ALP's monotone kinematic-distance reward (Eq. 4) only fits reach tasks; authors explicitly name extension to contact-rich manipulation (grasp, insertion, pouring) where reward is non-monotone in d_3D as an open problem that would "require a different scorer interface."
  - arxiv: 2604.11302
    role: baseline
    note: 3D-ALP's D=2 MCTS reaches Memory SR 0.650 on the E3 sequential-reach benchmark using the geometric-oracle scorer; this is the upper bound to match on reach and the ceiling to break when reach is replaced by contact tasks.
  - arxiv: 2604.11135
    role: method-inspiration
    note: AIM's ASVM produces per-pixel contact-affordance heatmaps trained with a flow-matching objective and achieves large gains (+5.3/+11.3 SR vs Motus/π0.5) by exposing "where to interact" to the action head — giving us a pretrained source of non-monotone, contact-aware spatial scores.
  - arxiv: 2604.07426
    role: enabling-technique
    note: GIRL's Distilled Semantic Prior shows that a slow foundation-model signal (DINOv2-derived) can be compressed into a fast student head with ~5% compute overhead; we reuse this recipe to get ASVM responses into MCTS's ~2.4s/frame budget without destroying the compute floor.
would_benefit_from:
  - "VLA-Reasoner (arxiv 2509.22643, 2025) — MCTS over a world model with KDE-prior sampling and an offline *scalar* value estimator for intermediate states. Closest external prior on MCTS-over-WM with learned scoring, but uses a scalar critic, not a per-pixel contact-affordance heatmap, and has no heavy-teacher distillation step."
  - "UAD: Unsupervised Affordance Distillation (arxiv 2506.09284, ICCV 2025) — distills foundation-model affordances into a lightweight FiLM-on-DINOv2 task-conditioned head; same heatmap-distillation spirit but feeds a *policy's observation space*, not an MCTS scorer. Should be cited as the closest distillation prior."
  - "STORM (arxiv 2511.03077, 2025) — search-guided generative world model with reward-model output. Adjacent on search-over-WM axis; flagged as closest by the original Round-1 reviewer."
---

## Title
Learned Contact-Affordance Scorers for 3D-Anchored World-Model MCTS on Contact-Rich Manipulation

## Problem
3D-ALP (2604.11302) wins memory-task SR by 0.645 on the E3 reach benchmark, but its reward scorer — `max(0, 1 - d_3D)` with d_3D the Euclidean distance from end-effector to target — is monotone in a single target point. The 3D-ALP authors explicitly list the non-monotone regime (grasp, insertion, pouring) as an open question that "would require a different scorer interface." Beyond reach, this scorer mis-ranks every MCTS node: a gripper hovering 2 cm *above* a mug handle gets a better score than one 0.5 cm to the *side* despite the second being a correct pre-grasp pose; the Q-backup on the first path pollutes the tree. 3D-ALP's only alternative, an off-the-shelf VLM (Florence-2), returns flat ~0 scores on generated frames and was abandoned. There is no middle ground between a geometric oracle that cannot score contact tasks and a semantic VLM that collapses on synthetic rollouts.

## Core Idea
Use **AIM's pretrained Action-based Spatial Value Map** (2604.11135) as a drop-in non-monotone scorer for 3D-ALP's MCTS rollouts: ASVM already produces per-pixel interaction-region heatmaps for grasp-contact and stable-placement tasks, and a score at a candidate end-effector target is simply `M_t(Π(p_t))` evaluated on the world-model-rendered frame of that candidate — the same quantity AIM uses for its Stage II dense reward, but here consumed by MCTS node scoring instead of by a GRPO policy gradient. The non-obvious move: AIM's ASVM is *trained to be non-monotone in d_3D* (it peaks exactly at contact regions and not at approach vectors), which is precisely the structure 3D-ALP's Eq. 4 scorer lacks.

## Approach
Starting from 3D-ALP's released E3 pipeline (InSpatio-WorldFM + kinematic bridge + UCT-MCTS with D=2/B=4, 2604.11302) and AIM's released ASVM head (2604.11135):

1. **Frame generation unchanged.** MCTS expansion proposes a candidate c2w and renders the imagined frame through InSpatio-WorldFM, exactly as 3D-ALP Phase 1 does.
2. **ASVM response as score.** Instead of `S_geom(c2w) = max(0, 1 - d_3D)`, compute `S_ASVM(c2w) = M_t(Π(p_t))` where M_t is the ASVM response on the rendered frame and Π(p_t) is the end-effector projection. For tasks with sub-task sequences (grasp-then-place), condition ASVM on the current sub-task instruction, which AIM already supports via its T5 cross-attention on the video stream.
3. **Distilled fast variant for MCTS inner loop.** ASVM evaluation on a single rendered frame requires a forward pass through a 5B-parameter Wan2.2-TI2V backbone — too expensive at B=4, D=2, ≥5 nodes/cycle. Distill the ASVM response head into a small 300M-param student using GIRL's DSP recipe (2604.07426): freeze the ASVM teacher, generate 50K (rendered-frame, ASVM-heatmap) pairs via InSpatio-WorldFM rollouts on AIM's RoboTwin training tasks, train the student with MSE. GIRL reports 5.1% compute overhead for its distilled semantic prior; we budget 10% given richer output (heatmap vs. scalar).
4. **Scorer fusion, ablated.** Evaluate three fusions: `S_ASVM` alone; `S_fused = S_ASVM · max(ε, 1 - d_3D)` (keeping a weak monotone prior for pure-reach sub-tasks); `S_VLM_gated` (AIM for contact sub-tasks, geometric for reach, gated by AIM sub-task type classification).
5. **MCTS pipeline intact.** Max-Q child selection, recursive depth reset, Max-MCTS backup, c=0.02 — all four of 3D-ALP's UCT fixes are preserved. Only the scorer is swapped.

## Why Now
- **2604.11302 (3D-ALP)** shipped a fully-specified MCTS-over-world-model pipeline whose one named failure mode is exactly "non-monotone rewards" — so the integration surface is already documented.
- **2604.11135 (AIM)** released a pretrained ASVM head that *is* a non-monotone contact-affordance field, trained on 30K RoboTwin trajectories, and already fluent in the manipulation-task language the MCTS scorer needs to speak. Its own Stage II dense reward `r_t = M_t(Π(p_t))` is numerically identical to the scorer call we need — it's never been plugged into MCTS.
- **2604.07426 (GIRL)** gives us the distillation recipe that makes plugging a 5B-param scorer into a 2.4 s/frame MCTS inner loop tractable, with published compute numbers for the slow→fast compression.

## Expected Contribution
- The first MCTS-over-WM system that scales beyond reach tasks by substituting a learned contact-affordance field for a hand-written kinematic-distance reward.
- **On 3D-ALP's E3 reach benchmark (2604.11302):** target Memory SR within 0.03 of 0.650 (the geometric-oracle upper bound). The expected-signal justification: ASVM on RoboTwin reach tasks responds at the grasp-contact vertex by construction (AIM's label pipeline), so the ASVM response at the target point should approximate `1 - d_3D` up to smoothing, yielding near-equivalent scoring on reach.
- **On a new contact-rich E3-Contact benchmark** (10 multi-stage RoboTwin tasks: Place Mouse Pad, Turn Switch, Hang Mug, etc., each with an occluded-memory variant): target Memory SR >= 0.50 where 3D-ALP's geometric scorer is expected to reach <= 0.10 (because `d_3D` to mug center is monotone, but the correct end-effector pose is 5 cm offset to hook the handle — geometric oracle will systematically miss). This +0.40 expected delta is justified by AIM's own gain over no-ASVM baselines on these same tasks (+11.3 SR on π0.5, +5.3 on Motus) translating into correct node ranking rather than policy-gradient supervision.
- Distilled ASVM student: 10% compute overhead vs. raw 3D-ALP; enables 20 nodes/cycle at 2 s budget vs. 3D-ALP's measured 5.

## Minimum Viable Experiment (MVE)
- **Benchmark fitness:** E3 (3D-ALP's own benchmark, 5-step sequential reach, 30 ep × 3 seeds) measures memory-under-reach — this is where the geometric oracle was legitimised and where our scorer must not regress. E3-Contact (new: 10 RoboTwin tasks × 5 steps with occlusion injection, matched seeds) measures memory-under-contact — this is where the geometric oracle is expected to fail by construction and where ASVM's non-monotone peak is the load-bearing hypothesis.
- **Setup:** 3D-ALP's released MuJoCo + InSpatio-WorldFM + kinematic bridge as-is. AIM's pretrained ASVM head loaded as scorer. D=2, B=4, 2 s budget held constant.
- **Baselines:** (B1) 3D-ALP with geometric scorer (paper baseline); (B2) 3D-ALP with Florence-2 VLM scorer (3D-ALP's own abandoned alternative, re-run for fair comparison — shows *why* a learned-but-non-robot scorer collapses); (B3) 3D-ALP + raw ASVM (ours, no distillation); (B4) 3D-ALP + distilled ASVM (ours, full); (B5) 3D-ALP + fused scorer `S_fused`.
- **Target-backbone fidelity:** All runs use 3D-ALP's actual InSpatio-WorldFM renderer and MCTS code — no proxy with a different WM backbone. ASVM is run on the exact frames 3D-ALP's renderer emits, so the integration is end-to-end honest.
- **Metrics:** Memory SR, non-memory SR, nodes expanded per cycle, wall-clock per step, scorer-vs-GT-contact IoU on a held-out labelled subset.
- **Expected signal (derivation-tied):** B4 matches B1 on E3 (within 0.03 Memory SR, justified by ASVM-on-reach equivalence above); B4 beats B1 by >=+0.35 Memory SR on E3-Contact (justified by AIM's SR gain on these tasks translating to MCTS ranking); B2 collapses to near-random on both (3D-ALP already reported Florence-2 returns flat ~0 scores; we re-confirm as a sanity check); B4 beats B3 by >=0.4 nodes/cycle at fixed wall-clock (distillation payoff).

## Risks & Failure Modes
- **ASVM trained on ground-truth RoboTwin renders, applied to InSpatio-WorldFM synthetic renders.** Domain shift between real-render and WM-render may collapse ASVM. Mitigation: fine-tune ASVM head on 5K InSpatio-WorldFM rollouts with ground-truth masks projected from the underlying MuJoCo state; cost is <1% of AIM's original training budget.
- **Distilled student underfits the peak structure.** DSP distillation in GIRL targeted a scalar prior; heatmap regression may need more capacity. Mitigation: budget up to 500M params in the student and monitor scorer-vs-ASVM-teacher Spearman rank correlation on held-out frames — distillation is accepted only if rank-corr ≥ 0.85, otherwise fall back to raw ASVM with a reduced B.
- **E3-Contact tasks require sub-task-conditioned scoring.** ASVM's sub-task input needs instruction-level segmentation (grasp, then place) that 3D-ALP doesn't produce natively. Mitigation: reuse AIM's own instruction pipeline (T5 on sub-task text) and have the MCTS expansion carry the sub-task id as tree state.

## Not To Be Confused With
This is **not** AIM inside a VLA executor — AIM's ASVM normally feeds an action head via intent-causal attention; here ASVM is consumed by an MCTS scorer that ranks c2w candidates, a completely different interface. It is also **not** Round 0's belief-gated System-2 dispatch: that idea keeps the scorer unchanged and learns *when* to invoke the planner; this idea keeps the dispatch unchanged and changes *what* the planner scores. And it is not a new WM: the InSpatio-WorldFM renderer is frozen.

---

## Review
reviewer: dr-agent-reviewer
date: 2026-04-18

**Scores**
- Novelty: 4/5 — Closest prior are STORM (search-guided WM, uses reward-model output) and VLA-Reasoner (dense-reward MCTS conditioned on VLA); neither plugs a pretrained non-monotone contact-affordance field (ASVM) into an MCTS-over-WM scorer, and the specific AIM+3D-ALP bridge — using AIM's Stage-II dense reward numerically identical to the MCTS scorer call — has not been published.
- Impact: 4/5 — Directly attacks 3D-ALP's explicitly-named open problem (extension to contact-rich tasks) with a benchmark (E3-Contact) that, if shipped, becomes the natural follow-up substrate for the WM-MCTS-planning sub-community; sub-community interest is high and likely CoRL-cite-worthy.
- Feasibility: 4/5 — All three upstream components (3D-ALP pipeline, AIM ASVM head, GIRL DSP distillation) are cited as released; MVE is concrete with named baselines, seeds, and compute budget; risk of WM-render domain shift for ASVM is identified with a specific sim-mask fine-tuning mitigation.
- Sum: 12/15

**Novelty-checker report:** adjacent — STORM (2511.03077) uses search-guided generative WM with reward models; VLA-Reasoner (2509.22643) uses dense-reward MCTS but conditioned on VLA predictions, not a pretrained contact-affordance heatmap; TSMCTS (2502.17235) uses a learned tidiness score as MCTS utility for rearrangement (wrong domain). The AIM-ASVM-as-3D-ALP-scorer bridge with the GIRL-distillation trick for the 2.4 s/frame budget is specific and unclaimed.

**Non-trash checklist**
- Not already done: ✓
- Falsifiable: ✓ (B4 must match B1 on E3 within 0.03 and beat B1 by ≥+0.35 on E3-Contact; failure of either direction kills the hypothesis)
- Non-trivial: ✓ (not "combine A+B": the non-monotone-in-d_3D structural argument is the load-bearing insight, and the distillation step solves an explicit compute infeasibility)
- Has MVE path: ✓
- Stakeholder exists: ✓ (3D-ALP authors and anyone building MCTS-over-WM planners for manipulation — "who cites this": the next paper extending 3D-ALP beyond reach)

**Venue fit:** fine — CoRL is the natural home; ICRA also plausible.

**Strengths**
- Problem framing ties directly to 3D-ALP's own stated open question (non-monotone rewards), and the numerical identity between AIM's Stage-II reward and the scorer call is a sharp, non-obvious observation.
- MVE is concretely operationalised: B1-B5 baseline ladder including re-running 3D-ALP's own abandoned Florence-2 scorer as a sanity ceiling on "why learned-but-non-robot scorers fail."
- Expected-signal magnitudes are derivation-tied (the +0.35 number is defended by AIM's own SR deltas, not invented).
- Distillation-acceptance rule (Spearman ≥ 0.85 on held-out frames, else fall back) is a concrete stop-condition rather than aspirational language.

**Concerns**
- **Approach §3 distillation budget.** GIRL's 5% overhead is a scalar prior; a per-pixel heatmap at InSpatio-WorldFM resolution is a much heavier output and the 10% budget claim has little derivation. Accept condition (rank-corr ≥ 0.85) partially mitigates but the 300M→500M escalation may still miss the 2 s budget if B is not reduced. Recommend logging actual wall-clock per node as a first-class metric rather than a consequence.
- **Approach §2 sub-task conditioning.** E3-Contact tasks need sub-task text (grasp then place); MCTS tree state must carry the sub-task id and transition, but the approach does not specify when the sub-task advances during a single MCTS cycle. A sub-task boundary detector is implicitly required and should be named.
- **Expected Contribution bullet 2.** The claim that 3D-ALP's geometric scorer reaches ≤ 0.10 on E3-Contact is a strong prediction but not from measured data; the paper will need either a pilot run or a weaker "expected <<0.50" framing.
- **Risks §1.** WM-render domain shift mitigation fine-tunes ASVM on InSpatio-WorldFM rollouts using ground-truth MuJoCo state — this is exactly the signal ASVM should eventually produce without, so the mitigation borrows from the target. This is fine for E3-Contact but should be flagged as a sim-only dependency that the real-robot follow-up cannot inherit.

**Verdict:** accept
**Rationale:** Passes all five non-trash checks, sum 12/15 with every axis ≥ 4, novelty-checker reports adjacent with a defensible specific delta, and the MVE is both falsifiable and honestly derivation-tied. The concerns are scoped to implementation specifics (distillation budget, sub-task boundaries, E3-Contact lower-bound claim) rather than structural flaws, and the stronger acceptance path is to ship the concerns as caveats in the paper rather than rewrite the idea. This is the kind of concrete, citation-grounded plug-in paper 3D-ALP's discussion section invites.

---

## Validator
validator: dr-agent-validator
date: 2026-04-18

**Checklist**
- C1 Claim-capability alignment: ✓ — AIM's ASVM as non-monotone per-pixel contact-affordance head and the `M_t(Π(p_t))` scorer call match notes (Stage-II dense reward); 3D-ALP's Florence-2 flat-score failure, 2.4s/frame render, D=2/B=4, Memory SR 0.650 all match notes. GIRL's 5.1% distilled overhead matches notes, though the idea extrapolates this (scalar prior → per-pixel heatmap) with a 10% budget — flagged below under C4.
- C2 Benchmark fitness: ✓ — E3 is 3D-ALP's own memory-under-reach benchmark (correct for reach regression test); E3-Contact is composed from the exact RoboTwin contact tasks (Place Mouse Pad, Turn Switch, Hang Mug) on which AIM trained and measured gains, so ASVM is evaluated in-distribution and the geometric-scorer failure mode (non-monotone d_3D) is the right structural test.
- C3 Circularity: ✓ — Risk §1 fine-tunes ASVM on InSpatio-WorldFM frames using ground-truth MuJoCo-projected masks (physics GT, not the baseline being replaced); distilled student is trained against the ASVM teacher, not the geometric scorer it replaces.
- C4 Expected-signal groundedness: ✓ — +0.35 E3-Contact Δ defended by AIM's measured +11.3/+5.3 SR deltas; within-0.03 E3 claim defended by the ASVM-peaks-at-contact-vertex argument. Two weak spots (noted by reviewer): the 10% distillation-overhead number is a scalar→heatmap extrapolation without hard derivation, and the ≤0.10 geometric-on-E3-Contact floor lacks a pilot.
- C5 Risks-vs-Approach contradiction: ✓ — Sub-task conditioning in Risk §3 aligns with Approach §2's T5-cross-attention plan; the WM-render fine-tuning fallback is additive to rather than in conflict with the pretrained-ASVM assumption.

**Verdict:** pass
