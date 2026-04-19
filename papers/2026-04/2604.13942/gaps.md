# Gaps

- Is the framework deployable on a real robot under realistic VLM inference latency, or does the slow-scale planner bottleneck control-frequency-critical sub-tasks?
- When does working memory W_t hurt vs. help? The ablation shows non-monotone effects across tasks — no policy for gating or abstracting it.
- How does performance degrade when Φ_verify gives false-positive/negative post-condition judgments? No confusion-matrix analysis of the verifier.
- What is the cost/benefit of reflection under repeated failures — can the system get stuck in retry-replan loops, and what happens beyond N_max?
- Does the distractor-mask filter break when the "task-irrelevant" regions actually carry task context (e.g., landmarks, receptacle rims)?
- Generalization across embodiments, skill libraries, or unseen task primitives is untested — the diffusion skills are pre-trained per primitive.
- Can the structured memory M_t be learned (end-to-end or via RL) rather than relying on VLM text summaries?
