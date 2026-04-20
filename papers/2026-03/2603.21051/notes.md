# Cortical Policy: A Dual-Stream View Transformer for Robotic Manipulation

## Problem
View-transformer policies (RVT, RVT-2, 3D-MVP) fuse multi-view 2D features view-independently, causing (1) weak cross-view 3D reasoning (sensitivity to texture/lighting/camera-pose) and (2) no dynamic adaptation when targets/bases move mid-trajectory. How to inject 3D-grounded spatial priors *and* egocentric motion reasoning into one policy?

## Method
Cortex-inspired dual-stream transformer mirroring ventral (static) and dorsal (dynamic) pathways, built on RVT-2.
- Static stream: 3 virtual orthographic views. VGGT predicts depth/confidence/intrinsics; co-visible 3D points are back-projected, NMS-filtered, tracked across views as geometrically consistent keypoints. SmoothAP ranking loss on bilinearly-sampled keypoint features enforces cross-view similarity (positives: same 3D point; negatives: ≥ζ apart). Cyclic geometric consistency loss L_cgc chains v1→…→vN→v1 to suppress drift. 3×3 conv after RVT Encoder refines resolution.
- Dynamic stream: one wrist-mounted *virtual* camera rendered via RVT renderer with FOV adapted to human head-mounted egocentric data (resolves domain gap, positional invariance, cross-view alignment). GLC gaze model (Ego4D-pretrained) KL-fine-tuned on 3,600 rendered wrist videos (18 tasks × 100 ep × 2 stages) labelled with end-effector pixel (most-salient-pixel formulation). GLC frozen at policy training; last-block encoder tokens F_SA plus Global-Local Correlation tokens F_GLC channel-concat + linear-projected into RVT-2 token space. Decoder saliency maps = dynamic heatmaps (3D-conv compressed to 224×224).
- Fusion: 4 views (3 static + 1 dynamic) yield (F_j, H_j); translation = top-scoring back-projected 3D point from per-view heatmaps; rotation/gripper/collision = global vector [ϕ(F_j⊙H_j); ψ(F_j)] concat across views. Loss = L_action + λ·L_cgc, λ=1.

## Key Results
- RLBench 18-task: 81.0% vs RVT-2 77.5% (+3.5); top-1/2 in 14/18; strongest on multi-object spatial tasks (stack cups/blocks, insert peg).
- COLOSSEUM: 69.9% vs RVT-2 60.5% (+9.4); dynamic-view stream is the dominant driver under perturbations; wins 9/14 settings.
- Real-world: +30% over RVT/RVT-2 on spatial stack; 80% under target/base displacement vs 0% for static-only baselines.
- Ablations: L_cgc +2.6% (single) / +1.5% (dual); position-aware pretraining vs end-to-end +1.9%; removing heatmaps collapses dynamic stream below single-stream.

## Limitations
- Author-stated: weak zero-shot cross-task transfer (24% on unseen "close laptop lid"); future work = compositional primitives, multi-resolution encoders, hierarchical attention, token/view-level adaptive fusion, tracking targets beyond end-effector.
- Observed: single dynamic (wrist) view; GLC frozen, so no co-adaptation with manipulation loss; only RVT-2 4-cam 128×128 regime evaluated; pretraining data is fully sim-rendered (no real egocentric robot/human-gaze data); L_cgc *hurts* some COLOSSEUM settings (all-perturbation, light color) vs Variant E; keypoints fixed pre-training (no online update); λ and ζ untuned.

## Open Questions & Gaps
- Co-train / LoRA-adapt GLC with manipulation loss without erasing Ego4D prior?
- Language-condition dorsal attention target (object / affordance / sub-goal / other hand)?
- Stream VGGT keypoint supervision online to track distribution shift at rollout?
- Does dorsal/ventral split survive swapping RVT-2 for a VLA backbone (OpenVLA, π0, Being-H0)?

## Connections
- Being-H0.7 dual-branch: direct analogue — static = geometry allocentric tokens, dynamic = egocentric motion/attention tokens, fused at action head.
- VGGT-as-teacher line: parallels GeoAware-VLA, Evo-0, CL3R, BridgeVLA.
- Egocentric gaze transfer to robot wrist-cam links Ego4D/GLC with Ego-Exo4D embodied-video pretraining.
