# Gaps

- Corrective Action Synthesis assumes compounding errors can be covered by symmetric deviate-then-return trajectories at expert-average speed; velocity drift, orientation drift, or asymmetric recovery modes are untested.
- Consistency-Guided Filtering uses only the terminal synthesized frame via DINOv2 cosine similarity with an adaptive mean threshold; no mechanism catches mid-trajectory dynamic inconsistencies (e.g., implausible intermediate object velocities or contact forces) when the terminal frame happens to match.
- The 120° directional-cone constraint on v_d enforces alignment with the subsequent expert action, which may prune legitimate multi-modal recoveries in tasks where several valid trajectories exist.
- EAC-WM is post-trained per task with ~5 min human-collected Play Data plus 20 Task demos—cross-task/cross-embodiment transfer of the WM itself is unmeasured, so the "no human involvement" claim applies only to aggregation, not WM adaptation.
- Performance saturates at ~1500 synthetic samples with no diagnosis: is the bottleneck filter precision, WM fidelity, directional sampling coverage, or policy capacity (Gr00t N1.5)? Disentangling these would guide where to invest compute.
- No baseline against human-in-the-loop DAgger / HG-DAgger / CR-DAgger, so the efficiency-vs-quality trade-off of fully synthetic aggregation is not quantified.
- Deformable 6-DoF towel folding plateaus at 46.7%—what is the failure mode: WM hallucination on cloth dynamics, insufficient recovery direction diversity, or policy representation of fold-sequence state?
- Scaling to multi-finger dexterous hands is listed as future work but there is no preliminary evidence that Action2Image (designed for rigid eye-in-hand camera motion) extends to articulated finger kinematics.
- Filter quality is never measured against ground-truth hallucinations (no precision/recall on a held-out labeled set), so the claimed improvement from filtering (66.7%→96.7%) conflates filter accuracy with threshold choice.
- No reporting on compute cost / wall-clock time to synthesize 1500 recovery episodes on the Cosmos-Predict2.5 (2B) backbone, which matters for the "scalable" claim vs. human DAgger.
