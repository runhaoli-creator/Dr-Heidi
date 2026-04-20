# Gaps

## Intent vs. action decoupling
- **Deterministic intent under multi-modal futures.** L_world is MSE to a single future ViT feature; when multiple valid sub-goals exist (e.g., which cup to approach), MSE-regression averages them and blurs the bottleneck. Replace with distributional targets (e.g., flow-matching or diffusion on the latent foresight, EBM, or VQ of future features) and test on tasks with ambiguous sub-goals.
- **Fixed horizon H=16.** No hierarchy, no adaptive horizon. Long-horizon / articulated multi-step tasks would benefit from multi-scale foresight (short tactical + long strategic) or learned horizon prediction.
- **Intent-bypass is empirically suppressed but not formally guaranteed.** Ablation shows SEER-EV (extra vision path) hurts, but DIAL still gives System-1 the current ViT features in addition to x_t; a causal-mediation test (intervene on x_t, measure action change) would actually prove grounding.
- **Action-aware gradient can overwrite foresight semantics.** After Stage 2 the intent is "action-aware" but its physical meaning is no longer audited. Add a held-out future-frame reconstruction probe throughout Stage 2 to quantify semantic drift.

## Latent-space supervision design
- **DINO ablation is confounded.** DIAL-DINO keeps System-2 in VLM space but decodes via DINO — so it tests *cross-manifold translation*, not "native-ness." Missing cell: DINO on both sides (System-2 reasons in DINO, System-1 consumes DINO). Without this, the "VLM-native" claim is underdetermined.
- **Only Qwen2.5-VL-3B tested.** Generality across VLM backbones (PaliGemma, InternVL, Eagle) unknown — perhaps the benefit is backbone-specific.
- **Queries may collapse to reconstruction.** N = #visual-patches queries trained with MSE on future ViT features — what prevents them from copying current features on static scenes? No foresight-faithfulness metric beyond PCA qualitative plots.
- **Paired (o_t, o_{t+H}) required.** The paper claims scalability to action-free data but experiments still need matched current/future frames from the *same trajectory*. Truly action-free internet videos without episode structure are untested.
- **Frozen ViT ceiling.** Shared ViT is frozen; Stage-2 gradients flow into LLM blocks only. The conclusion speculates EMA-stabilized ViT tuning but provides no ablation — the bottleneck may actually be the frozen perceptual feature space.
- **L_world weight is implicit (1:1 in total loss).** No sweep on loss weighting during Stage 2; possible that L_fm dominates and foresight reconstruction quietly degrades.

## Evaluation & reproducibility
- **Benchmark narrow.** RoboCasa GR1 Tabletop + one in-house real robot. No LIBERO-long, CALVIN, SimplerEnv, BridgeV2, or RoboCasa full — hard to compare with external VLAs directly.
- **No latency / control-frequency numbers.** "End-to-end" is claimed but inference cost of a 3B VLM per control step is unreported.
- **Warmup length 50% of steps** without ablation on ratio — robustness of the two-stage schedule is unknown.
- **No failure-mode analysis.** When DIAL fails, is it wrong intent or wrong decoding? Conditional success-rate on foresight-quality bins would separate them.

## Actionable directions for Dr. Heidi (Being-H0.7 comparison)
- Compare DIAL's *deterministic continuous latent foresight* against Being-H0.7's latent action tokens on identical benchmarks — isolate "continuous feature target" vs. "discrete motion token" designs.
- Propose a *distributional* latent-foresight bottleneck (flow-matching over x_t) to handle multi-modal sub-goals — a direct extension over DIAL.
- Investigate whether an EgoDex-scale action-free pre-training of System-2 alone (no paired robot episodes) retains DIAL's gains — tests the action-free-video promise in the conclusion.
- Causal-mediation evaluation: intervene on x_t (swap with foresight from a different instruction) and measure action-following — a metric DIAL lacks and Being-H0.7 could adopt.
