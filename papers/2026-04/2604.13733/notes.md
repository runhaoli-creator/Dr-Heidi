# Jump-Start Reinforcement Learning with Vision-Language-Action Regularization
arxiv: 2604.13733 | cs.LG | published 2026-04-15
authors: Angelo Moroncelli, Roberto Zanetti, Marco Maccarini, Loris Roveda

## Problem
On-policy RL (PPO) is precise for high-frequency manipulation but explores poorly under long horizons or imperfect rewards. VLAs carry broad semantic priors but are too slow/imprecise for closed-loop control. How can a VLA serve as a transient exploration bias without locking the student into imitation?

## Method
VLAJS augments PPO with a directional auxiliary loss. A pretrained VLA (OpenVLA-best, Octo) is queried sparsely (max 20% of rollout steps); each teacher delta is discretized into D per-step targets. On guided steps, a cosine-misalignment loss `ℓ_dir = 1 − <x,y>/(||x||·||y||+ε)` is applied separately to translation and rotation; gripper and near-zero teacher vectors are masked. Total: `L = L_PPO + λ_t · L_dir`. Schedule `N_calls ← max(N_min, ⌊N_max exp(−κ·Δr̄)⌋)` cuts calls as reward improves; guidance is permanently deactivated once recent rewards monotonically improve and mean rollout reward exceeds 3. RL policy is state-based (proprio + privileged sim state) with continuous delta EE actions; teacher takes RGB+language. Real deployment recovers state via YOLO. Baselines: PPO, Sparse RPD (persistent MSE), VLAJS(RPD) ablation.

## Key Results
- Use Case 2 (suboptimal reward, 9 tasks, n=6 seeds): macro SR@t* PPO 34.2 / VLAJS(RPD) 35.3 / VLAJS 78.1; AUC 61.8 / 59.3 / 78.4.
- Hardest tasks: PickCube-v2 0 -> 95.1; PickPlaceCube-v2 0 -> 65.9; LiftPegUpright-v2 16.9 -> 91.5; LiftPegUpright-v3 13.2 -> 63.3.
- Use Case 1 (long-horizon, 4 tasks): Sparse RPD (OpenVLA-best) macro SR@t* 40.3 / AUC 37.6 vs. PPO 0.0/7.2. Sample efficiency improved >50% on several tasks.
- Real Franka: Lift Cube 70%, Pick&Place 80%, Peg Reorient 20%; beats OpenVLA-best (47%, 40%).
- Ablations: VLAJS robust to teacher success rate and to OOD VLA camera (Fig. 10).

## Limitations
**Author-stated:**
- Needs VLA with at least minimally reliable directional cues; task-specific VLA fine-tuning is often still needed and expensive.
- Large VLA adds wall-clock, GPU memory, inference latency, serving complexity.
- Restricted to tabletop manipulation with privileged sim state for the RL policy; vision-based RL, force-interactive, or multi-stage tasks may need hierarchy/memory.
- Reward-trend deactivation heuristic may be brittle in stochastic settings.

**Observed:**
- VLAJS loses to PPO on PickPlaceCube-v1 (39.1 vs 45.4) and LiftPegUpright-v1 (80.3 vs 84.8); gains concentrate on harder v2/v3 variants.
- Sim-to-real relies on a YOLO state estimator; not end-to-end vision transfer.
- Only 20 real trials/task; peg reorientation 20% with no baseline.
- No comparison vs. non-VLA jump-start (JSRL) or demo-based methods.

## Open Questions & Gaps
- Deactivation threshold r̄>3 is tuned to ManiSkill reward scales; no porting recipe.
- Directional loss ignores magnitude and gripper — untested where grip timing/force dominate.
- RL student consumes privileged state; sparse directional guidance for vision-based students is unverified.
- Only PPO; portability to off-policy SAC/TD3 with replay is unexplored.
- No adversarial/systematically-wrong teacher test (only weak teachers tried).

## Connections
- Related KB papers: —
- Seeds for direction: vla-guided-rl, transient-auxiliary-losses, directional-cosine-regularization, sim2real, jump-start-rl
