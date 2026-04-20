# Fast-WAM: Do World Action Models Need Test-time Future Imagination?
arxiv: 2603.16666 | cs.CV | published 2026-03-17
authors: Tianyuan Yuan, Zibin Dong, Yicheng Liu, Hang Zhao

## Problem
World Action Models (WAMs) typically follow an "imagine-then-execute" recipe: iteratively denoise future video, then predict actions conditioned on the imagined future. This adds heavy test-time latency, and it is unclear whether explicit future imagination is actually necessary, or whether the gains come from the video prediction objective shaping representations during training.

## Method
Fast-WAM decouples training-time video modeling from inference-time future generation. It is a Mixture-of-Transformer (MoT) built on top of the Wan2.2-5B video DiT backbone (reusing its T5 text encoder and video VAE) with an added 1B action-expert DiT that shares attention with the video branch; total 6B params, action horizon H=32, 9 future video frames per chunk. Tokens split into three groups: clean first-frame latents (shared anchor), noisy future-video latents (only used in training), and action tokens. A structured attention mask lets action and video tokens both attend to the clean first-frame tokens, but forbids action tokens from attending to future video tokens (so no information leak and no test-time dependence on imagined futures). Training uses a joint flow-matching objective L = L_act + lambda*L_vid over action chunks and future video latents. At inference, the future-video branch is dropped entirely: only the clean first-frame latents pass once through the video DiT to produce latent world features for action denoising (10 steps, CFG=1.0). Two controlled variants instantiate imagine-then-execute designs under the same recipe — Fast-WAM-Joint (joint video+action denoising) and Fast-WAM-IDM (video first, then action, noise-augmentation p=0.5) — plus a "w.o. video co-train" ablation that keeps the architecture but drops L_vid.

## Key Results
- RoboTwin average: Fast-WAM 91.8% (no embodied pretrain) vs pretrained LingBot-VA 92.2%, pretrained Motus 87.8%, pi0.5 79.8%.
- RoboTwin controlled: Fast-WAM 91.8 ~ Fast-WAM-Joint 90.6 ~ Fast-WAM-IDM 91.3; w.o. video co-train drops to 83.8 (~8 pt gap).
- LIBERO average: Fast-WAM 97.6 (no embodied pretrain), Fast-WAM-Joint 98.5, Fast-WAM-IDM 98.0, w.o. video co-train 93.5.
- Real-world towel folding (Galaxea R1 Lite, 60h teleop): all video-co-trained Fast-WAM variants beat non-pretrained pi0.5; removing video co-training collapses success to 10%.
- Latency on RTX 5090D: Fast-WAM 190 ms vs Fast-WAM-IDM 810 ms (>4x faster); Fast-WAM-Joint 580 ms; w.o. video co-train 180 ms.

## Limitations
**Author-stated:**
- Only states "larger-scale pretraining data and model scaling" as open future work; no explicit limitations section.
**Observed:**
- Single real-world task (towel folding) on one platform; generalization claims rely on sim benchmarks.
- No study of how lambda or the amount of future horizon T affects the representation benefit.
- "World representations" are never probed or visualized — claim that video co-training shapes physically meaningful latents is inferred from downstream performance only.
- Uses single-chunk generation; the outer auto-regressive rollout common in prior WAMs is omitted, leaving long-horizon closed-loop behavior underexplored.
- No comparison against pure VLA backbones with matched video data but without the video flow-matching loss (e.g., contrastive or masked video objectives).

## Open Questions & Gaps
- If pixel-space future prediction at test time is unnecessary, can we replace L_vid with a cheaper latent-only objective (e.g., JEPA-style latent prediction, masked video modeling) and match Fast-WAM?
- What, mechanistically, does video co-training buy — physical priors, temporal smoothness, action-conditioned features? Probe via representation analysis across variants.
- Does the conclusion hold when scaling up to egocentric/human video (non-robot) co-training, where test-time imagination of robot futures is ill-defined anyway?
- Does dropping test-time imagination hurt OOD or long-horizon tasks that a Motus-style AR rollout would cover?
- How does lambda scheduling (early-heavy vs late-light video loss) interact with the observed gains?

## Connections
- Related KB papers: 2602.15922 (WAM zero-shot policies, ref [4]), 2512.13030 (Motus, ref [5]), 2504.02792 (UWM, ref [6]), 2507.12898 (Vidar, ref [7]), 2601.21998 (LingBot-VA / causal WM, ref [3]), 2504.16054 (pi0.5, ref [11]).
- Seeds for direction: latent-WAM, video-cotraining-as-regularizer, skip-the-pixel-future, representation-probing-WAM, Being-H0.7-context.
