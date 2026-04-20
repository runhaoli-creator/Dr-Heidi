# JEPA-VLA: Video Predictive Embedding is Needed for VLA Models
arxiv: 2602.11832 | cs.CV | published 2026-02-12
authors: Shangchen Miao, Ningya Feng, Jialong Wu, Ye Lin, Xu He, et al.

## Problem
VLAs suffer low sample efficiency and up to ~40% drop under distribution shift. The bottleneck, the paper argues, is the *pretrained visual representation*: DINO-style image SSL and CLIP/SigLIP contrastive encoders miss the two forms of knowledge robotics needs — (i) environment understanding (precise task-relevant state while discarding nuisances) and (ii) policy priors (anticipatory knowledge of how the scene evolves under successful execution).

## Method
1. **Diagnostic probes.** Freeze DINOv2 / SigLIP / V-JEPA 2; train a ViT head on LIBERO-10 to (a) regress task-relevant state (arm+objects), (b) predict the 10-step residual, (c) regress lighting/background on LIBERO-plus. V-JEPA 2 wins (a)(b), loses (c) — desired (discards nuisances).
2. **JEPA-VLA fusion.** Freeze V-JEPA 2; extract features from the 2 most recent frames; inject via either *early fusion* (linear-project + concat with VLA tokens; for small-scale from-scratch VLAs) or *gated fusion* (Flamingo-style gated cross-attention every 8 decoder layers, VLA tokens as queries, V-JEPA 2 as keys/values; fusion-layer LR 1e-5–1e-4 vs 5e-4 for the base, to protect pretrained priors).
3. **Backbones.** Basic VLA = Chameleon + linear discretized-action head (WorldVLA-style, 256 tokens). Mainstream VLA = OpenVLA-OFT (parallel decoding, action chunking, L1 loss).

## Key Results
- Basic VLA, LIBERO (1/10 data): 61.65 → 69.05 (+7.4); Long +15.2.
- Basic VLA, LIBERO-plus: 18.9 → 25.6 (+6.7); beats reported WorldVLA (25.0) with 1/10 action data and no world-model training.
- OpenVLA-OFT, LIBERO: 90.3 → 96.4 (+6.1), above the paper's 95.35.
- RoboTwin2.0 (Aloha-AgileX): clean 54.8 → 73.5 (+18.7), domain-randomized 9.3 → 17.7 (+8.4).
- Real-world Piper pick-and-place: 50% → 80% full-data; 60% with 1/5 trajectories.
- Representation swap (LIBERO-Long): Baseline 25.8; +DINOv2 26.0/31.2; +SigLIP 33.6; +V-JEPA 2 41.0.
- CortexBench: V-JEPA 2 > VC-1 on MetaWorld (90.4 vs 88.8) and DMControl (583.8 vs 536.0).

## Limitations
**Author-stated:** Only a simple fusion is explored; "more principled mechanisms for integrating predictive embeddings remain largely unexplored." Vision-centric scope.
**Observed:** Third-person single-camera only (no wrist/multi-view ablation despite N-camera formulation). Basic VLA uses only 1/10 LIBERO data, inflating relative gains. V-JEPA 2 always frozen — no action-conditioned finetuning. Gated-fusion interval (every 8 layers) picked empirically without sweep. Real-world = one task, one arm, few trials. No in-VLA comparison vs R3M/VC-1 or diffusion-video policies (Vidar, FlowVLA). No latency/compute cost for the extra V-JEPA 2 pass.

## Open Questions & Gaps
- How to jointly finetune (or LoRA) V-JEPA 2 with action supervision without destroying its temporal priors?
- Do V-JEPA 2 features carry policy priors for wrist/egocentric cameras, under-represented in internet-video pretraining?
- Can predictive embeddings be made action-conditioned (latent world model), closing the gap to dual-branch WAM training (Being-H0-style hand-motion priors)?
- Does V-JEPA 2 encode contact/force/bimanual coordination priors RoboTwin2.0 hard-split still lacks (17.7% DR)?
- Should V-JEPA 2 tokens refresh per action chunk or per step under gated sparse fusion?
- Can V-JEPA 2's predictor head be an auxiliary future-latent-prediction loss (dual-branch: action + predictive) during VLA training, not just a frozen feature?
- How does JEPA-VLA compare to diffusion-video-policy baselines (Vidar, FlowVLA) on matched benchmarks?

## Connections
- Related KB papers: Being-H0.7 (cites JEPA-VLA as ref [71], contrasts with its hand-motion dual-branch WAM); WorldVLA / RynnVLA-002 (action-world-model VLAs baselined); OpenVLA-OFT (backbone); Vidar, FlowVLA (video-generation cousins); V-JEPA 2 / I-JEPA / V-JEPA lineage.
- Seeds for direction: visual-representation audit for VLAs; predictive-embedding + dual-branch hand-motion WAM hybrid; action-conditioned JEPA finetuning; wrist-camera JEPA pretraining.
