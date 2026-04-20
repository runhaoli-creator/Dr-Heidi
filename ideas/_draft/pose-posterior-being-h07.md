---
id: idea-20260419-01
slug: pose-posterior-being-h07
created: 2026-04-19
status: draft
target_venue: NeurIPS
citations:
  - arxiv: being-h07
    role: gap-source
    note: anchor paper; frozen-ViT Perceiver posterior is the exact target we replace
  - arxiv: 2604.10809
    role: enabling-technique
    note: WARPED's HAMER+MegaPose cascade recovers per-frame 6D hand + object pose from single-view ego video at scale — our posterior target
  - arxiv: 2602.10098
    role: method-inspiration
    note: VLA-JEPA pinpoints pixel-biased posteriors as the failure mode (nuisance appearance, leakage); motivates non-pixel target
  - arxiv: 2604.11689
    role: baseline
    note: LARY shows frozen general vision encoders beat purpose-built LAMs — a strong counter-hypothesis we must falsify by outperforming DINOv3/V-JEPA2 posteriors
  - arxiv: 2603.29844
    role: method-inspiration
    note: DIAL's "shared native ViT bottleneck beats loose concat" result; we test the inverse claim — does the bottleneck also beat pixel features if the target is low-dim and causal?
---

## Title
Pose-Trace Posteriors for Latent World-Action Models: Can 6D Hand+Object Futures Replace a Pixel ViT Teacher?

## Problem
Being-H0.7's posterior branch (Eq. 2) encodes future observations with a frozen ViT + Perceiver resampler — a heavy, pixel-biased teacher. Pixel targets mix nuisance appearance (lighting, background motion) with the few action-relevant degrees of freedom that actually matter for control (arXiv 2602.10098 shows this explicitly degrades latent-action quality). It is unclear whether the dual-branch alignment mechanism needs a *rich visual* teacher or whether a *structured, low-dimensional, causal* teacher — pose traces of hand and contact objects — would shape the K=16 latent queries as well or better while cutting posterior compute by >100x.

## Core Idea
Replace Being-H0.7's pixel-ViT posterior with a **pose-trace posterior**: encode the future as the concatenation of per-frame 6D hand pose, per-object 6D pose, and a discrete contact indicator — a <100-dim structured target recovered cheaply with an off-the-shelf cascade (HAMER + Grounding-DINO + MegaPose). The dual-branch L2 alignment then forces the prior-branch Q to encode *what the hand and objects will do*, not *how pixels will look*. This removes the single largest source of nuisance variance from the training signal and makes the teacher exactly as action-centric as the student needs to be.

## Approach
Inputs are unchanged (ego context x, observations o_{-H:0}, state s, noised action chunk a_{0:T}). The prior branch is unchanged. We modify only the posterior encoder E(õ_{0:T}):
1. **Offline pose extraction.** For every training trajectory (ego video + robot demos) run the WARPED-style cascade (HAMER for 3D hand joints, Grounding-DINO+SAM2+MegaPose for object 6D) once, cache a per-frame tensor p_t ∈ R^{d_pose} (hand 51D + up to 3 objects × 7D + contact bits ≈ 80D). For robot demos, use proprio + forward-kinematics EE pose in place of HAMER, and known asset poses for objects — zero extra compute.
2. **Pose-trace Perceiver.** A 2-layer Perceiver resampler pools p_{0:T} into K=16 latent tokens z^{post}. Parameter count drops from ~100M (ViT+Perceiver) to ~2M.
3. **Optional 2-token language caption head.** An auxiliary head predicts a 2-token "action caption" (verb + object) from z^{post} using CLIP text targets extracted per clip. This is an ablation axis, not a main claim.
4. **Alignment loss unchanged** (L2 on hidden states, w_align=1e-3, norm+rank regularizers from Being-H0.7). Action head unchanged (flow matching, T=20). We keep *all* Being-H0.7 hyperparameters so the comparison is clean.
5. **Leakage audit.** Because pose traces are strictly causal downstream of actions, a leakage probe (predict pose-trace entropy from current frame only) runs alongside training to confirm the posterior is not trivially inferable from present obs.

