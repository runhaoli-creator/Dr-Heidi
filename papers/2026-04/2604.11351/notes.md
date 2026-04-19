# WM-DAgger: Enabling Efficient Data Aggregation for Imitation Learning with World Models
arxiv: 2604.11351 | cs.RO | published 2026-04-13
authors: Anlan Yu, Zaishu Chen, Peili Song, Zhiqing Hong, Haotian Wang, et al.

## Problem
Behavioral cloning suffers from compounding errors: small policy deviations push the robot into OOD states where predictions worsen, causing failure. DAgger fixes this but requires continuous human correction, and prior generative alternatives (e.g., DMD) use single-frame diffusion that cannot model continuous physical dynamics, especially for deformable objects. The authors seek a scalable, human-free way to synthesize physically faithful OOD recovery data from few-shot demonstrations for an eye-in-hand manipulator.

## Method
WM-DAgger has three stages. (1) Train an Eye-in-hand Action-Conditioned World Model (EAC-WM) built on Cosmos-Predict2.5 (2B) via GE-Sim, using an Action2Image module that converts 6-DoF actions into dense per-pixel ray-origin/direction displacement tensors plus a broadcast gripper channel (R^{H×W×7}), post-trained with Rectified Flow on ~5 min Play Data (free exploration) plus 20 expert Task demos per task. (2) Corrective Action Synthesis: pick a pivot timestep m in an expert trajectory, sample a unit direction v_d whose angle with the next expert action is ≥120°, build a symmetric Deviation→Recovery trajectory of length 2k at expert average speed, and use EAC-WM to synthesize the corresponding frames; only the recovery half is kept. (3) Consistency-Guided Filtering: embed the real anchor frame I_m and terminal synthesized frame Î_{2k} with DINOv2, compute cosine similarity, and drop trajectories with below-average similarity (terminal frame treated as worst-case hallucination proxy). The aggregated dataset D ∪ D_virtual trains a Gr00t N1.5 VLA policy with action chunking under an MSE objective.

## Key Results
- Soft bag pushing (5-shot): 93.3% vs BC 26.7%, DMD 40.0%; (20-shot) 96.7% vs 30.0% / 56.7%
- Soft bag pushing (1-shot): 73.3% vs BC 6.7%, DMD 13.3%
- Pick-and-place: Seen 80–90% vs BC 6.7–13.3%; Unseen 63.3–76.7% vs BC 0–10%
- Ballot insertion: 73.3% vs BC 13.3%, DMD 26.7%
- Towel folding (6-DoF deformable): 46.7% vs BC 0.0%, DMD 10.0%
- Data scaling: 300→1500 synth samples lifts 46.7%→96.7%; saturates by 3000
- Ablations (20-shot bag): w/o Filter 66.7%, w/o Play Data 83.3%, w/o directional constraint 0.0%

## Limitations
**Author-stated:**
- Scaling to dexterous multi-finger hands is unresolved; high-DoF articulation is hard for the WM to synthesize consistently.

**Observed:**
- Evaluated only on an eye-in-hand UMI-style handheld-gripper setup with a single UR7e + Robotiq 2F-140; no third-person view or mobile base.
- WM backbone (Cosmos-Predict2.5 2B) is heavy; inference on L20 GPU, no latency/throughput numbers for data synthesis.
- Filtering uses only the terminal frame via DINOv2 cosine similarity with an adaptive mean threshold; no quantification of false-accept/reject rates.
- Only 30 trials per condition; no statistical significance reporting.
- Deviation direction is sampled uniformly with a 120° cone filter; no coverage analysis of the OOD manifold actually reached.
- Towel folding still plateaus at 46.7%, much lower than other tasks—deformable 6-DoF remains weak.
- No comparison against human-in-the-loop DAgger/HG-DAgger baselines—only BC and DMD.

## Open Questions & Gaps
- Recovery actions are hand-designed as symmetric deviate-then-return at expert average speed—does this cover realistic compounding-error states (e.g., velocity drift, orientation loss) that don't decompose symmetrically?
- Filtering relies solely on terminal-frame DINOv2 similarity; intermediate hallucinations that still land on a plausible terminal frame are undetected. What filter catches dynamic-consistency errors (e.g., implausible object velocities mid-trajectory)?
- The 120° directional constraint bakes in the expert's action direction; for tasks with multi-modal optimal solutions this could suppress legitimate recoveries.
- No test of whether EAC-WM transfers across tasks/embodiments without per-task Play+Task post-training; the ~5 min Play Data is still human-collected.
- Policy architecture is fixed at Gr00t N1.5—how does recovery-data benefit trade off against policy capacity (e.g., diffusion policy, ACT)?
- Saturation at 1500 samples unexplained: is this a filter-quality ceiling or a policy-capacity ceiling?

## Connections
- Related KB papers: (none yet identified in KB)
- Seeds for direction: world-model-driven DAgger, hallucination filtering, eye-in-hand imitation learning, deformable-object manipulation, action-to-pixel conditioning
