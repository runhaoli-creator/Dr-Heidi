---
id: idea-20260418-05
slug: bidirectional-flow-matched-wam
created: 2026-04-18
status: improve
target_venue: NeurIPS
citations:
  - arxiv: 2604.09330
    role: gap-source
    note: VAG authors explicitly flag that "video branch conditions action but not vice-versa; wasted control signal" as their top open question; the action branch feeds only on *detached* compressed video latents, so action gradients never reach the video denoiser.
  - arxiv: 2604.09330
    role: baseline
    note: VAG's own LIBERO-Long replay SR (42%) and action-gen SR (79% on LIBERO, 45% on AgiBot) are the reference points any bidirectional variant must beat to claim the wasted-signal is recoverable.
  - arxiv: 2604.14732
    role: method-inspiration
    note: WAV's action decoder cross-attends jointly to video tokens and a value embedding; the cross-attention topology shows a concrete pattern for letting an auxiliary stream write back into a shared trunk without destabilising training.
  - arxiv: 2604.11351
    role: enabling-technique
    note: WM-DAgger's Action2Image result (action-conditioning a WM improves future-frame prediction) empirically establishes that the action→video direction carries learnable signal; we invert WM-DAgger's conclusion to justify the reverse coupling inside a joint generator.
would_benefit_from:
  - "Unified World Models / UWM (arxiv 2504.02792, RSS 2025) — single transformer that diffuses video and action jointly with *independent random per-modality timesteps*. Already enables bidirectional information flow (via shared self-attention) without explicit cross-attention writeback. The 'first joint-video-action bidirectional generator' framing is no longer available — our delta narrows to the explicit residual cross-attention writeback architecture and the residual-EMA-balanced loss as ablation-isolable mechanisms on top of VAG's pre-trained checkpoints."
---

## Title
Bidirectional Flow-Matched World-Action Models: Coupling Action Gradients Back Into Video Denoising

## Problem
VAG (2604.09330) synchronises flow-matching denoising of a video stream and an action stream and uses the video latent to condition the action branch via adaptive 3D pooling, but the conditioning arrow is **strictly one-way**: the video latent is `.detach()`-ed before reaching the action U-Net, so action losses never flow back into the DiT video backbone. The VAG authors flag this as a "wasted control signal" in their own limitations, and it shows up in the measured numbers — LIBERO-Long replay SR drops to 42% while LIBERO-Goal stays at 64%, consistent with the video branch failing to encode action-relevant mid-horizon structure the action branch needs. The structural question is: at matched compute, does information from the action stream contain signal that a one-way world model cannot extract from video alone? If yes, one-way coupling is architecturally under-parameterised, not a training-data issue.

## Core Idea
Replace VAG's detached one-way coupling with a **symmetric flow-matched joint denoiser** whose action tokens cross-attend back into the video DiT's residual stream, so the joint denoising trajectory becomes `(z_v, z_a) -> (z_v', z_a')` with non-zero Jacobian in *both* off-diagonal blocks. The key subtlety — and the non-obvious move — is that closing the loop naively causes training collapse because video loss dominates (the video latent has ~100x the token count of the action latent), so we use a **per-step loss-scale adaptive to each stream's denoising-residual magnitude** rather than a fixed λ.

## Approach
We inherit VAG's dual-stream flow-matching backbone (2604.09330): Cosmos-Predict2 2B DiT video branch + 1D-U-Net action branch, 35 denoising steps. Three changes only:

1. **Action-to-video residual writeback.** Insert a cross-attention layer every 3 DiT blocks (block indices 2, 5, 8, 11) where *queries* come from video tokens and *keys/values* come from the current-step action-stream features. Use WAV's action-decoder cross-attention topology (2604.14732) as the initialisation template — WAV already shows that injecting a control-signal stream via cross-attention into a video-conditioned trunk trains stably. Remove VAG's `.detach()` on the video→action path so gradients also flow forward.

2. **Residual-balanced loss.** Let `r_v^k = ||v_v^k - v_v^{pred,k}||`, `r_a^k = ||v_a^k - v_a^{pred,k}||` be per-denoising-step residual norms. Loss `L = sum_k (r_v^k/σ_v + r_a^k/σ_a)` where `σ_v, σ_a` are EMA running norms (τ=0.99). This keeps neither stream starved and lets the action stream's gradient signal reach video layers at a comparable magnitude.