## Why Now
- **arxiv:2604.10809** (WARPED, Apr 2026) just demonstrated that a single ego-video frame stream suffices for high-quality per-frame hand+object 6D with off-the-shelf models, at 5–8x collection speed over teleop. The posterior-extraction cost that would have been prohibitive in 2024 is now a one-time offline pass.
- **arxiv:2602.10098** (VLA-JEPA) empirically traced VLA failures to pixel-biased latent targets; the field is primed for an action-centric alternative.
- **arxiv:2603.29844** (DIAL) and **arxiv:being-h07** both show that a *structural* bottleneck on the VLA's hidden states, not merely an auxiliary loss, is what yields representations robust to OOD. Pose-trace posteriors make the bottleneck explicitly causal.

## Expected Contribution
- A drop-in posterior replacement that *matches or exceeds* Being-H0.7's 99.2% LIBERO and 82.1% LIBERO-plus while reducing posterior-branch training FLOPs by ≥50x and memory by ≥20x.
- First controlled ablation isolating "pose future" vs "pixel future" vs "language-captioned future" vs "DINOv3 latent future" as posterior supervision under an otherwise identical Being-H0.7 recipe — a reference table the field currently lacks.
- Quantitative leakage audit showing pose targets are strictly harder to shortcut than pixel targets (measured by student-only future-decoding error vs current-frame baseline).

## Minimum Viable Experiment (MVE)
- **Data**: LIBERO-90 + LIBERO-plus (both are in Being-H0.7's own table, H=4, T=20). Skip the 200k-hour ego-video pretrain; use Being-H0.7's open-sourced checkpoint as initialization and fine-tune both branches on LIBERO only. For egocentric cotraining, use a 5k-clip subset of EgoDex (already has 3D hand pose GT).
- **Baseline**: Being-H0.7 with its original frozen-ViT+Perceiver posterior, retrained on the same subset with identical compute.
- **Metric**: LIBERO-90 success rate, LIBERO-plus zero-shot SR, posterior-branch FLOPs, wall-clock train time, leakage-probe AUC.
- **Compute**: Single A100 40GB, ~5 days: ~2 days pose-extract EgoDex subset, ~3 days finetune + eval. Fits the budget.
- **Expected signal**: Pose-posterior matches pixel-posterior SR (within 1% SR) while using <5% of posterior compute. A gap <1% SR with >10x speedup is already paper-worthy; matching *or beating* on LIBERO-plus (where nuisance appearance hurts pixel targets most) is the strong outcome.

## Risks & Failure Modes
- **Too sparse a target.** If 80D pose traces lack the texture cues needed for fine-grained grasp selection (e.g., lid orientation in RoboCasa), SR will drop 2–5 points. Mitigation: keep the optional 2-token language caption head as a low-cost supplementary target.
- **Pose-extraction noise dominates.** HAMER + MegaPose fail on transparent / thin / occluded objects (WARPED itself flags Wipe Brush). A noisy posterior may regularize the prior worse than a clean pixel one. Mitigation: include per-frame pose confidence as an attention mask in the Perceiver pool; fall back to a DINOv3-feature-future on low-confidence frames (hybrid teacher).
- **Leakage the other direction.** The posterior might collapse to just "repeat current proprio" if the cascade's pose is noisy but proprio is clean on robot data. The leakage audit catches this, but it might force us to drop proprio from p_t, weakening the signal on robot data.

## Not To Be Confused With
Being-H0 / Being-H0.5 also train on ego hand motion, but as *input* to the prior branch (hand-motion context), not as a structured posterior *target* shaping a separate set of learnable queries via dual-branch alignment. DIAL (arxiv:2603.29844) uses a future ViT feature target; we claim the pixel/ViT layer is the wrong abstraction and that a causal pose vector is a strictly better one. VLA-JEPA (arxiv:2602.10098) also attacks the pixel-bias issue but keeps its V-JEPA2 target (pixel-derived, just in latent space); pose traces are a non-pixel derivation.
