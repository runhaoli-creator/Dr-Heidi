# WARPED: Wrist-Aligned Rendering for Robot Policy Learning from Egocentric Human Demonstrations
arxiv: 2604.10809 | cs.RO | published 2026-04-12
authors: Freeman, Kim, Kantor (CMU RI)

## Problem
Human-video imitation is fast but existing pipelines need multi-view rigs, depth, or custom hardware and roll out from head/third-person cams. Wrist-cams give finer views but are absent in human demos. WARPED turns a single head-mounted RGB feed into photoreal wrist-camera obs + EE trajectories for diffusion-policy training.

## Method
Five stages, off-the-shelf models:
1. **Scene init** — object-free scan; SfM (LightGlue) → 3D Gaussian Splat; demos localized via HLoc.
2. **Interactive recon** — SpatialTrackerV2 depth aligned to SfM; HAMER hand pose w/ temporal+depth smoothing; Grounding-DINO + SAM2 masks; SAM3D mesh → object splat from multi-view renders; MegaPose 6D init.
3. **Hand-object opt** — per-frame pose via differentiable rasterizer (occlusion-aware mask/depth/DINOv2 losses), then joint MANO hand+object refinement (mask/depth/contact/TSDF/stable-grasp). Contact window from mask overlap + motion thresholds.
4. **Retarget + render** — pre-contact EE from thumb+index joints; at ts snap pose+width to 50 nearest contact points; during contact EE rigidly follows object. Fisheye wrist views via Nerfstudio 3DGUT over fused scene+object+gripper splats.
5. **Policy** — diffusion policy, 30 demos/task, 10x aug (retexture/translate/scale/intrinsics/extrinsics) + Gaussian noise; xArm7.

## Key Results (5 tabletop tasks, 20 trials)
- Matches/beats teleop: Rotate 20/20 vs 16, Pour 18/19, Bottle 17/16, Can 17/19; Wipe Brush lags 11/15.
- **5-8x faster** collection; WARPED > teleop on novel objects on 4/5 tasks.
- OOD scenes 16/20; co-training 15+15 ≥ 30-teleop on 4/5; no-aug: 3/5 → 0/20.
- Beats UMI 10/10 vs 2/10 on Rotate Box; HO-opt beats FoundationPose 17/20 vs 2/20 on Can-on-Plate.

## Limitations (Author-stated)
- Rigid objects only; quasi-static scene; full occlusion breaks tracking; small/flat objects (Wipe Brush) degrade pose estimation.

## Limitations (Observed)
- Seven-model cascade (HAMER/SAM2/SAM3D/MegaPose/SpatialTrackerV2/DINOv2/3DGUT); no uncertainty or per-stage ablation.
- Effectively *splat-rendered aug on a noisy human prior* — without 10x aug it fails; "transfer" vs "aug" is indistinguishable.
- Retargeting hardcoded to parallel-jaw via thumb+index; no dexterous/suction/bimanual.
- Contact thresholding fragile under hover/clutter; one-policy-per-task, no language.
- 1-min scan amortized in 5-8x claim; single-grasp tasks only.

## Open Questions & Gaps
- Reuse hand-object optimization as supervision for VLA/WAM pretraining, not just pixels?
- Is splat rendering needed once aug noise dominates, vs 2D inpaint?
- Which aug axis (retexture / intrinsics / translation) drives the gain?
- Can a pretrained latent WAM replace scan + HO-opt and unlock dynamic scenes?

## Connections
- **Being-H0.7 (KB):** both mine ego video; Being-H0.7 learns a latent WAM, WARPED renders explicit robot obs. WARPED's 6D hand+object state is supervision a latent WAM lacks; a latent WAM could replace scan + HO-opt and unlock dynamic scenes.
- **UMI [17]:** same no-teleop goal via hand-held rig; WARPED decouples hardware from embodiment.
- **RwoR, Phantom, Masquerade** 2D inpaint; WARPED synthesizes a new viewpoint via 3D rendering. **WristWorld [76], Imagination-at-Inference [21]** are generative counterparts; WARPED is the geometric, finetuning-free alternative.
- **Ideation hook:** drop-in synthetic wrist-view augmenter; prior-art-check "ego-to-wrist" ideas against this pipeline.
