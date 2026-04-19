# Gaps

- Can WAV maintain its long-horizon advantage when the value function is supervised only by sparse task-level reward (no ReinboT-style dense shaping), and how does horizon scale under that regime?
- How does planning quality degrade as the learned video generator's feasibility coverage delta increases (OOD scenes, novel objects)? No measurement of P_latent(M_traj) is reported.
- Is SNR-based elite selection principled or just empirically lucky? A head-to-head against mean/quantile/CVaR scorers would clarify whether variance calibration of V is doing the work.
- K=3 saturates on LIBERO; does the iteration sweet spot shift with task horizon, reward sparsity, or visual distribution shift in the real world?
- Latent noise distributions are Gaussian and re-estimated from elites; what breaks if the true elite manifold is multimodal (e.g., two viable grasp strategies)?
- Can the video generator and value head be distilled into a single-pass amortized planner to erase the K-iteration latency the authors flag as their core limitation?
- Does implicit planning still help when action chunks are short (H=1 or 2)? The ablation only removes planning entirely; there is no horizon sweep isolating the exponential-feasibility argument in practice.