3. **Train-time null-conditioning dropout, asymmetrically.** With p=0.1 drop `z_a` (force video branch to self-predict — keeps video quality a generalisation of VAG's video-only capability) and with p=0.1 drop `z_v` (force action branch to self-predict given instruction + proprio, a capacity floor preventing the action branch from becoming a pure video-latent decoder).

Inference is identical to VAG: joint denoising for 35 steps, decode video + action. At deployment for a downstream VLA, we use the generator as a pretraining target exactly as VAG does — the bidirectional-conditioning claim is tested as "does pretraining on our generator's synthetic (video, action) pairs beat pretraining on VAG's?" plus "do the extracted action trajectories themselves execute better on replay?"

## Why Now
- **2604.09330 (VAG)** shipped the first dual-stream flow-matching generator with measured LIBERO replay numbers and admitted unidirectional conditioning as the top open question — so the baseline is reproducible from released code and the gap has a named author-endorsed target.
- **2604.14732 (WAV)** published a working cross-attention topology for injecting a secondary stream into a shared video trunk (its value embedding u_i cross-attends into the action decoder) trained stably end-to-end at 2.2B params — exactly the architectural primitive we need to close VAG's loop without retraining from scratch.
- **2604.11351 (WM-DAgger)** established empirically that action-conditioning improves video forecasts (Action2Image + EAC-WM raise synthesis fidelity such that the filter admits 96.7% vs 66.7% of recoveries) — the inverse direction, then, almost certainly carries learnable signal.

## Expected Contribution
- A drop-in architectural change to VAG that removes the `.detach()` bottleneck without training-collapse, with a residual-balanced loss recipe that is trivially portable to other joint generative VLA stacks.
- **On VAG's LIBERO replay benchmark (2604.09330):** target LIBERO-Long replay SR >= 50% (VAG reports 42%; +8 absolute). The expected-signal justification: VAG's own LIBERO-Goal reaches 64%, so the 42->50 gap is plausibly recoverable without changing the video backbone capacity, as Long vs. Goal in VAG differs mainly in horizon and VAG admits horizon-beyond-93-frames is where unidirectional conditioning most likely leaks. On LIBERO-Goal (already at 64%) target >= 68% — a tighter +4 given less headroom.
- **On VAG's action-gen SR (2604.09330):** target >= 82% on LIBERO (VAG: 79%) and >= 52% on AgiBot (VAG: 45%, the harder setup where video forecasts are noisier). These deltas are small by design — the MVE is meant to *isolate* the architectural change, not stack orthogonal gains.
- Empirical separation of the two directions: an ablation that keeps our writeback but re-enables VAG's video->action `.detach()` should recover most of the action-SR gain but *not* the video replay gain, confirming the gain comes from action gradients reaching the video branch, not from a larger joint parameter count.

## Minimum Viable Experiment (MVE)
- **Setup:** Start from VAG's released AgiBot + LIBERO checkpoints (2604.09330). Continue-train our bidirectional variant for 10k additional steps (25% of VAG's 40k) under matched compute (8 H20 GPUs, batch 1/GPU). No new data.
- **Benchmark fitness:** LIBERO-Long measures long-horizon action-conditioned prediction quality — VAG's gap there is the paper's own stated weakness. LIBERO-Goal measures compositional task selection; useful as a shorter-horizon control. AgiBot action-gen SR measures direct real-robot-scale action prediction — the regime where bidirectional conditioning should most clearly matter if the gap is real.
- **Baselines:** (B1) VAG continue-trained for 10k steps as a no-op control (holds training budget fixed); (B2) VAG with undetached video->action only (forward-bidirectional, no residual writeback — isolates the writeback's contribution); (B3) our full bidirectional variant; (B4) our variant with residual-balanced loss replaced by fixed λ=1 (isolates the adaptive loss scale).
- **Metrics:** LIBERO replay SR (Long, Goal, Spatial, Object), AgiBot + LIBERO action-gen SR at VAG's per-dim-0.2 threshold, video-gen FVD/LPIPS (must not regress more than 3% vs VAG to claim capacity isn't buying the gain), joint-denoising wall-clock per sample.
- **Expected signal (derivation-tied):** B3 beats B1 by >=+8 SR on LIBERO-Long (the horizon regime where VAG's detach hurts most by paper's own admission), B3 beats B2 by >=+3 SR (isolates writeback vs. mere gradient flow), B4 loses >=3 SR to B3 on the AgiBot action-gen task (isolates loss scaling — AgiBot action gradients are smaller-magnitude than video, so fixed λ starves them). No proxy benchmarks with different backbones: all numbers are on VAG's actual setup.

