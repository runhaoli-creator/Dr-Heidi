# HCLSM: Hierarchical Causal Latent State Machines for Object-Centric World Modeling

- arXiv: 2603.29090v1 (Mar 2026) — Jaber Jaber, Osama Jaber (RightNow AI)
- Code: https://github.com/rightnow-ai/hclsm

## Problem
Flat-latent video world models (V-JEPA, DreamerV3, GAIA-1) entangle objects, collapse multi-scale time into one prediction step, and lack explicit causal structure. This blocks planning and counterfactual reasoning for embodied agents, which need per-object state, events at multiple scales, and directed interaction graphs (e.g., gripper pushes mug, not vice versa).

## Method
Five-layer differentiable world model, trained on PushT (OXE, 206 eps, 25.6K frames), 68M params.
1. **Perception**: ViT patch encoder → dworld.
2. **Object decomposition**: Slot Attention with Nmax=32 slot proposals, iterative softmax competition + GRU; **existence head** palive for dynamic birth/death (dormant slot re-spawned from highest-residual token when residual exceeds threshold). **Spatial Broadcast Decoder (SBD)** broadcasts each slot to a 14×14 grid, decodes features + alpha mask; alpha is softmax-normalized over alive slots (pixel-level competition). Reconstruction target = frozen EMA-ViT features (DINOSAUR-style).
3. **Hierarchical dynamics**:
   - **L0** selective SSM (Mamba-style) per object for continuous physics, plus a global mean-pooled SSM as context. Custom Triton scan kernel (38× over sequential PyTorch).
   - **L1** sparse event transformer: dilated-conv event detector on multi-scale frame diffs; transformer runs only on K≪T gathered event steps.
   - **L2** goal transformer: learned summary queries cross-attend events → nsummary abstract tokens, optionally conditioned on language/goal embeddings.
   - Vectorized gather/scatter with learned per-level gates.
4. **Causal layer**: GNN all-pairs messages with learned adjacency W (Gumbel-softmax binary edges + L1 sparsity + NOTEARS DAG constraint via augmented Lagrangian). In current release GNN edge weights act as the primary causal signal; explicit DAG is regularization only.
5. **Continual memory**: Hopfield + EWC (mentioned in Fig 1, not evaluated).
- **Two-stage training (key idea)**: Stage 1 (40% of steps) = SBD reconstruction + light diversity only (prediction loss computed but no gradient) → forces spatial slot specialization. Stage 2 (60%) adds JEPA prediction + object/causal losses with SBD downweighted (5.0 → 1.0). Rationale: if JEPA is on from step 0 it dominates because distributed slot codes are easier to predict than object-specific ones.

## Key Results
- PushT, H100, bf16, 50K steps, 2/4 runs survived.
- Two-stage: Pred 0.008 / Track 0.016 / Diversity 0.132 / SBD 0.008 / Total 0.262.
- No-SBD baseline has lower Pred (0.002) but higher Diversity (0.154) and no spatial structure → confirms distributed-code shortcut.
- Learned event detector fires 2–3 times per 16-frame clip, aligned with contact moments.
- PCA on slot trajectories: 33.5% variance (two-stage) vs 57% (no-SBD) — structured trajectories with direction changes at event boundaries.
- Triton SSM scan: 39.3×/38.0× speedup Tiny/Base on T4.

## Limitations
**Author-stated:** (1) All 32 slots stay alive; existence head never kills; each of ~3 objects splits across ~10 slots; reducing Nmax→8 caused NaN. (2) Explicit causal adjacency collapses to zero under sparsity; joint training with dynamics NaNs at bf16; no intervention-based evaluation. (3) Only Small (68M) on one dataset; Base (262M) / Large (3B) NaN at bs≥4; FSDP broken (NCCL). (4) 40–60% of seeds diverge in first 1K steps (GRU gradient overflow at bf16).

**Observed:** (a) No downstream control / planning numbers — CEM/MPPI mentioned but not evaluated. (b) No comparison to SlotFormer / Slot-SSM / DINOSAUR on the same benchmark — Table 1 is capability checklist only. (c) PushT is near-rigid 3-object 2D task — decomposition benefit is asserted, not measured. (d) Three temporal scales are hard-wired (continuous / event / goal); no ablation on number of levels or on event-detector threshold. (e) No counterfactual / intervention experiments despite "causal" framing. (f) Goal transformer language conditioning is architectural only; not tested.

## Open Questions & Gaps
- Can the K-query structure itself be **hierarchical / task-dispatched** rather than flat 32-slot pool? (Direct tie-in to Dr. Heidi's latent-query axis.)
- Would Nmax anneal + codebook dedup (MetaSlot-style) actually yield one-slot-per-object here, or is the problem the SBD feature target granularity?
- Does sparsity on W ever find true interaction edges if initialized warm from GNN edges?
- Does hierarchy generalize to longer horizons / multi-object scenes (ALOHA, 5+ objects) or does event sparsity collapse?

## Connections
- Slot Attention, SAVi, DINOSAUR, SlotFormer, Slot-SSM, Adaptive Slot Attention, MetaSlot (object-centric line).
- Mamba / S4 (selective SSM backbone).
- V-JEPA / V-JEPA 2, DreamerV3, GAIA-1 (flat-latent world-model baselines).
- NOTEARS, DAG-GNN, Schölkopf 2021 (causal structure learning).
- OXE, LeRobot, RT-2, Octo (robot data / policy context).
