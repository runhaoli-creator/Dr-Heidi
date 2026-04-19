# Gaps

- Permanent-deactivation heuristic is a hard threshold on mean rollout reward (>3) tuned to ManiSkill reward scales; no mechanism for transfer to environments with different reward magnitudes, and authors admit it is brittle in stochastic settings — a principled uncertainty- or advantage-based gate is untested.
- Directional cosine loss deliberately drops magnitude and excludes the gripper dimension; tasks where grip timing, applied force, or precise step-size matters (contact-rich assembly, deformables) are unevaluated and could violate the direction-only assumption.
- The RL student uses privileged simulator state (object poses) while only the VLA teacher sees RGB; whether the same sparse, annealed directional guidance accelerates a fully vision-based RL student is an open question (authors list it as future work).
- Method is specialized to on-policy PPO with rollout-level reward statistics; compatibility with off-policy methods (SAC/TD3) that update from replay — and thus lack a clean "rollout improvement" signal — is untested.
- Teacher robustness is only tested with weak or OOD VLAs of comparable semantics; no experiments with systematically miscalibrated or adversarial teachers, so the claim that "VLA performance is not critically important" is bounded to the tested regime.
- No head-to-head comparison against non-VLA jump-start baselines (JSRL, demo-based pretraining, residual RL) on the same ManiSkill-v2 tasks, making the incremental value of VLA priors vs. any transient guidance source ambiguous.
- Real-robot results rely on a pretrained YOLO detector to recover state; the "zero-shot sim-to-real" claim conflates policy transfer with detector quality, and failure cases attributable to perception are not separated.
- Real-robot sample is small (20 trials/task) and peg reorientation only reaches 20% with no baseline; statistical significance of the real-world gains is unclear.
- VLAJS (RPD) underperforms PPO on several tasks (e.g., LiftPegUpright-v1/v2), yet sparse MSE is reported as a useful building block in Use Case 1 — the conditions under which sparse MSE helps vs. hurts are not characterized.
- Adaptive query schedule uses fixed κ, N_max, N_min across tasks; sensitivity and auto-tuning of these hyperparameters is not analyzed.