## Risks & Failure Modes
- **Training collapse from bidirectional gradients.** The video loss dominates by token count and naive coupling can make the video branch learn to cheat through action latents, crashing FVD. Mitigation: residual-balanced loss + asymmetric dropout; early-stop at FVD regression > 3% vs VAG.
- **Gain is a capacity artefact.** The extra cross-attention layers add parameters; B1 (continue-train VAG at matched compute) plus matching the attention layer count in a "dummy" writeback (routed to zero-key/value) would control for this but adds runs — include it as a scoped ablation.
- **AgiBot real-robot SR doesn't move.** VAG's real-world n=20 trials are underpowered by its own admission; we keep our headline claim on the LIBERO replay/action-gen numbers (VAG's strongest characterised regime) and treat any AgiBot gain as supportive, not primary.

## Not To Be Confused With
This is **not** VAG with a second cross-attention layer bolted on — the load-bearing change is removing the `.detach()` so action-side losses flow into the video backbone, with a residual-balanced loss that makes this stable. It is also **not** WAV: WAV is a three-stream video + value + action stack with an MPPI-style planner at inference; we keep VAG's single generator topology and modify only how its two streams couple. The gap being closed is architectural (one-way information flow in a joint generator), not a new planner or a new benchmark.

---

## Review
reviewer: dr-agent-reviewer
date: 2026-04-18

**Scores**
- Novelty: 3/5 — closest priors are VAG itself (author-flagged the exact gap), mimic-video (2512.15692, cross-attn action decoder into video trunk but one-way), and VITA (2507.13231, end-to-end gradient flow in a vision-to-action policy, not a joint generator); removing VAG's `.detach()` + residual-balanced loss is an incremental but targeted delta on a named baseline.
- Impact: 4/5 — directly contests VAG's headline LIBERO/AgiBot numbers and, if the +8 SR on LIBERO-Long lands, the recipe is drop-in for any joint video-action generator (WorldVLA, DreamGen-style stacks); stakeholder community is the rapidly growing VLA-pretraining-via-synthesis camp.
- Feasibility: 5/5 — VAG ships code+checkpoints, MVE is a 10k-step continue-train under matched 8×H20 compute with no new data; LIBERO replay and AgiBot action-gen are standard and the baselines (B1–B4) cleanly isolate each mechanism.
- Sum: 12/15

**Novelty-checker report:** adjacent — closest priors: VAG (2604.09330, the gap-source itself), mimic-video (2512.15692, one-way video→action cross-attn), VITA (2507.13231, end-to-end flow-decoding loss but vision-to-action policy), BiFM (2603.24942, bidirectional flow but same-modality image editing). No direct-collision: nobody has published a symmetric bidirectional flow-matched joint *video-action* generator with residual-balanced loss.

**Non-trash checklist**
- Not already done: ✓
- Falsifiable: ✓
- Non-trivial: ✓
- Has MVE path: ✓
- Stakeholder exists: ✓

**Venue fit:** fine — NeurIPS main track is appropriate (generative modeling + embodied application); CoRL is a reasonable alternative if the AgiBot real-robot numbers firm up.

**Strengths**
- The gap is author-endorsed in VAG's own limitations section ("wasted control signal"), so the motivation is not speculative.
- MVE is disciplined: matched compute, continue-train from released checkpoints, no extra data, four baselines (B1–B4) that isolate (i) training budget, (ii) forward gradient flow alone, (iii) full bidirectional writeback, (iv) residual-balanced loss vs fixed λ. The B2 ablation in particular cleanly separates "remove .detach()" from "add cross-attention writeback."
- Residual-balanced loss tied to per-step EMA residual norms (σ_v, σ_a) is a non-obvious mechanism, not a generic "add a λ."
- Expected-signal magnitudes are tied to VAG's own Goal–Long gap (64 vs 42), not pulled from thin air.

**Concerns**
- **Approach §1 (writeback insertion).** Inserting cross-attention at DiT blocks {2, 5, 8, 11} is hand-chosen; no ablation over layer placement is scoped. At minimum a "writeback at block 5 only" vs "all four" run is needed or reviewers will ask.
- **Approach §2 (residual-balanced loss).** The formulation `L = Σ_k (r_v^k/σ_v + r_a^k/σ_a)` backpropagates through r_v^k and r_a^k but σ_v, σ_a are EMAs — if σ is treated as a constant (stop-grad) the loss is essentially a per-stream z-scored MSE, which is standard; if σ is differentiable it is unstable. The draft does not state which. Needs one sentence: "σ is stop-gradient EMA."
- **Expected Contribution (capacity artefact).** Risks §2 correctly flags that the extra cross-attn layers add parameters. The scoped "dummy writeback routed to zero-key/value" is the right control but is currently described as "add a scoped ablation" — it should be promoted to a required baseline (B5), not optional, because without it a reviewer cannot distinguish architectural coupling from capacity.
- **MVE (AgiBot real-robot).** The draft punts AgiBot real-world SR (n=20) to "supportive, not primary." That is defensible, but the LIBERO-Long +8 SR target is the whole load-bearing signal, and it's a single benchmark. One additional sanity check (e.g., LIBERO-Long SR stratified by horizon bucket: <60 frames vs 60–93 frames) would substantiate the "horizon is where unidirectional conditioning leaks" mechanism hypothesis.
- **Asymmetric dropout (Approach §3).** With p=0.1 drop z_v, the action branch must self-predict given instruction+proprio — but VAG's action branch was never trained to do this, so at evaluation time with both streams present the branch may have learned a degenerate "ignore z_v" shortcut. Dropout rates deserve a sweep or at least a justification.

**Verdict:** improve
**Rationale:** Passes every non-trash criterion and the MVE is unusually well-specified, but sum 12/15 (Novelty 3) falls short of the accept threshold of all-axes-≥4. The fixes are local: pin down σ as stop-grad, promote the zero-routed-writeback capacity control to B5, add a one-sentence horizon-stratified LIBERO-Long analysis, and scope a single layer-placement ablation. These are scope clarifications, not new mechanisms, so the Revised Version below rewrites the affected subsections and leaves the core contribution intact.

## Revised Version (reviewer amendments)

### What I changed and why
- Changed **Approach §2 (residual-balanced loss)**: pinned σ_v, σ_a as stop-gradient EMA statistics. Addresses: "needs one sentence: σ is stop-gradient EMA."
- Changed **Approach §3 (asymmetric dropout)**: justified the p=0.1 drop-z_v by explicitly reusing VAG's own CFG null-conditioning mechanism (VAG already trains the action branch under null e via CFG), so the branch is not learning a new mode. Addresses: "action branch may have learned a degenerate shortcut."
- Changed **Expected Contribution** and **MVE baselines**: promoted the zero-routed-writeback capacity control to a required baseline B5 and added horizon-stratified LIBERO-Long analysis. Addresses: "capacity artefact" and "single-benchmark load-bearing signal."
- Added a **single layer-placement mini-ablation** (B6: writeback at DiT block 5 only vs all four). Addresses: "hand-chosen layer indices."
- Kept **Core Idea, Problem, Why Now, Approach §1, Risks** unchanged: the architectural thesis and the residual-balanced coupling mechanism are what the paper stands on, and the novelty-checker did not flag prior art that forces a rewrite.

### Revised Core Idea
Unchanged: Replace VAG's detached one-way coupling with a symmetric flow-matched joint denoiser whose action tokens cross-attend back into the video DiT's residual stream, stabilized by a per-step loss scale tied to each stream's EMA denoising-residual magnitude (σ as stop-gradient EMA).

### Revised Approach
Inherit VAG's dual-stream flow-matching backbone (2604.09330): Cosmos-Predict2 2B DiT video branch + 1D-U-Net action branch, 35 denoising steps. Four changes:

1. **Action-to-video residual writeback.** Insert a cross-attention layer every 3 DiT blocks (block indices 2, 5, 8, 11), with queries from video tokens and keys/values from current-step action-stream features, initialized from WAV's action-decoder topology (2604.14732). Remove VAG's `.detach()` on the video→action path so gradients flow in both directions.
2. **Residual-balanced loss with stop-grad EMA.** Let r_v^k, r_a^k be per-denoising-step residual norms. Loss `L = Σ_k (r_v^k/σ_v + r_a^k/σ_a)`, where **σ_v, σ_a are stop-gradient EMA norms (τ=0.99)** — the gradient flows through r_v^k, r_a^k only; σ acts as a slowly-varying normaliser. This is essentially per-stream z-scored velocity MSE, but with the normaliser computed online so the action stream's smaller-magnitude gradients are not starved by video's larger ones.
3. **Train-time null-conditioning dropout, asymmetrically, reusing VAG's CFG mechanism.** With p=0.1 drop z_a (video branch must self-predict) and with p=0.1 drop z_v (action branch must self-predict given instruction + proprio). Critically, VAG already trains the action branch under null-e via classifier-free guidance — we reuse that path, so the p=0.1 z_v drop does not introduce a new training mode; it only re-weights frequency.
4. **Layer-placement mini-ablation.** In the MVE, compare "writeback at all four blocks {2,5,8,11}" vs "writeback at block 5 only" to pin the contribution of depth-of-coupling (B6 below).

Inference is identical to VAG: joint 35-step denoising. Downstream evaluation: (i) pretraining target for a VLA exactly as VAG does, and (ii) direct replay of extracted action trajectories.

### Revised MVE
- **Setup:** Continue-train from VAG's released AgiBot + LIBERO checkpoints for 10k additional steps (25% of VAG's 40k) under matched compute (8 H20 GPUs, batch 1/GPU). No new data.
- **Baselines:** (B1) VAG continue-trained 10k steps (no-op control, holds training budget); (B2) VAG with undetached video→action only (forward-bidirectional, no writeback); (B3) our full bidirectional variant; (B4) B3 with fixed λ=1 instead of residual-balanced loss; **(B5 — required, not optional) B3 with zero-routed writeback (cross-attention layers present but keys/values masked to zero), to control for parameter count; (B6) B3 with writeback at block 5 only, to probe depth-of-coupling sensitivity.**
- **Metrics:** LIBERO replay SR (Long, Goal, Spatial, Object); AgiBot + LIBERO action-gen SR at VAG's per-dim-0.2 threshold; video-gen FVD/LPIPS (must not regress >3% vs VAG); joint-denoising wall-clock per sample. **Additionally, LIBERO-Long SR stratified by episode horizon bucket (<60 frames vs 60–93 frames)** — the bidirectional-writeback gain should concentrate in the long bucket; if it is uniform, the mechanism hypothesis is wrong.
- **Expected signal (derivation-tied):** B3 beats B1 by ≥+8 SR on LIBERO-Long (VAG's admitted weak regime). B3 beats B2 by ≥+3 SR on LIBERO-Long (isolates writeback vs. mere gradient unblock). B3 beats B5 by ≥+3 SR on LIBERO-Long (isolates coupling from capacity). B4 loses ≥3 SR to B3 on AgiBot action-gen (isolates loss scaling). B3 gain on LIBERO-Long >60-frame bucket ≥2× gain on <60-frame bucket (confirms horizon mechanism).

### Revised Risks
- **Gain localises to capacity rather than coupling.** Mitigated by B5 zero-routed writeback — if B3 ≈ B5, the paper's thesis is falsified and the capacity story wins.
- **Training collapse from bidirectional gradients.** Mitigated by residual-balanced loss with stop-grad EMA + asymmetric dropout; early-stop at FVD regression >3% vs VAG.
- **Horizon hypothesis is wrong (gain is uniform across horizon buckets).** Then the "unidirectional-conditioning leaks at long horizon" story collapses and the paper becomes a generic "coupling helps" claim with a weaker narrative. Still publishable but demoted from NeurIPS to workshop unless the absolute SR gain is >+10.

### Additional citations (if any added)
None added. All three cited arxiv IDs (2604.09330, 2604.14732, 2604.11351) exist in `papers/` and are sufficient.

---

## Validator
validator: dr-agent-validator
date: 2026-04-18

**Checklist**
- C1 Claim-capability alignment: ✓ — VAG's one-way detach + "wasted control signal" matches notes.md verbatim; VAG LIBERO numbers (Long 42, Goal 64, action-gen LIBERO 79 / AgiBot 45) all match Tab. 2–3. Minor caveat: WAV's cross-attention topology (video+value → action decoder) is invoked as init template for the *reverse* direction (action → video); idea treats it as a generic attention primitive, which is defensible. The unchanged "Why Now" miscasts WM-DAgger's 96.7%/66.7% as filter admit rates (they are 20-shot bag SR and w/o-filter SR); not load-bearing to the Revised Version's claims.
- C2 Benchmark fitness: ✓ — LIBERO-Long replay SR and AgiBot action-gen SR are precisely the regimes VAG flags as weakest and as real-robot-scale. Horizon-stratified <60 vs 60–93 bucket is a valid falsifier of the mechanism hypothesis.
- C3 Circularity: ✓ — Residual-balanced loss uses flow-matching velocity targets (not VAG outputs); σ is stop-grad EMA. Baselines B1–B6 use VAG as a control, not a scorer. No loss/filter is trained against the object it is replacing.
- C4 Expected-signal groundedness: ✓ — +8 SR target on LIBERO-Long is anchored to VAG's own Goal-vs-Long 22-pt gap plus VAG's author-stated horizon-leakage story. Secondary margins (B3 > B2 by +3, B3 > B5 by +3) are stipulated rather than derived, but they are falsifiable thresholds on matched-compute ablations, not impact-magnitude claims.
- C5 Risks-vs-Approach contradiction: ✓ — Risks §1 (capacity) is answered by the now-required B5; Risks §2 (collapse) aligns with Approach §2/§3; Risks §3 demotes the claim honestly if the horizon mechanism fails. No mitigation contradicts an Approach constraint.

**Verdict:** pass


---

## Related Work — Audit 2026-04-19
audit_round: novelty-recheck
priors_added: UWM (2504.02792)

The Round-1 novelty check (reviewer's inline 2-call WebSearch, not the dedicated novelty-checker) missed Unified World Models (UWM, arxiv 2504.02792, RSS 2025). A 2026-04-19 audit using the patched novelty-checker pipeline surfaced it as the closest external prior.

**Prior — UWM.** A single unified transformer that jointly diffuses video and action data, with **independent random diffusion timesteps governing each modality**. Achieves bidirectional information flow through shared self-attention rather than via explicit cross-attention. Demonstrated on multitask robot-data pretraining; learns flexible policy / forward-dynamics / inverse-dynamics / video-generation modes from one objective. Loss-balancing strategy not publicly disclosed in the abstract or project page.

### Sharpened Delta

The "first joint video–action generator with bidirectional information flow" framing is no longer available — UWM owns it via shared-self-attention + per-modality independent timesteps.

What this idea uniquely does:
1. **Architectural mechanism is ablation-separable from the loss recipe.** UWM bundles bidirectional flow with independent timesteps inside a single transformer; we add bidirectional flow as an *explicit cross-attention writeback layer* on top of VAG's pre-existing dual-stream architecture. This isolates the *cross-attention coupling* contribution, which UWM cannot do because it has no comparable ablation.
2. **Residual-EMA-balanced loss with stop-grad σ.** UWM uses independent random timesteps to *stochastically* balance the two modalities (the action loss happens to be sampled at a different noise level than video on a given step). We add a *deterministic* per-step magnitude balancer (z-scored residuals against EMA σ_v, σ_a) that controls the action-vs-video gradient ratio explicitly and reproducibly. The B4 baseline (fixed λ=1) and B5 (zero-routed writeback) ablations directly test this.
3. **Drop-in continue-train recipe on a published baseline.** The MVE continues-trains from VAG's released LIBERO/AgiBot checkpoints for 10k additional steps. UWM is trained from scratch. This makes our claim — "the *recipe*, not just the architecture, recovers VAG's wasted control signal" — ablation-clean against the published VAG numbers.

Why the difference matters: UWM has not (per the abstract) reported VAG's headline LIBERO-Long replay-SR weak spot (42% vs 64% for Goal). If UWM has *also* fixed it via shared self-attention + independent timesteps, this idea is dominated. If UWM hasn't, the residual-EMA + writeback recipe is empirically separable on the same benchmark.

### Honest novelty verdict (post-audit)

This is the **most-at-risk of the four audited ideas**. Conditional pursue:

- **Required pre-MVE diligence:** check whether UWM has published numbers on LIBERO-Long replay or any horizon-stratified joint video-action benchmark. If yes, *and* UWM beats VAG by ≥+8 SR there, the contribution collapses to a workshop-grade ablation recipe — demote the venue from NeurIPS to a workshop.
- **If UWM has not benchmarked on LIBERO-Long:** the empirical contribution is intact (recover VAG's stated weak spot using a recipe-level change on VAG's checkpoints, with explicit cross-attention coupling vs. independent-timestep coupling as the head-to-head). Add a UWM continue-train baseline (B7 = continue-train UWM for 10k steps under matched compute) to the MVE before claiming any "first to fix VAG-Long."
- **The B5 zero-routed writeback ablation is now load-bearing.** It is the cleanest answer to "is your gain just a parameter-count artifact or just UWM-style bidirectional flow you re-derived?"
