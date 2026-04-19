# 3D-Anchored Lookahead Planning for Persistent Robotic Scene Memory via World-Model-Based MCTS
arxiv: 2604.11302 | cs.RO | published 2026-04-13
authors: Bronislav Sidik, Dror Mizrahi

## Problem
Reactive VLA policies map the current camera frame to actions and lack object permanence: once a target is occluded, they cannot recall its location and fail on multi-step tasks that require returning to previously seen positions. The authors frame this as an architectural, not capacity, limitation of System-1 controllers.

## Method
3D-Anchored Lookahead Planning (3D-ALP) is a test-time, training-free System-2 planner with four components: (1) a Kinematic Bridge that maintains a persistent camera-to-world SE(3) anchor updated by forward kinematics after each real action (c2w_{t+1} = FK(q_{t+1})); (2) a 3D-consistent generative world model (InSpatio-WorldFM) used as the MCTS rollout oracle, rendering predicted frames for any queried c2w; (3) a Hybrid Geometric-Semantic Scorer that multiplies a VLM semantic score (Florence-2) by a kinematic-depth penalty max(0, 1 - d_3D) to correct VLM depth blindness; and (4) a UCT-MCTS engine with four fixes for continuous manipulation: Max-Q child selection (F1 stutter), recursive depth reset after re-rooting (F2 depth decay), Max-MCTS backup (F3 averaging dilution), and recalibrated exploration c=0.02 matched to continuous score scale ~0.01-0.05 (F4). After each physical execution, the world-model reference latent is blended z_ref <- 0.7 Enc(I_real) + 0.3 z_ref (α=0.7 from line search in [0.5,0.9]) to prevent anchor drift, and the MCTS tree is re-rooted, preserving Q-values of prior c2w positions including now-occluded targets.

## Key Results
- E3 5-step sequential-reach memory task (30 ep, 3 seeds): Memory SR (steps 4-5) 3D-ALP D=2 = 0.650 ± 0.109 vs Greedy = 0.006 ± 0.008 (Δ=+0.645); p<0.001.
- Step 5 (chained memory) SR: 3D-ALP = 0.822 vs Greedy = 0.000.
- Ablation attribution: MCTS D=1 alone gives Memory SR 0.539 (+0.533, 82% of gain); D=2 adds +0.111 (17%), concentrated on step 5 (0.622 -> 0.822).
- Non-memory SR: Greedy 0.748 > MCTS D=1 0.389 / 3D-ALP 0.463 — MCTS underperforms on directly-visible steps.
- Phase 0 geometric consistency: SSIM=1.000, ORB 391/391 matches; Phase 1 bridge angular error 0.00°, latency 0.5 ms.
- Render cost: InSpatio-WorldFM ~2400 ms/frame on RTX A6000; 4-GPU parallelism ~600 ms. With 2 s budget only ~5 nodes/cycle vs D=2,B=4 theoretical 20.

## Limitations
**Author-stated:**
- Off-the-shelf VLM (Florence-2) returns flat ~0 scores on synthetic generated frames, collapsing UCB1 to pure exploration; full visual pipeline was bypassed with a geometric oracle for E3.
- Render bottleneck (~2.4 s/frame) caps search breadth/depth well below theoretical capacity.
- All experiments in MuJoCo — no real-robot validation.
- Single-robot; multi-robot shared-anchor coordination left to future work.
- α=0.7 blend chosen by manual line search, not principled optimisation.

**Observed:**
- Non-memory SR drops ~0.29 under MCTS vs greedy, suggesting the planner sacrifices single-step precision; no explanation or mitigation.
- Only one task (5-step reach in one workspace) and one simulator; generalisation across tasks/scenes untested.
- B=4, D=2, 10 actions/step and 2 s budget are fixed; no sensitivity analysis beyond D.
- 3D anchor assumes accurate robot kinematics and static scene — untested under moving objects, dynamic occluders, or calibration error.
- "Identical geometric information" comparison uses a pure geometric oracle (S_semantic≡1), so E3 results do not test the full perception pipeline.
- Only 2 authors, industry venue, no code release stated.

## Open Questions & Gaps
- How does 3D-ALP degrade when kinematic/camera calibration is noisy, since the anchor is a deterministic FK update with no belief uncertainty?
- Does persistent 3D memory survive non-static scenes where objects move while occluded (the key assumption of "lossless spatial memory")?
- What replaces the geometric oracle in practice? Latent JEPA scoring (LeWM/DINOv2) and depth-augmented scorers are proposed but not evaluated.
- Can MCTS precision on non-memory steps be recovered (hybrid System-1/System-2 switching) so the planner is not strictly worse on visible targets?
- Does the approach scale beyond reach to contact-rich manipulation where rewards are not monotone in Euclidean d_3D?

## Connections
- Related KB papers: 2603.19312 (LeWorldModel), 2603.11911 (InSpatio-WorldFM), 2509.22643 (VLA-Reasoner), 2411.04983 (DINO-WM), 2602.12099 (GigaBrain-0.5M*)
- Seeds for direction: world-models-as-test-time-oracle, MCTS+SE(3) anchors, POMDP belief via kinematics, JEPA reward shaping, VLM depth-blindness
