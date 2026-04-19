# VAG: Dual-Stream Video-Action Generation for Embodied Data Synthesis
arxiv: 2604.09330 | cs.RO | published 2026-04-10
authors: Xiaolei Lang, Yang Wang, Yukun Zhou, Chaojun Ni, Kerui Li, et al.

## Problem
Scaling robot foundation models is bottlenecked by the cost of collecting teleoperated demonstrations. Existing World Models (WMs) generate videos without paired actions; World-Action (WA) models couple them but often weakly align the two modalities; two-stage pipelines (video-then-IDM) accumulate errors. VAG targets jointly generating aligned video-action pairs for embodied data synthesis and direct policy use.

## Method
VAG is a dual-stream flow-matching generator that synchronously denoises a video branch and an action branch under the same noise schedule, conditioned on an initial frame and a T5-XXL-encoded textual instruction. The video branch is a Cosmos-Predict2 2B DiT post-trained to denoise a VAE latent z (C'×(T−1)/4+1×H/8×W/8) of a 93-frame (~10 s, 10 Hz, 480p) clip with classifier-free guidance. At every denoising step, the predicted clean video latent is compressed by adaptive 3D pooling (spatiotemporal average over each channel) and tiled to a C''=132-dim global embedding e; this *detached* embedding conditions a 1D U-Net (from Diffusion Policy) that denoises the action sequence A∈R^{T×D}. Both branches use MSE velocity loss (Eqs. 4–5). Training: 40k iters on 8 H20 GPUs, batch 1/GPU; 35 denoising steps at inference. Instructions at train time are auto-captioned via Qwen2.5-VL.

## Key Results
- AgiBot video gen (Tab. 1): FVD 965 / LPIPS 0.320 / PSNR 15.1, beating SVD (1311/0.421/12.7), Wan2.2 (1152/0.325/14.5), and Cosmos-Predict2 (988/0.352/14.2).
- AgiBot action gen (Tab. 2): Euclidean Distance 0.81, Success Rate 45% vs. VAG-Video+AnyPos 0.98/29% and VAG-Video+ResNet 1.54/8%.
- LIBERO action gen (Tab. 2): ED 0.38, SR 79% vs. AnyPos 0.55/66% and ResNet 0.87/37%.
- LIBERO replay SR avg (Tab. 3): 62% (Spatial 70/Object 72/Goal 64/Long 42) vs. AnyPos 54 / ResNet 25.
- Real-world VLA pretraining: π0.5 trained on 20 samples succeeds 7/20 (35%); π0.5 pretrained on VAG-synthesized data then fine-tuned succeeds 11/20 (55%), a +20% absolute gain. Generalization improves under unseen color/location changes.
- VAG action trajectories are directly executable on an Agilex Cobot Magic dual-arm robot for pick-and-place.

## Limitations
**Author-stated:**
- Information flow is unidirectional: video conditions action, but action does not feed back into video, "wasting beneficial control signals."
- Action branch is a 1D U-Net; authors plan to upgrade to DiT for higher capacity.
- Training data scale and task diversity are limited; authors plan broader scale-up.

**Observed:**
- Core comparisons are on small splits: AgiBot uses only 1794 train / 200 test trajectories from one robot (G1); self-collected VLA study uses 131 train + 20 eval with n=20 real-world trials, so the 35%→55% gain has wide confidence intervals.
- No ablation isolating the adaptive 3D pooling choice (vs. learnable projection, attention, or per-step token conditioning) or synchronized denoising schedule.
- Video baselines (SVD, Wan2.2, CP2) are generic; no comparison to recent WA baselines (WorldVLA, GR2, UVA, DreamGen end-to-end) on matched splits.
- Horizon is fixed at 93 frames (~10 s); no closed-loop rollout beyond horizon or error-growth analysis on long tasks (LIBERO-Long SR only 42%).
- Success criterion (per-dim error < 0.2) is a heuristic threshold; physical-execution SR in real world reported only at n=20.

## Open Questions & Gaps
- Does bidirectional (action→video) conditioning meaningfully improve alignment or is synchronized denoising already sufficient? Untested.
- How does VAG behave beyond the 10 s horizon — does autoregressive chaining compound error, and is LIBERO-Long's 42% a sign of degradation at longer horizons?
- Is the +20% real-world VLA gain robust across seeds, tasks, and larger n? The reported 20-trial evaluation is underpowered.
- How sensitive is action quality to the pooling geometry (adaptive 3D avg vs. token-level cross-attention or per-timestep pooling) and to C''=132?
- Does the frozen T5-XXL+auto-caption pipeline generalize to held-out language phrasing, or is VAG tied to Qwen2.5-VL's caption distribution?

## Connections
- Related KB papers: 2501.03575 (Cosmos), 2506.21539 (WorldVLA), 2512.13030 (Motus), 2602.06949 (DreamDojo), 2510.10125 (Ctrl-World)
- Seeds for direction: world-action models, flow matching for robotics, synthetic data for VLA pretraining, cross-modal alignment in joint generation
