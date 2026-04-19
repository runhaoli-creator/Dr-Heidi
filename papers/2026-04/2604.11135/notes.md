# AIM: Intent-Aware Unified world action Modeling with Spatial Value Maps
arxiv: 2604.11135 | cs.RO | published 2026-04-13
authors: Liaoyuan Fan, Zetian Xu, Chen Cao, Wenyao Zhang, Mingqi Yuan, Jiayu Chen

## Problem
Unified world-action models (WAMs) built on pretrained video generators still need heavy robot-specific finetuning to decode reliable actions. The authors argue this is a structural mismatch: predicting dense future RGB answers "what the scene looks like," but control needs "where to interact and why." Action heads forced to read inverse-dynamics cues from dense appearance latents struggle, especially in cluttered, contact-rich manipulation.

## Method
AIM adds a third generative stream — an Action-based Spatial Value Map (ASVM) — between the future-video branch and the action head, built on Wan2.2-TI2V-5B. A mixture-of-transformers jointly denoises (via flow matching) future RGB tokens `z^x`, future value-map tokens `z^m` (same VAE, same T-pose multi-view layout), and future action tokens `z^a` (MLP-encoded continuous dual-arm vectors), sharing only self-attention across streams. An **intent-causal attention mask** lets future-video tokens see history+instruction, value tokens see history+future-video, but action tokens see only history+future-value (not future-RGB) — so future info reaches control only through the value bridge. T5 language features cross-attend into the video stream only. Training loss `L = L_rgb + λ_m L_map + λ_a L_act`. **Stage II**: a self-distillation GRPO post-training phase freezes video + value branches and updates only the action head using `r_t = λ_d · M_t(Π(p_t)) + λ_s · r_sparse` — dense reward = value-map response at the projected end-effector target, plus sparse task success. Inference is autoregressive chunk-wise rollout with KV caching. Value-map labels are auto-generated in simulation: grasp-contact vertices (pick) or stable-placement contact regions (place) are projected to the image plane and Gaussian-smoothed with depth-aware kernel width.

## Key Results
- RoboTwin 2.0, 50 tasks, Easy: 94.0% SR (vs Stage1 93.0%, LingBot-VA 92.9%, Fast-WAM 91.9%, Motus 88.7%, π0.5 82.7%, X-VLA 72.8%, π0 65.9%).
- Hard: 92.1% (vs Stage1 92.0%, Fast-WAM 91.8%, LingBot-VA 91.6%, Motus 87.0%).
- Gains vs Motus: +5.3 / +5.0 (Easy/Hard); vs π0.5: +11.3 / +15.3.
- Largest per-task gains on contact/stage-sensitive tasks: Place Mouse Pad 97/95%, Scan Object 100/98%, Turn Switch 100/98%.
- Stage II RL lifts Stage1 by only ~1.0 / 0.1 pts — most gain comes from the value-map interface, not RL.
- Dataset: 30K synchronized multi-view manipulation trajectories w/ value-map annotations.

## Limitations
**Author-stated:**
- None explicitly listed; paper has no "Limitations" section.

**Observed:**
- Evaluated only in simulation (RoboTwin 2.0); no real-robot transfer or sim-to-real study.
- Value-map annotation pipeline relies on simulator contact APIs and physics states — unclear how to label real demonstrations.
- Only pick and place affordances are defined; non-prehensile, articulated, tool-use, or deformable tasks are not covered by the annotation scheme.
- RL post-training delivers marginal SR gains (+1.0 / +0.1), raising value-for-compute questions.
- Hard tasks with low absolute SR (Hanging Mug 43/42%, Blocks Ranking Size 47/43%) are not analyzed; spatial-intent bridge does not close these.
- No ablations reported in the excerpt for intent-causal mask vs. open attention, or for value-map vs. no-value variants.
- No reported inference latency, rollout horizon `h`, or parameter count.

## Open Questions & Gaps
See `gaps.md`.

## Connections
- Related KB papers: Motus (2512.13030), LingBot-VA / causal world modeling (2601.21998), Fast-WAM (2603.16666), GigaWorld-Policy (2603.17240), Unified World Models (2504.02792), AtomVLA (2603.08519), Wan2.2 (2503.20314).
- Seeds for direction: spatial affordance bridges for WAMs, self-distilled dense reward from learned value maps, intent-causal attention masking, value-map labeling beyond sim contact APIs.
