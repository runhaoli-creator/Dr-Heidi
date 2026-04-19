# GIRL: Generative Imagination Reinforcement Learning via Information-Theoretic Hallucination Control
arxiv: 2604.07426 | cs.LG | published 2026-04-08
authors: Prakul Sunil Hiremath

## Problem
Latent model-based RL (e.g., DreamerV3) suffers from "imagination drift": one-step model errors compound over rollouts, pushing imagined states off the training manifold and producing "physics-defying hallucinations" (e.g., limbs through floors). Standard KL regularization controls capacity but not drift, and the latent dynamics have no external anchor to the physical world.

## Method
GIRL extends the RSSM paradigm with two components on top of DreamerV3-style encoder/posterior/prior/decoder/reward models. (1) Cross-modal grounding: a frozen DINOv2 ViT-B/14 produces a CLS embedding Φ(o_t), projected to a 128-d grounding vector c_t and injected into the transition-prior mean via a sigmoid-gated residual (falls back to base dynamics when c_t is uninformative). A lightweight projector f_ψ(z_t) is trained to reconstruct stop-gradient c_t, yielding a consistency loss L_cm that penalizes semantically incoherent latents. For pixel-free tasks, DINOv2 is replaced by a Masked State Autoencoder (ProprioGIRL) over W=16 proprioceptive steps with mask rate 0.4. (2) Trust-region bottleneck: the KL(q‖p) per-step drift Δ_t is constrained by E[Δ_t] ≤ δ_t; Lagrangian duality makes β_t the multiplier. δ_t is updated by Expected Information Gain (K=5 ensemble disagreement) minus a Relative Performance Loss; β_t is updated when drift exceeds δ_t. Full objective J_GIRL = J_I-ELBO − μ·L_cm with μ=0.1. Theory re-derives the value-gap bound via PDL + IPM, removing the (1−γ)^−2 factor of simulation-lemma bounds. A distilled student CNN (≈1.2M params) replaces DINOv2 after L_distill < 0.05 for deployment.

## Key Results
- DMC (8 tasks, 10 seeds, 3×10^6 steps): IQM 0.81 [0.77,0.84] vs DreamerV3 0.67, TD-MPC2 0.71; PI over DreamerV3 = 0.74.
- DFM(1000) reduced 38–61% on clean DMC tasks, 49–68% on distractor tasks, relative to DreamerV3.
- Adroit (ProprioGIRL, 3 tasks): IQM 0.63 vs DreamerV3 0.44 / TD-MPC2 0.58; DFM(500) −41% vs DreamerV3.
- Meta-World MT10: IQM 0.79 [0.75,0.83] vs DreamerV3 0.61, TD-MPC2 0.72; PI over TD-MPC2 = 0.65.
- Ablation: GIRL-VAE (capacity-matched 86M-param VAE) drops to 0.69 IQM (all 18) and 0.63 on distractor, showing gains are not capacity-driven.
- GIRL-Distill: 5.1% wall-clock overhead vs DreamerV3 (full GIRL: 30.1%), IQM 0.76 (Δ=0.02, p=0.14).

## Limitations
**Author-stated:**
- ≈30% wall-clock overhead for undistilled GIRL; ensemble alone costs 15.1%.
- DINOv2 grounding effective only for visual tasks; ProprioGIRL requires careful warm-starting.
- Trust-region δ_0 needs warm-start (empirical mean drift over first 10^4 steps).
- Evaluation limited to continuous-control/manipulation; discrete and partially observable domains untested.

**Observed:**
- Single author, single affiliation; no code release link beyond a GitHub handle; reproducibility hinges on Appendix hyperparams (Table 7 referenced but not shown in main text extracted).
- Figure 2 marked "placeholder" in extracted text — scaling curve may not be fully plotted.
- DINOv2 ViT-B/14 on 64×64 images gives only ~20 patches; semantic fidelity of CLS on low-res inputs is not validated.
- All comparisons rely on re-runs of DreamerV3/TD-MPC2 under the author's own protocol; no cross-lab replication.
- The theoretical bound's tightness constants are not empirically verified against measured drift.

## Open Questions & Gaps
- See gaps.md.

## Connections
- Related KB papers: DreamerV3 (cited Hafner 2023), TD-MPC2 (Hansen 2023), DINOv2 (Oquab 2024), MBPO (Janner 2019), rliable (Agarwal 2021).
- Seeds for direction: foundation-model priors for world models; information-bottleneck dual variables; drift metrics (DFM); MSAE grounding for proprioceptive control; hallucination control in embodied agents.
