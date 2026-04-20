# CLaD: Planning with Grounded Foresight via Cross-Modal Latent Dynamics
arxiv: 2603.29409 | cs.RO | published 2026-03-31
authors: Andrew Jeong, Jaemin Kim, Sebin Lee, Sung-Eui Yoon (KAIST)

## Problem
Robotic manipulation couples proprioceptive (kinematic) and semantic (visual) transitions through shared underlying actions. Prior planners either (a) generate expensive semantic artifacts (subgoal images, CoT text) or (b) plan in unimodal latent space without enforcing cross-modal consistency, so the two modalities can drift during rollout and produce physically/logically inconsistent trajectories.

## Method
Two-stage framework.
- **Stage 1 — Cross-modal latent dynamics (CLaD).** Encode proprio state p_t (joints+vel) and semantic state s_t=FiLM(v_t,l) from a frozen VLM (DecisionNCE). For each modality extract a transition embedding via cross-attention over (past_state, past_actions) with stochastic action-token masking. Fuse via **asymmetric cross-attention** where proprioceptive transitions query semantic ones (z_{p→s}), then a learnable pool yields z_dyn.
- **Grounded latent foresight.** Lightweight MLPs predict ẑ_p^{t+τ}, ẑ_s^{t+τ} from z_dyn. Targets come from EMA target encoders on actual future states, with L_latent = MSE on L2-normalized embeddings (SSL-style, prevents magnitude collapse). Auxiliary reconstruction loss L_recon decodes foresights back to raw proprio and future image (λ=0.1) to anchor them to observables.
- **Stage 2 — Diffusion policy.** Freeze CLaD. FiLM-modulate each predicted foresight with current observation (o_p, o_s) and condition a DDPM action denoiser over action horizon τ=6.
- 0.66B total params (VLM 0.1B + CLaD 0.33B + Policy 0.23B); trained on RTX 4090 (~22 h).

## Key Results
- LIBERO-LONG: **94.7%** avg SR, beating OpenVLA (7B, 93.8%) and π0.5 (3.3B, 93.2%) with ~10× fewer params.
- Efficiency: 25 Hz inference, 4 GB memory, 0.012 s planning latency; vs UVA (0.5B, 90.0%, 0.195 s) and LBP (0.19B, 88.6%, 0.008 s).
- Ablations: removing L_recon drops SR to 86.1 (−8.6); proprio-only foresight collapses to 50.4 (below no-foresight 84.8), semantic-only 91.5, full cross-modal 94.7; proprio-queries-semantic (94.7) > semantic-queries-proprio (93.8) > symmetric (86.7).
- UMAP of z_dyn: with L_recon distinct task-specific clusters; without, clusters diffuse.
- Pixel attribution (Integrated Gradients) on foresight targets focuses on task-relevant objects.

## Limitations
**Author-stated:**
- Compact latent may miss fine visual detail → Task 9 (pots on stove, perceptually similar objects) drops to 81.3%. Suggests object-centric or spatially-structured foresights.
- Two-stage training is expensive (~22 h single GPU); Stage 1 not amortized across datasets.
- Only manipulation shown; extension to mobile manip / force / tactile is future work.

**Observed:**
- Only LIBERO (simulation, single embodiment, 10 tasks/suite); no real-robot, no distractors, no cross-embodiment.
- Foresight horizon fixed at τ=6 — no ablation on horizon length or multi-step rollout.
- Planning is **single-step open-loop**: one forward pass predicts one foresight and conditions the diffusion policy; CLaD is never *searched over* (no MPC, no trajectory optimization, no beam over latent foresights despite being called "planning").
- Action-token masking encourages robustness but there is no inverse-dynamics or backward-search use of z_dyn.
- Stage-1/Stage-2 decoupling means policy cannot correct foresight errors and foresight gets no reward signal.
- Evaluation against baselines mixes reporting protocols (20 vs 50 rollouts, different papers), weakening head-to-head claims.

## Open Questions & Gaps
- Can z_dyn support actual *search/MPC* in latent space (rollout candidate actions, re-score foresights) rather than single-shot conditioning?
- Does the foresight degrade over longer τ or multi-step recursive prediction?
- Is asymmetric cross-attention still optimal when embodiment changes (mobile base, bimanual, soft grippers)?
- Can Stage 1 pretrain on OXE/DROID scale and transfer, replacing per-task retraining?
- Would a learned value head over z_dyn enable test-time planning without retraining the policy?

## Connections
- Related KB papers: LBP (latent backward planning), UVA, SuSIE, Seer, OpenVLA, π0/π0.5, DecisionNCE.
- Seeds for direction: inference-time search/MPC over latent foresights; cross-embodiment cross-modal dynamics pretraining; foresight-as-critic for reward-grounded planning.
