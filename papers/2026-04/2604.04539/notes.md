# FlashSAC: Fast and Stable Off-Policy Reinforcement Learning for High-Dimensional Robot Control
arxiv: 2604.04539 | cs.LG | published 2026-04-06
authors: Donghu Kim, Youngdo Lee, Minho Park, Kinam Kim, I Made Aswin Nahendra, et al.

## Problem
On-policy RL (PPO) is stable but data-hungry; off-policy SAC reuses replay data but suffers from slow convergence and bootstrap-induced critic instability that worsens with state/action dimensionality. Prior work fixes either speed (FastTD3 with tiny nets) or stability (norm-bounded big nets, slow updates), not both — leaving high-DoF dexterous manipulation and humanoid control without a fast-and-stable off-policy recipe.

## Method
FlashSAC = SAC + three coupled mechanisms. (1) **Fast training**: 1024 parallel envs, 10M-transition replay buffer, 2.5M-param 6-layer inverted-residual net (vs typical 0.2M MLP), batch 2048, update-to-data ratio 2/1024 — far fewer gradient steps than typical off-policy RL, made viable by larger batches/models and JIT+mixed precision. (2) **Stable training**: pre-activation BatchNorm before each nonlinearity, post-RMSNorm to bound feature norms, cross-batch value prediction (concat s and s' so BN statistics match), distributional critic with categorical Q over [G_min, G_max] and adaptive reward scaling r̄_t = r_t / max(√(σ²_{t,G}+ε), G_{t,max}/G_max), and unit-sphere weight projection after every step. (3) **Exploration**: unified entropy target via fixed action-std σ_tgt=0.15 (action-dim-invariant), plus *Noise Repetition* — sample ε~N(0,I) and hold for k steps with k~Zeta(s), giving cheap temporally correlated exploration suited to massively parallel sims.

## Key Results
- 60+ tasks across IsaacLab, MuJoCo Playground, ManiSkill3, Genesis, DMC, MyoSuite, HumanoidBench: matches or beats PPO, FastTD3, XQC, SimbaV2, TD-MPC2, MR.Q, DrQ-v2; largest wins on dexterous (Allegro/Shadow Hand) and humanoid (G1, H1, Booster T1).
- PPO trained 200M steps (3× FlashSAC compute) still loses on high-dim tasks.
- Sim-to-real Unitree G1 (29-DoF blind locomotion): flat real-world walking after **20 min** vs PPO **3 h**; unseen 15 cm stairs after **4 h** vs PPO **20 h** — order-of-magnitude wall-clock reduction.
- Architectural ablation: each of {Residual, BN, RMSNorm, Dist. Critic, WeightNorm} monotonically reduces critic-loss condition number and bounds parameter/feature/gradient norms.
- Buffer size sweet spot 10M (50M slows recent-sample retrieval); 2/1024 UTD-ratio near-optimal at high data throughput.

## Limitations
**Author-stated:**
- Focused on state-based control; tactile-based learning named as future work.
- Stabilization claimed orthogonal to representation-learning extensions (MR.Q-style aux objectives), but the composition is not demonstrated.

**Observed:**
- Sim-to-real eval is single embodiment (G1) and single task family (locomotion); no real-robot dexterous-manipulation transfer despite strong sim numbers on Allegro/Shadow Hand.
- Vision eval is DMC-only (8 tasks, lightweight 3-conv encoder); no vision-based manipulation or sim-to-real with cameras.
- Asymmetric actor-critic uses privileged sim state for the critic during training; pure-proprioceptive transfer untested.
- Single-GPU eval (RTX 5090); no multi-GPU scaling curve, accessibility for smaller-GPU labs unclear (batch 2048, 10M buffer in RAM).
- Adaptive reward scaling under non-stationary curricula or shaping changes not characterized.
- vs model-based baselines (DreamerV3, TD-MPC2) only on subset; wall-clock claim not measured on long-horizon sparse-reward tasks where planning matters most.

## Open Questions & Gaps
See `gaps.md`.

## Connections
- Related KB papers: 2604.07426 (GIRL) — also uses K=5 ensemble + bounded drift on top of DreamerV3, complementary norm-bounding philosophy in the model-based setting.
- Seeds for direction: scaling-law off-policy RL, norm-bounded critic stabilization, distributional Q with adaptive reward scaling, action-dim-invariant entropy targeting, parallel-sim-friendly correlated exploration.
