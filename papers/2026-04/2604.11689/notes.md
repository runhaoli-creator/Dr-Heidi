# LARY: A Latent Action Representation Yielding Benchmark for Generalizable Vision-to-Action Alignment

## Problem
LAMs for VLA pretraining from unlabeled video (LAPA, UniVLA, villa-X, IGOR, Moto, CoMo) have proliferated, but no rigorous, decoupled way exists to measure the latent action space *quality* itself. Existing evaluations entangle it with downstream policy performance or rely on cluster plots, leaving unclear whether latent actions capture diverse semantics and enough physical detail to reconstruct trajectories across embodiments.

## Method
Two probe tasks on a frozen latent z:
- **Classification (fsem: Z->C)**: 4-layer V-JEPA attentive probe on 9 frames (224x224). *Atomic Robot* = 28 LIBERO primitives (25.9K pairs); *Composite* = 145 classes over 692K human + 538K robot clips (HoloAssist, Ego4D, SSv2, TACO, EPIC-KITCHENS, EgoDex, AgiBotWorld-Beta), re-segmented by a Doubao-1.5-pro VLM with MGSampler.
- **Regression (fdyn: Z->A)**: MLP (2 residual blocks, hidden 4096) maps latent from image pairs (stride s=5) to 7/12/16-DoF action chunks on CALVIN, VLABench, RoboCOIN (fingers masked), AgiBotWorld-Beta.

Four paradigms: (i) Embodied LAMs (LAPA, UniVLA, villa-X); (ii) Semantic Encoders (DINOv3, V-JEPA 2); (iii) Pixel VAEs (Wan2.2, FLUX.2-dev); (iv) **General LAMs** — new class keeping LAPA's VQ-VAE IDM/FDM but swapping its pixel encoder for a *frozen* DINOv2/DINOv3/SigLIP2/MAGVIT2. Continuous pre-VQ embeddings used.

## Key Results
- **Hierarchy**: General Encoders > General LAMs >> Embodied LAMs. Classification avg: V-JEPA2 76.6, DINOv3 68.7, LAPA-DINOv3 49.2, UniVLA 18.0. Regression MSE avg: DINOv3 0.19, V-JEPA2 0.25 vs. LAPA 0.97.
- **Latent > pixel** for control. Stride ablation: FLUX best at s=5 (0.04) but collapses at s=30 (0.62); LAMs are stride-stable — encode *dynamic* trajectories.
- **General LAM recipe**: contrastive SSL (DINOv3) > reconstruction/VL-contrastive; cs=64, sl=49 critical (sl=16 collapses to 1.6% utilization), dim=256 balances capacity/stability.
- **Attention**: V-JEPA2/DINOv3 localize sharply on end-effector+object; pixel VAEs diffuse; Embodied LAMs produce uninformative blobs. LAPA-DINOv2 inherits backbone localization even under 4x4 quantization.

## Limitations

### Author-stated
- General LAMs' robot-action accuracy lags human ("limited data scale/diversity").
- Quantized General LAMs' MSE still below uncompressed general encoders.
- Dexterous finger articulation masked in RoboCOIN as "ill-posed".

### Observed
- Offline probe only — no closed-loop rollout.
- Atomic-Robot is LIBERO-only (sim, single-arm, exo).
- 145 composite labels from a commercial VLM, no human audit.
- Frozen backbones understate what end-to-end finetuning of Embodied LAMs could yield.
- Fixed 4-layer probe may conflate feature quality with action-relevance.

## Open Questions & Gaps
- Minimum **continuous latent-action interface** plugging frozen DINOv3/V-JEPA2 into a policy — is VQ needed at all?
- Can a lightweight latent-action head on frozen DINOv3 close the gap to continuous features while keeping stride-invariance?
- Does action-centric saliency on a general backbone fix long-tail aliasing?
- Is optimal (cs, sl, dim) backbone-dependent?
- Does offline LARY score correlate with closed-loop VLA success?

## Connections
- Benchmarks the latent-action-from-video line: LAPA, UniVLA, villa-X, Moto, IGOR, CoMo, LatBot.
- Echoes V-JEPA2's "latent-space > pixel" thesis at representation-eval level.
- **Latent-query-structure axis**: VQ (cs, sl, dim) parameterizes a discrete latent query space; LARY gives the first principled recipe (cs=64, sl=49, dim=256, contrastive backbone).
- Complements EWMBENCH, LAWM, Zhang2025a diagnostics.
- Implication: align policy heads to general visual feature spaces, not new codebooks on scarce robot data.
