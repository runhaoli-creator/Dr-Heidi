# Gaps

- **Dual-branch fusion is late and heuristic.** Fusion is a hard-coded global vector [ϕ(F⊙H); ψ(F)] over 4 views with fixed λ=1. A learned cross-stream attention (token-level gating of ventral vs dorsal contributions per action dimension) is an obvious next step and authors explicitly flag it as future work. Directly portable into Being-H0.7 as a dual-branch mixing head.

- **Only one dynamic camera.** Single wrist-mounted virtual view carries the entire dorsal stream. Extending to multiple egocentric views (binocular head + wrist, or multi-fingered wrist) or temporally-rolling virtual cameras could multiply the motion signal; missing ablation.

- **Gaze backbone is frozen.** GLC stays frozen post-pretraining, so dorsal features cannot co-adapt to new embodiments or tasks. A parameter-efficient fine-tuning schedule (LoRA on GLC + manipulation loss) or periodic re-finetuning would test whether the Ego4D prior is a floor or ceiling.

- **Keypoint distillation is one-shot and offline.** VGGT keypoints are computed once per scene before policy training. No mechanism updates them at inference under distribution shift; online VGGT distillation (maybe with cached feature banks) could combat test-time viewpoint/lighting drift — exactly the regime where the current L_cgc shows mixed gains (all-perturbations score *drops* vs Variant E).

- **Dorsal target is hardwired to end-effector.** Authors note this; open question is how to *learn* or *language-condition* the dorsal attention target (object, affordance, sub-goal, other hand in bimanual). A language-gated gaze head would unify with VLA instruction following.

- **Zero-shot task transfer collapses to 24%.** No compositional primitive library; the dual-stream tokens are consumed end-to-end by RVT-2 action head. Couple Cortical Policy's dual-stream tokens with a skill-abstraction layer (STAR-style VQ codebook) to test compositionality.

- **No VLA-scale validation.** All results are RVT-2-class policies. Does the dual-stream advantage survive when swapping in a 7B VLA backbone, and does the dorsal stream still help once language-grounded world models exist? Worth testing on OpenVLA / π0 / Being-H0.

- **Pretraining data is fully simulated.** 3,600 rendered wrist videos with projected end-effector labels; no real egocentric robot data, no human-demonstration gaze. Mixing DROID + Ego4D gaze labels could expose sim-to-real gap in the dorsal stream specifically.

- **λ and ζ untuned.** Trade-off (λ=1) and 3D negative-distance threshold (ζ) are stated as fixed; no sensitivity sweep — matters for porting L_cgc to other backbones.

- **Efficiency claim lacks breakdown vs VLA baselines.** "No efficiency sacrifice" is measured against RVT-2 only; inference-time cost of two streams + VGGT preprocessing vs single-stream VLAs is unreported.

- **Dorsal-stream benefit under perturbations is under-theorized.** COLOSSEUM result says dynamic stream drives robustness more than L_cgc. Open question: is this because motion cues are *inherently* more invariant, or because the gaze pretraining imported a stronger texture-invariant prior from Ego4D? An ablation swapping Ego4D pretraining for ImageNet init on GLC would disentangle these.
