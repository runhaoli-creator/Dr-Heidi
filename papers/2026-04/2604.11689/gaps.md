# Gaps

- **Closed-loop validation missing**: LARY scores are offline probe/regression only; no rollout on CALVIN/LIBERO/real robot. Build a correlation study mapping LARYBench MSE/Acc to real-world VLA success rates, to test whether "representation quality" is actually predictive of embodied task success.

- **Continuous latent action head for frozen vision backbones**: General encoders (DINOv3/V-JEPA2) beat all LAMs but currently lack a standardized action-decoding interface. Design a minimal continuous-latent policy head (e.g., diffusion or flow-matching over frozen DINOv3 features) that preserves stride-invariance without a VQ bottleneck.

- **Quantization-free General LAM**: The VQ bottleneck costs ~15-20 points of MSE relative to continuous features. Test residual/FSQ/LFQ quantization on top of DINOv3 to retain codebook controllability while closing the gap to uncompressed features.

- **Dexterous finger control is out-of-scope**: RoboCOIN masks finger DoFs as "ill-posed". Extend LARYBench with a hand/finger-articulation track (e.g., EgoDex or DexYCB) to probe whether latent spaces encode micro-contact geometry.

- **Atomic-primitive coverage is sim+single-arm only**: 28-class Atomic Robot uses LIBERO exclusively. Curate a bimanual/real-robot atomic-primitive split to test whether "kinematic-level" latent quality transfers across embodiments.

- **Taxonomy label noise is unaudited**: 145 composite classes labeled by a commercial VLM (Doubao-1.5-pro). Run human-in-the-loop audit on a stratified subset, and publish an inter-annotator agreement / confusion matrix, particularly for the mid-frequency aliasing cluster identified in error analysis.

- **Long-tail action performance**: Strong models widen the gap over weak ones on rare classes but still degrade. Test whether action-centric saliency (UniVLA) or language-conditioned probes recover long-tail accuracy when grafted onto DINOv3/V-JEPA2.

- **Probe-capacity confound**: Fixed 4-layer attentive probe may conflate "general visual feature quality" with "action-relevance". Ablate probe depth and/or linear-probe-only results to isolate action-specific signal.

- **End-to-end finetuning not tested**: All encoders are frozen. Measure whether Embodied LAMs close the gap when fine-tuned on LARYBench data, or whether the deficit is fundamental to their pretraining objective.

- **Temporal-horizon scaling**: Stride ablation only goes up to 30. Probe latent-action trajectory fidelity at minute-scale horizons for long-horizon manipulation/navigation.

- **Cross-stride training**: Current protocol trains regressors at a single stride. Evaluate whether stride-randomized training yields representations that are intrinsically scale-equivariant, closing FLUX-style short-horizon wins and LAM long-horizon stability.

- **Open-sourced "General LAM" recipe hardening**: Paper prescribes cs=64, sl=49, dim=256 from single-backbone ablation. Re-run the sweep on SigLIP2/MAGVIT2 to test whether the optimal quantization settings are backbone-dependent.

- **Action-space heterogeneity handling**: 7/12/16-DoF regressors are trained separately per dataset. Explore a unified action-space tokenizer (e.g., normalized SE(3)+gripper) that lets a single head transfer across CALVIN/VLABench/RoboCOIN/AgiBot.

- **Missing comparison to VLAC / VLA-in-the-Loop**: LARY compares to LAM-style methods (LAPA, UniVLA, villa-X) but not to newer closed-loop latent-action critics. Extend the benchmark to these to check whether evaluation-via-critic differs from evaluation-via-probe.
