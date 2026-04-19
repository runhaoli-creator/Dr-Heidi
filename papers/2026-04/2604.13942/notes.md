# Goal2Skill: Long-Horizon Manipulation with Adaptive Planning and Reflection
arxiv: 2604.13942 | cs.RO | published 2026-04-15
authors: Zhen Liu, Xinyu Ning, Zhe Hu, XinXin Xie, Weize Li, et al.

## Problem
Existing VLA policies rely on short observation windows and end-to-end action prediction, making them brittle on long-horizon, memory-dependent manipulation tasks with partial observability, occlusions, and multi-stage dependencies. These tasks require persistent task memory, adaptive decomposition, outcome verification, and failure recovery — capabilities that monolithic VLAs lack.

## Method
A dual-system (cerebrum/cerebellum) framework. A **high-level planner** (pre-trained VLM Φ) runs at a slow scale: given goal G and observation o_t, it (a) produces a structured plan P = ⟨τ_1,...,τ_K⟩ where each τ_k = (instruction ℓ, pre/post conditions, horizon δ, distractor boxes B_k, skill index j_k); (b) maintains memory M_t = {H_t episodic history, W_t working-memory NL summary, E_t error register}; (c) after each sub-task, calls Φ_verify(o, post_k, W) → {success, fail, timeout}; (d) on failure runs Φ_reflect → (diagnosis d_k, action ρ_k ∈ {retry, adjust-param, replan}). If ρ = retry/adjust and attempts < N_max, parameters (e.g., distractor boxes) are modified and re-issued; else Φ_plan is re-invoked with updated memory. History H_t is sliding-window summarized into W_t to fit the VLM context. A **low-level executor** handles each sub-task: a zero-shot segmentation model converts B_k into a distractor mask Q_t propagated over time, producing filtered image Î_t = I_t ⊙ (1−Q_t). A diffusion-based skill library {π_1,...,π_J} generates action chunks A_t conditioned on (Î_t, proprio s_t, ℓ_k). Executor runs receding-horizon, returning observations to the planner at checkpoints; only the planner judges completion. Trained 30k steps on RMBench with 50 demos/task decomposed into sub-tasks.

## Key Results
- Overall RMBench success rate: 32.4% vs. 9.8% for strongest baseline (X-VLA/ACT).
- M(n) memory-intensive tasks: 38.7% vs. 9.0% (X-VLA).
- M(1) tasks: 23.0% vs. 15.0% (ACT).
- Task highlights: Blocks Ranking Try 60% vs. ≤10% for all baselines; Battery Try 46% vs. 26%; Press Button 10% (only method non-zero). Observe & Pick Up 8% vs. 9% (slightly below best baseline).
- Memory ablation: Base 6.7% → +H_t 27.7% → +H_t+W_t 28.0% → Full (with E_t) 35.3%.
- Recovery ablation: Base 8.0% → +Φ_verify 17.5% → +Φ_verify+Φ_reflect 24.0% → Full 28.0%.

## Limitations
**Author-stated:**
- Future work is needed to extend to "broader real-world manipulation settings" (implying current eval is simulated RMBench only).
- Interaction between memory updating and low-level adaptation needs strengthening.
- Robustness under "stronger scene uncertainty and embodiment variation" is open.

**Observed:**
- Only 5 RMBench tasks evaluated; no real-robot experiments; no report of wall-clock or VLM token cost per episode.
- Absolute success rates remain low (≤60%, average 32.4%) — far from deployment-ready.
- Working memory W_t can hurt: drops Observe&Pick Up 8→6% and Blocks Ranking Try 54→42% when added over H_t, with no analysis of when to turn it off.
- Retry threshold N_max, context window N_h, and the skill library J are hand-crafted; no sensitivity study.
- Requires pre-training distractor bounding boxes B_k from the VLM; failure modes of B_k prediction are not characterized.
- Sub-task-level supervision requires demonstrations decomposed into sub-tasks; scalability of this annotation is unclear.
- No latency/throughput comparison vs. reactive VLA baselines.
- Baseline numbers taken from RMBench rather than re-run, so protocol equivalence with *their* trained method is only asserted.

## Open Questions & Gaps
- Is the framework deployable on a real robot under realistic VLM inference latency, or does the slow-scale planner bottleneck control-frequency-critical sub-tasks?
- When does working memory W_t hurt vs. help? The ablation shows non-monotone effects across tasks — no policy for gating or abstracting it.
- How does performance degrade when Φ_verify gives false-positive/negative post-condition judgments? No confusion-matrix analysis of the verifier.
- What is the cost/benefit of reflection under repeated failures — can the system get stuck in retry-replan loops, and what happens beyond N_max?
- Does the distractor-mask filter break when the "task-irrelevant" regions actually carry task context (e.g., landmarks, receptacle rims)?
- Generalization across embodiments, skill libraries, or unseen task primitives is untested — the diffusion skills are pre-trained per primitive.
- Can the structured memory M_t be learned (end-to-end or via RL) rather than relying on VLM text summaries?

## Connections
- Related KB papers: none yet indexed here; cites MemoryVLA (Shi 2025), MAP-VLA (Li 2025b), Meta-Memory (Mao 2025), RoboClaw (Li 2026b), "Critic-in-the-Loop" tri-system VLA (Yi 2026), RMBench (Chen 2026).
- Seeds for direction: dual-system VLM+VLA, structured episodic+working+error memory, verification-reflection closed loop, distractor-aware filtered perception, long-horizon benchmark evaluation.
