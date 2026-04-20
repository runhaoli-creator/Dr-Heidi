# Gaps

- **Bidirectional hierarchy**: HWM is strictly top-down; if the low-level planner cannot reach subgoal z̃_1, there is no feedback to repropose. Build a two-way protocol (low-level reports reachability residual → high-level re-optimizes conditioned on executable set), e.g. constrained CEM with learned reachability critic.
- **Learned waypoint selector**: training samples N=3 waypoints uniformly in time; informative waypoints (contact events, phase transitions) are ignored. Train a segmenter (change-point / contrastive / VQ token) over trajectories so macro-actions align with semantic boundaries, not clock time.
- **Capacity/reachability trade-off is hand-tuned**: §4.3 shows optimal latent-action dim ≈ 4 chosen per-task. Propose adaptive/annealed action-dim or mixture-of-experts macro-actions; regularize P^(2) with a reachability penalty so its predicted subgoals lie in the low-level feasible manifold.
- **Only two temporal scales**: recursion to k≥3 scales is untested; coarse-to-fine planning on week-long / room-scale tasks would need it. Stack action encoders and evaluate depth-vs-performance.
- **Uncertainty-blind energy**: energy is raw L1 in latent space, no epistemic weighting. Ensembles of P^(2) or Bayesian latent WMs would let the planner down-weight uncertain futures — directly hits the "long-horizon compounding error" pain-point.
- **CEM is a weak optimizer for rich latents**: both levels use CEM. Try latent gradient descent on P^(2), diffusion/flow-matching planners, or amortized policy heads that warm-start CEM.
- **Subgoals never verified**: decoder is explicitly "visualization only". A lightweight reachability/feasibility critic that scores subgoals before committing would cut the ≥60% of non-near-miss failures.
- **Goal-image only**: no language, no task ID. Conditioning the macro-action encoder on a task/language embedding turns HWM into a VLA-like hierarchical planner — concrete bridge to VLAs that currently lose to HWM on Franka despite 77× more data.
- **No online adaptation**: HWM is strictly offline-pretrained + zero-shot. Test-time latent-action fine-tuning (few-shot) or replay-based low-level correction is unexplored.
- **Horizon H=2, h=2 is tiny**: compute savings may shrink at larger H; need a compute-vs-H Pareto study.
- **Benchmark scope**: all three domains are goal-reaching; contact-rich bimanual, deformables, or dynamic obstacles are untested — likely where top-down hierarchy breaks first.
- **Shared-latent assumption**: requires P^(1) and P^(2) to share an encoder; plug-and-play across heterogeneous pretrained WMs (e.g. pair a VJEPA2 low-level with a video-gen high-level) needs a latent-alignment module — open problem.
