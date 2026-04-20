# Hierarchical Planning with Latent World Models (HWM)

arXiv: 2604.03208 | Zhang, Terver, Zholus, ..., LeCun, Ballas (FAIR, NYU, Mila, Brown) | 2026-04-03

## Problem
Latent-world-model MPC generalizes zero-shot but collapses on long-horizon, non-greedy tasks: (i) single-step prediction errors compound autoregressively, and (ii) the CEM/MPPI search space explodes with horizon. Existing hierarchical RL needs task rewards, and classical hierarchical MPC requires hand-engineered low-D states. No prior zero-shot hierarchical MPC operates directly on pretrained latent WMs from pixels.

## Method
HWM introduces temporal hierarchy **at inference time only**, on top of pretrained latent WMs (no policy learning).
- **Two WMs in a shared latent space**: low-level P^(1)(z_{t+1}|z_t,a_t) over primitive actions, high-level P^(2)(z_{t+h}|z_t,l_t) over macro-actions.
- **Learned action encoder A_ψ**: transformer with CLS token, compresses variable-length primitive-action chunks between waypoints into a low-D latent macro-action l_t (dim ≈ 4 for Franka). Trained jointly with P^(2) via teacher-forced latent L1 loss on waypoint states (N=3 waypoints, up to 4 s spans, middle waypoint uniformly random).
- **Top-down planning**: CEM at high level minimizes ||z_g − P^(2)(l_{1:H}; z_1)||_1 → unrolled latents become subgoals z̃_i. Low-level CEM then optimizes primitive actions toward z̃_1 via ||z̃_1 − P^(1)(â_{1:h}; z_1)||_1. Re-plan every k steps (k=1 on Franka).
- **Direct subgoal transfer via shared latent space** removes need for inverse models, goal-conditioned policies, or skill discovery.
- Low-level backbones reused verbatim: VJEPA2-AC (manipulation), DINO-WM (Push-T), PLDM (maze) — isolates hierarchy as the only change.

## Key Results
- **Franka Pick-&-Place (real, visual-only, single goal image)**: 0% → 70% (cup) / 60% (box); drawer 30% → 70%. Beats Octo, π0-FAST-DROID, π0.5-DROID despite ~77× less robot data.
- **Push-T, d=75**: DINO-WM 17% → 61% with hierarchy; also wins at d=25/50.
- **Diverse Maze, D∈[13,16] OOD layouts**: PLDM 44% → 83%; held-out maze geometry.
- **Compute**: matches/exceeds flat planner with up to 3–4× less planning time (Fig. 5).
- **Ablation — latent vs delta-pose macro-actions**: latent cos-sim 0.88 vs 0.80; L1 0.080 vs 0.088 → delta-pose collapses non-greedy sequences (e.g., up-then-down).
- **Prediction-horizon crossover (Fig. 6)**: low-level wins ≤1s, high-level single-shot wins ≥1.5s — direct evidence that temporal abstraction reduces compounding error.
- **Latent-action-dim sweep**: plan success grows with d; executability drops beyond ~4 — capacity/reachability trade-off.

## Limitations
**Author-stated**: all methods still degrade as horizon grows; failures from perceptual imprecision (depth), near-misses due to no joint high/low optimization; strict top-down decomposition (no feedback up); representation and uncertainty handling unaddressed.
**Observed**: (i) high-level horizon H and primitive horizon h are small (H=h=2 on Franka) — unclear scaling; (ii) only **two** temporal scales, no recursion; (iii) CEM at both levels — gradient-based or amortized planners unexplored; (iv) waypoints sampled uniformly at training time — no learned waypoint selector; (v) decoder shown only for viz, not for plan verification; (vi) subgoal reachability gap exposed in §4.3 but unsolved; (vii) evaluation is goal-image conditioned only, no language.

## Open Questions & Gaps
- How to close the high/low planner loop (bidirectional feedback, replan-on-infeasible-subgoal)?
- Learned waypoint selection vs uniform mid-point sampling?
- Recursive >2-level hierarchies; adaptive temporal stride per state.
- Uncertainty-aware MPC: epistemic-weighted energies, ensembles of P^(2).
- Replace CEM with latent-space gradient / diffusion / GFlowNet planners.
- Language- or task-embedding-conditioned macro-actions (bridge to VLA).

## Connections
- **VJEPA2-AC, DINO-WM, PLDM** — backbones reused; HWM is a plug-in on top.
- **HIQL / HILP / GCIQL** — RL hierarchical baselines, all dominated.
- Feeds Dr. Heidi's *inference-time-use-of-latent-space* axis: HWM is a concrete instance of structured search over Q (macro-action latent) with a learned encoder compressing the search space; natural seed for combining with latent diffusion planners, CEM→gradient refinement, or reviewer/critic loops over subgoals.
