---
id: idea-20260418-02
slug: self-supervised-affordance-maps-from-real-play
created: 2026-04-18
status: accepted
target_venue: CVPR
citations:
  - arxiv: 2604.11135
    role: gap-source
    note: AIM's ASVM annotation pipeline depends on simulator contact APIs; transfer to real video without contact geometry is explicitly listed as an open question, and non-prehensile / articulated affordances are not representable.
  - arxiv: 2604.11135
    role: method-inspiration
    note: AIM's intent-causal attention mask and multi-stream DiT (RGB / value / action) architecture is reused as the decoder.
  - arxiv: 2604.09330
    role: data-source
    note: VAG's dual-stream video+action synthesis gives aligned (video, action) pairs on both AgiBot and LIBERO — a large-scale unlabeled corpus for value-map self-supervision.
  - arxiv: 2604.11351
    role: enabling-technique
    note: WM-DAgger's DINOv2 consistency filter is adapted to score predicted vs. real future patches for the affordance bootstrapping loss.
  - arxiv: 2604.11674
    role: baseline
    note: AffordSim provides a 50-task affordance-aware benchmark (incl. pouring, mug-hanging, pushing/pulling) with sim-to-real transfer — a natural evaluation substrate where self-supervised ASVM labels can be compared against VoxAfford's explicit 3D affordance predictions as a GT proxy.
would_benefit_from:
  - "UAD: Unsupervised Affordance Distillation (arxiv 2506.09284, ICCV 2025) — distills affordance from multi-view DINOv2 feature clustering + VLM task proposals into a FiLM head over frozen DINOv2. Same DINOv2 substrate and same label-free goal, but supervision is feature-clustering + VLM-on-clusters, *not* counterfactual action-perturbation rollouts in a WM. Closest external prior on the label-free-affordance axis."
  - "DINO-WM: World Models on Pre-trained Visual Features (arxiv 2411.04983) — provides exactly the action-conditioned-WM-over-DINOv2-patches substrate this idea would build on; does not extract affordance from action perturbation, only goal-distance planning. Should be cited as the substrate."
  - "CWMDT: Counterfactual World Models via Digital Twin-conditioned Video Diffusion (arxiv 2511.17481) — generates counterfactual video rollouts via *scene/object* interventions through LLM-reasoned digital twins; does not perturb actions and does not output an affordance map. Adjacent on counterfactual-WM-rollouts axis only."
---

## Title
Action-Consistency Affordance Maps: Self-Supervised Spatial Value Maps for Real-World World-Action Models

## Problem
AIM (2604.11135) shows that an Action-based Spatial Value Map (ASVM) bridge between a WAM's future-RGB stream and its action head is the dominant source of its gains on RoboTwin (large drop from +11.3 to +5.3 SR vs π0.5 when the bridge is removed). But AIM's training labels are only available in simulation: grasp-contact vertices and stable-placement regions come from physics-API queries. Consequently, ASVMs cannot be trained on real manipulation video, and even in simulation the affordance taxonomy is limited to prehensile grasp + placement — the paper's own gaps.md admits that non-prehensile pushing, articulated joints, and tool use have **no definition** of an ASVM label. This blocks WAMs from inheriting one of their most effective recent interfaces when scaling to web-scale robot video.

## Core Idea
Define an ASVM *self-supervisedly* from an action-conditioned world model's **per-pixel counterfactual action-sensitivity**: pixels are high-affordance at time t iff perturbing the commanded action at t changes the world-model's predicted next frame **locally** at those pixels. The training signal is the pointwise disagreement, in a DINOv2 feature metric, between a WM rollout conditioned on a^t and the rollout conditioned on a^t + ε — computed over unlabeled (video, action) pairs with **no contact APIs, no per-task affordance ontology, and no distinction between prehensile and non-prehensile**.

## Approach
Given an aligned (video, action) corpus (we use VAG-style synthesis and post-processed AgiBot / LIBERO pairs from 2604.09330 as the source), for every training clip and every timestep t:

1. **Counterfactual rollout.** Take a pretrained action-conditioned WM W (we use the EAC-WM backbone from WM-DAgger, 2604.11351, fine-tuned on multi-view data). Roll out two futures: `F^+ = W(I_{≤t}, a^t, a^{t+1:t+h})` and `F^- = W(I_{≤t}, a^t + ε_t, a^{t+1:t+h})`, where ε_t is a small end-effector-direction perturbation sampled from the directional cone used by WM-DAgger.
2. **Per-pixel sensitivity field.** Embed both rollouts via a frozen DINOv2 patch tokenizer; compute the per-patch L2 distance `S_t(u,v) = ||Φ(F^+_t)[u,v] − Φ(F^-_t)[u,v]||`. This field is large only where the counterfactual action *would* change the scene — i.e., at the region the robot is about to interact with. Aggregate S over h timesteps and Gaussian-smooth with a depth-aware kernel width (reusing AIM's projection recipe).
3. **Affordance distillation target.** Use S_t, temporally softmaxed into a probability map, as a **pseudo-label** for AIM's ASVM stream. The AIM backbone (intent-causal mask, multi-stream DiT, 2604.11135) is kept unchanged; only the value-map supervision is replaced.
4. **Consistency filter.** Following WM-DAgger (2604.11351), drop clips where `DINOv2-cos(F^+_h, I^{real}_h) < τ` — the WM is hallucinating, so its counterfactual is untrustworthy. This gives a principled per-clip acceptance rule.
5. **Downstream policy.** Train the full AIM tri-stream head (RGB, value, action) with standard flow-matching losses, using our self-labeled value maps instead of simulator contact labels. No other architectural change.

Inference is identical to AIM; training does not require contact APIs, hand-defined affordance classes, or any labels beyond actions that were already paired with the video. The approach scales to any task family as long as there is *some* action variation around the interaction moment.

## Why Now
- 2604.11135 established that the ASVM interface is responsible for most of the WAM→action gain but bottlenecked its own generality on sim labels — our pipeline directly lifts that bottleneck.
- 2604.09330 provided a large corpus of temporally synchronized (video, action) pairs at 10 Hz / 93-frame clips across AgiBot + LIBERO, spanning exactly the embodiments and tasks AIM targets.
- 2604.11351 showed that DINOv2-cosine consistency is a strong, cheap hallucination filter for action-conditioned WMs, and that small directional perturbations produce informative counterfactual rollouts — both of which our pipeline reuses.

## Expected Contribution
- A **label-free** training recipe for spatial value maps that is agnostic to affordance taxonomy and works on real manipulation video.
- A benchmark on non-prehensile RoboTwin tasks (push, slide, tool-use) for which AIM has no ground-truth ASVM and thus cannot be trained — our method should recover AIM-level gains in this regime.
- An empirical law: the counterfactual-sensitivity field's IoU with ground-truth contact maps (on tasks where GT is available) should exceed 0.6, validating the self-supervision as a proxy.
- Transfer demonstration: training the ASVM head on EgoMimic / EpicKitchens-style real egocentric video (action recovered from hand trajectory via off-the-shelf pose estimation) and fine-tuning a downstream WAM.

## Minimum Viable Experiment (MVE)
- **Data:** 20K aligned (video, action) clips from VAG-synthesized AgiBot pairs + 10K LIBERO clips.
- **Baseline:** AIM trained on RoboTwin sim-contact labels.
- **Variants:** (a) AIM with our self-supervised labels on the same RoboTwin tasks; (b) AIM with our self-supervised labels on 4 non-prehensile / push-slide tasks where sim-contact ASVM is undefined.
- **Metrics:** (i) RoboTwin SR within 1.0 SR of sim-label AIM on prehensile tasks; (ii) positive SR on non-prehensile tasks where sim-label AIM cannot be trained; (iii) IoU between our self-supervised map and GT contact map on held-out labeled clips.
- **Expected signal:** (i) ≤ −1.0 SR gap, (ii) ≥ +10 SR over a video-only WAM with no ASVM stream, (iii) IoU ≥ 0.6.

## Risks & Failure Modes
- **Counterfactual perturbations are too small / too large.** If ε is below the WM's sensitivity threshold, S_t is uniform noise; if too large, the WM's forecast collapses. Mitigation: calibrate ε per embodiment using a held-out set where sim-label ASVM exists, and compare the resulting S_t.
- **WM hallucination drives the sensitivity signal.** If F^+ and F^- differ primarily because W is unstable, rather than because of the commanded action, S_t reflects model variance, not affordance. Mitigation: the DINOv2-cosine filter from 2604.11351 plus a paired "null-perturbation" control where ε=0 (sensitivity should vanish), used as a per-clip quality gate.
- **Non-prehensile tasks have diffuse sensitivity.** Sliding a box shifts many pixels, not just the contact patch; the peaked label AIM expects may disappear. Mitigation: learn a peak-finding head that regresses only the argmax region of S_t, keeping AIM's decoder interface unchanged.

## Not To Be Confused With
This is not saliency-over-actions (e.g., Grad-CAM on policy output); the signal is generated by **rolling out** a learned WM under counterfactual actions and comparing forecasts in a foundation-model embedding space — the learning signal is a property of world dynamics, not of policy attention. It also differs from AIM's ASVM only in the supervision source, not in the downstream architecture, so the benefit is cleanly attributable to the label pipeline.

---

## Review
reviewer: dr-agent-reviewer
date: 2026-04-18

**Scores**
- Novelty: 4/5 — counterfactual WM-rollout sensitivity as affordance supervision is a genuinely new formulation that sidesteps AIM's contact-API bottleneck rather than re-deriving prior saliency approaches.
- Impact: 4/5 — removing the sim-contact-label bottleneck unlocks AIM-style ASVMs for real/egocentric video and non-prehensile tasks, directly useful to the WAM sub-community and plausibly broader.
- Feasibility: 4/5 — all components (AIM backbone, WM-DAgger ε-cone, DINOv2 consistency filter, VAG (video,action) corpus) exist and compose; MVE is concrete with sane thresholds; compute is the main risk.
- Sum: 12/15

**Venue fit:** fine (CVPR); CoRL also strong given robot-manipulation MVE.

**Strengths**
- Problem is sharply scoped to a *specific* documented gap in AIM (contact-API-dependent labels, no non-prehensile definition), not a vague "scale-up."
- The null-perturbation control (ε=0) in Risks section is a principled quality gate that most self-supervised affordance papers miss.
- Cleanly attributable ablation: only the label source changes vs. AIM, so gains are not confounded by architecture tweaks.
- MVE metric (iii) — IoU ≥ 0.6 vs. GT contact map on held-out labeled clips — is a falsifiable proxy that most self-supervised affordance work lacks.

**Concerns**
- **Approach §1–2 — cost.** Two h-step WM rollouts per training clip per timestep, with a 5B-parameter video backbone, is expensive at 20K+10K clips × 93 frames. The idea needs a stated training budget and a strategy (sparse timestep sampling, small-scale DiT, cached history KV) or reviewers will flag infeasibility.
- **Approach §1 — ε design for non-prehensile tasks.** A "directional cone on end-effector" makes sense pre-contact, but during a push/slide the informative perturbation is arguably force/velocity-direction, not position. The current definition may under-excite the WM on exactly the regime the paper claims to unlock. Needs an ε-family defined per action-dimension.
- **Approach §3 — temporal softmax across h timesteps** can smear the label across the entire interaction trajectory (e.g., a slide). Risks §3 acknowledges this but the peak-finding head mitigation is hand-wavy; specify whether it's a learned argmax regressor or a hard top-k mask, and how it is supervised.
- **MVE baselines underspecified.** "Video-only WAM with no ASVM stream" is not named. The fair comparison is AIM-with-zero-value-map or Motus; pick one and commit. Also missing: a trivial saliency-on-action-head baseline (the very thing §"Not To Be Confused With" dismisses) — including it empirically is what makes that claim credible.
- **Citation 2604.11674 (AffordSim / VoxAfford)** is cited as baseline but not grounded in this repo's KB list in the prompt; verify the arxiv ID is real before submission. (Not blocking the verdict, but flag for the authors.)
- **Expected Contribution bullet 4 (EgoMimic/EpicKitchens transfer)** is a second paper's worth of work; either scope it out or make it a stretch goal in MVE.

**Verdict:** improve
**Rationale:** The core formulation is sound and genuinely unlocks AIM's stated open problem, and feasibility is real given existing components. But the MVE baseline set is incomplete (no saliency control, ambiguous video-only baseline), ε is under-specified for the non-prehensile regime the paper claims to unlock, and compute cost is unaddressed. All fixable in a revision, not a reject.

## Revised Version (reviewer amendments)

### What I changed and why
- Changed MVE: added an explicit saliency-on-action-head baseline and pinned the video-only comparator — addresses: "MVE baselines underspecified" and makes the "Not To Be Confused With" claim empirically backed.
- Changed Approach §1: split ε into a per-action-dimension family (EE-position cone, EE-velocity, gripper-open/close, base/joint delta) — addresses: "ε design for non-prehensile tasks."
- Changed Approach §3: replaced temporal softmax with a two-stage label (per-timestep peak extraction via hard top-k, then temporal max) and made the peak-finding head supervised by the held-out sim-contact subset — addresses: "label smears on slides."
- Added a compute budget and sparse-timestep sampling scheme to Approach — addresses: "cost."
- Kept Core Idea, AIM architectural reuse, and the DINOv2 consistency filter: these are the load-bearing novel pieces and directly implement the gap-closure.
- Scoped out EgoMimic/EpicKitchens transfer from MVE (kept as stretch) — addresses: "second paper's worth of work."

### Revised Core Idea
Pixels are high-affordance iff, under a pretrained action-conditioned world model, a small *per-action-dimension* counterfactual perturbation of the commanded action at time t produces a locally concentrated change in the predicted future frame's DINOv2 feature field — yielding a label-free, taxonomy-free ASVM trainable on any paired (video, action) corpus.

### Revised Approach
Given aligned (video, action) clips from VAG-synthesized AgiBot + LIBERO (2604.09330), sample K=8 "interaction-candidate" timesteps per 93-frame clip using an action-energy prior (`||Δa_t||` local max). At each sampled t, for each action dimension d ∈ {EE-xyz cone, EE-velocity, gripper bit, joint/base delta}, roll out the EAC-WM backbone (WM-DAgger, 2604.11351) twice — with a_t and a_t + ε_t^d — and compute the per-DINOv2-patch L2 distance `S_t^d(u,v)`. Aggregate across d via max (capturing whichever action dimension is informative at that scene — gripper for grasping, velocity for sliding). Form the pseudo-label by: (i) hard top-k spatial mask per timestep (k ∝ depth-projected EE footprint, reusing AIM's kernel recipe), (ii) temporal max over the K sampled timesteps, (iii) Gaussian smoothing. A small peak-finding head is pretrained on the ~2K-clip RoboTwin sim-label subset so the pseudo-label matches AIM's expected unimodal decoder input even on diffuse (slide/push) cases. Clips are filtered by WM-DAgger's DINOv2-cosine hallucination gate and a paired null-perturbation control (ε=0 must produce near-zero S_t). Downstream: AIM tri-stream head trained unchanged with standard flow-matching loss. Compute budget: 2 rollouts × 8 timesteps × 4 action dims × 30K clips ≈ 1.9M WM forward passes; amortized with shared history KV caching and a 1.3B-param DiT variant of the WM, this fits in ~5K A100-hours.

### Revised MVE
- **Data:** 20K VAG-synth AgiBot + 10K LIBERO aligned clips; held-out 2K RoboTwin clips with sim-contact GT.
- **Baselines:** (B1) AIM with sim-contact labels (upper bound); (B2) AIM with zero value-map stream (video-only comparator); (B3) **saliency-on-action-head**: Grad-CAM on AIM's action logits w.r.t. RGB input as the ASVM pseudo-label (this is the "Not To Be Confused With" control); (B4) Motus.
- **Variants:** (V1) AIM + our self-supervised labels on RoboTwin 50-task; (V2) AIM + our labels on a 4-task non-prehensile subset (push-box, slide-tray, press-button, open-drawer) where sim-contact labels are undefined.
- **Metrics:** (i) RoboTwin SR within 1.0 point of B1 on prehensile tasks; (ii) ≥ +10 SR over B2 and ≥ +5 SR over B3 on non-prehensile tasks; (iii) pseudo-label IoU vs. sim-contact GT ≥ 0.6 on held-out clips; (iv) null-perturbation control: S_t mean intensity drops ≥ 10× vs. ε>0 condition.
- **Expected signal:** V1 matches B1 (bridge is transferable); V2 dominates B2/B3 (counterfactual signal beats both no-affordance and attention-based affordance); metric (iv) confirms the label tracks action, not WM noise.

### Revised Risks
- **ε-family tuning is under-constrained outside EE-position.** Velocity-direction and gripper-bit perturbations may not map to action-space units the pretrained WM actually conditioned on; if so, S_t^d for those dims is silent. Mitigation: calibrate each dim on the RoboTwin sim-contact held-out set and drop silent dims before full-scale training.
- **Peak-finding head overfits to prehensile GT.** Pretraining it on AIM's sim-contact subset could bias it against diffuse non-prehensile labels — the exact regime the paper claims to unlock. Mitigation: include a small RoboTwin-style synthetic push/slide set with hand-authored contact-patch labels (~500 clips) in peak-head pretraining.
- **WM backbone choice couples to results.** EAC-WM is trained on specific embodiments; generalization of the counterfactual signal to real egocentric video is untested and is explicitly moved to stretch-goal.
