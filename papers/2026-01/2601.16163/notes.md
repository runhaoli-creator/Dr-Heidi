# Cosmos Policy: Fine-Tuning Video Models for Visuomotor Control and Planning
arxiv: 2601.16163 | cs.AI | published 2026-01-22
authors: Moo Jin Kim, Yihuai Gao, Tsung-Yi Lin, Yen-Chen Lin, Yunhao Ge, et al.

## Problem
Prior video-model policies need multi-stage training with bolted-on action modules, or skip pretraining and lose priors. Can a pretrained video diffusion model become a strong policy in one stage with zero architectural changes, while still supporting model-based planning?

## Method
Fine-tunes Cosmos-Predict2-2B (latent video diffusion) on robot demos with no architectural change. "Latent Frame Injection" encodes proprio, action chunk, future cameras, and V(s') as extra latent frames interleaved with multi-view latents; each HxWxC slab holds the scalar normalized to [-1,1] and duplicated. A 3-camera layout uses 11 latents encoding (s,a,s',V(s')). Joint training: 50% (demos) trains p(a,s',V(s')|s); the other 50% (rollouts) splits into world model p(s',V(s')|s,a) and value p(V(s')|s,a,s') via input masking. A second fine-tune on 648 rollouts reweights to 90% world/value vs 10% policy, yielding a separate "planning model." Inference: parallel decoding for policy, autoregressive for planning. Best-of-N: N actions x 3 futures x 5 values = 15/action, "majority mean," argmax, execute full chunk.

## Key Results
- LIBERO avg SR 98.5% vs CogVLA 97.4, OpenVLA-OFT 97.1, pi0.5 96.9.
- RoboCasa 24-task SR 67.1% with 50 demos/task, beating FLARE 66.4 and Video Policy 66.0 @ 300.
- ALOHA bimanual avg 93.6%, top on 3/4 tasks; beats pi0.5 and OpenVLA-OFT+ on multimodal / mm-precision.
- Ablations: drop aux targets -> -1.5% SR; from scratch -> -3.9% SR, -18.7 pts on ALOHA fold-shirt.
- V(s') planning +12.5 pts on two hardest ALOHA tasks; beats model-free Q(s,a) under low rollouts.

## Limitations
**Author-stated:**
- Planning inference ~5 s/chunk; blocks dynamic tasks.
- Planning needs substantial rollout data; low-rollout regime unsolved.
- Only 1-layer best-of-N; deeper trees untried.

**Observed:**
- Inherits 2B-param full-latent-diffusion compute per action; orders of magnitude heavier than tokenized latent-action WAMs.
- No input history; s is current-obs only, limiting POMDPs.
- Modality-frame count grows linearly with cameras; hand-designed per robot.
- 50-step (2 s) open-loop chunk trades reactivity for throughput; dual checkpoint doubles memory.

## Open Questions & Gaps
- Pixel rollout costs ~5 s/chunk; can V(s') be learned over a compressed latent world-action tokenizer (K queries, Being-H0.7-style) instead of full HxW frames?
- World model fit on only 648 rollouts; how does V accuracy scale, and can synthetic rollouts from the video prior substitute?
- Depth=1 best-of-N vs deeper search unstudied; at fixed compute, when does depth beat width?
- Q(s,a) underperforms only under low-data + high-dim conditioning; does a tokenized Q close the gap, at what scale?
- LFI wastes HxW on duplicated scalars; would a 1D modality-token channel keep priors while shrinking FLOPs?
- No history: injecting k past latents on POMDPs untested.
- 50/50 and 90/10 mixes are heuristics; adaptive curricula unexplored.

## Connections
- Related KB papers: 2507.15493 (Being-H0.7); UWM, UVA, Video Policy, FLARE, pi0.5, OpenVLA-OFT, GR00T-N1.5 as named baselines.
- Seeds: pixel-WAM inefficiency, latent-query alternatives, cheap test-time planning, world-model data scaling.
