# Being-H0.7: A Latent World-Action Model from Egocentric Videos
arxiv: being-h07 | cs.RO | published 2026-04-14
authors: BeingBeyond Team

## Problem
VLAs directly map observations to actions but collapse into spurious behaviors under sparse action supervision. Pixel-based WAMs (e.g., Cosmos-Policy) bolt on video generation to inject future awareness but pay a prohibitive inference cost (3,000 H100 hours to train on LIBERO; ~60× slower than VLAs). The paper asks: can instruction understanding, world modeling, and action generation be unified in a single efficient framework without pixel rollout?

## Method
The model introduces a **latent reasoning space** between perception and action: a set of `K=16` learnable latent queries `Q ∈ R^{K×d}` is inserted between the multimodal context `[x; o_{-H:0}; s]` and a noised action chunk `a_{0:T}`, and participates in Transformer propagation. To shape Q into a world-modeling substrate, a **dual-branch, future-informed training design** is used: a *prior branch* reasons from current context + Q, while a training-only *posterior branch* replaces Q with `K` future embeddings `z^{post} = E(õ_{0:T})` produced by a frozen ViT + Perceiver resampler over future observations. Both branches share the backbone and action head (flow-matching) but are isolated via a dual-branch attention mask inside a Mixture-of-Transformers pack. Joint alignment is an L2 loss on aligned hidden states, `L_align = (1/L) Σ_ℓ ||h^{prior}_ℓ − h^{post}_ℓ||²`, with small `w_align = 1e-3`. To avoid trivial collapse, the paper adds a norm regularizer `R_norm = [ReLU(τ − ||h||₂)]²` and a rank regularizer `R_rank = Σ p_i log p_i` on the Gram-matrix eigenspectrum, both with weight `1e-4`. At inference, only the prior branch is kept — the latent queries carry the future-informed structure forward without any pixel rollout. Pretrained on 200,000 hours of egocentric video (15× Being-H0.5), with observation horizon `H=4`, action chunk `T=20`.

## Key Results
- LIBERO: **99.2%** average success (vs. Being-H0.5 98.9, Cosmos-Policy 98.5, Fast-WAM 97.6, JEPA-VLA 96.4, VLA-JEPA 96.1).
- LIBERO-plus zero-shot: **82.1%** → **84.8%** fine-tuned (VLA-JEPA 79.5 is closest WAM).
- RoboCasa-50: **62.1%** (Cosmos-Policy 67.1 wins here; Being-H0.5 53.5).
- GR1 humanoid: **49.2%** (gr00t-N1.6 47.6).
- CALVIN ABCD→D / ABC→D: **4.67 / 4.48** tasks/sequence.
- RoboTwin2 easy/hard: **90.2 / 89.6** (0.6% drop under domain randomization).
- Inference latency: UAC-enabled variants at **3–4 ms/step**; author-stated ~60× efficiency gap vs. Cosmos-Policy training.
- Real-robot: leads all 5 ability suites across PND Adam-U, Unitree G1, Franka FR3.

## Limitations
**Author-stated:**
- None — the paper has no dedicated Limitations section.

**Observed:**
- Posterior supervision is tied to raw pixel futures via a frozen ViT; no exploration of cheaper or richer future-signal sources (language, CoT, action tokens).
- `K=16` is hand-picked; no ablation on how `K` should scale with task complexity, horizon, or embodiment count.
- Alignment loss is plain L2 on hidden states; no comparison vs. contrastive (InfoNCE), distributional, or whitening-based losses.
- Latent queries are static learnable parameters shared across all tasks/instructions — not instruction-conditional or task-dispatched.
- Norm/rank regularizer weights (`τ`, `w_norm`, `w_rank`) are tuned, not derived or adaptive.
- Q is never *searched over* at inference — one-shot prior forward only; no MPC / particle / ensemble use of the latent space.
- No RoboCasa win vs. Cosmos-Policy (62.1 vs 67.1) — the pixel-rollout model still has a long-horizon/kitchen-generalization edge somewhere.
- General VL knowledge is dropped from Being-H0.5 → H0.7; unclear whether latent substrate composes with language priors.

## Open Questions & Gaps
- Can the posterior branch be supervised by non-pixel futures — CoT reasoning traces, language-described futures, action-token futures, tactile/force futures, or multi-modal mixes? Which is the cheapest signal that still shapes useful latent reasoning?
- How should `K` (number of latent queries) scale with task complexity and action-chunk length? Is a fixed `K=16` leaving capacity on the table for long-horizon or dexterous tasks?
- Can the L2 alignment be replaced with InfoNCE / distributional matching / VICReg-style losses to get richer alignment without collapse hand-holding?
- Can prior-branch latent queries be **instruction-conditional** or **task-dispatched** (e.g., mixture-of-queries with a router) to improve cross-embodiment transfer and skill composition?
- Can norm/rank regularizer hyperparameters be made adaptive (e.g., data-driven τ, loss balancing) to stabilize training across model scales?
- Can inference-time *search* over the latent queries (MCTS over Q, particle filters, MPC) recover most of Cosmos-Policy's planning power without paying its pixel-rollout cost?
- What does Being-H0.7 fail on that vanilla VLAs or pixel-WAMs succeed on? The absent failure-mode analysis leaves this open — RoboCasa Cosmos-Policy gap hints at it.
- Does the latent reasoning space compose with language priors if general VL data is re-introduced?

## Connections
- Related KB papers: `papers/2026-04/being-h07/` cites Cosmos-Policy (arXiv 2601.16163, ref [9]), Fast-WAM (arXiv 2603.16666, ref [11]), VLA-JEPA (arXiv 2602.10098, ref [58]), JEPA-VLA (arXiv 2602.11832, ref [71]).
- Seeds for direction: latent-WAM, posterior-distillation, dual-branch training, Perceiver resampler over future observations, flow-matching action head, Mixture-of-Transformers packing, egocentric video pretraining, LIBERO / RoboCasa / CALVIN / RoboTwin2 / GR1 benchmarks.
