---
id: idea-20260418-01
slug: risk-aware-particle-planner-for-wam
created: 2026-04-18
status: accepted
target_venue: NeurIPS
citations:
  - arxiv: 2604.14732
    role: method-inspiration
    note: WAV's implicit latent MPPI planner with Gaussian refit and SNR scoring; explicit motivation and direct baseline.
  - arxiv: 2604.14732
    role: gap-source
    note: Authors flag Gaussian refit as unable to cover multimodal elite manifolds and SNR as unablated heuristic (gaps.md).
  - arxiv: 2604.07426
    role: enabling-technique
    note: GIRL's K=5 ensemble with Expected Information Gain provides the variance-calibrated value posterior needed for CVaR scoring.
  - arxiv: 2604.11135
    role: baseline
    note: AIM's spatial value map provides a second, spatially grounded value signal to cross-validate the particle selection rule.
would_benefit_from:
  - "SVG-MPPI (arxiv 2309.11040, ICRA 2024) — Stein Variational Guided MPPI for vehicle control. Already publishes the SVGD-rescues-multimodal-elites-from-Gaussian-collapse story in raw vehicle action space, and forces our delta to land elsewhere (latent-WM substrate + ensemble-CVaR risk scoring)."
  - "DRA-MPPI / Dynamic Risk-Aware MPPI (arxiv 2506.21205, 2025) — CVaR-based risk-aware MPPI with non-Gaussian uncertainty for crowd navigation. CVaR-inside-MPPI is therefore prior art; our delta is CVaR over an *epistemic ensemble* (not aleatoric crowd uncertainty) and inside a *learned latent video-WM subspace* (not state-space)."
  - "Q-STAC (arxiv 2507.06625, 2025) — SVGD particles guided by a learned Q-function (actor-critic), raw action space, no CVaR or ensemble. Establishes SVGD+learned-value as a primitive; we add the risk-aware ensemble objective and the latent-video substrate."
---

## Title
Risk-Aware Particle Planning in the Latent Space of World-Action Models

## Problem
WAV (2604.14732) plans by iteratively refitting a **Gaussian** over latent video-noise samples to the top-K elites under an SNR = E[v]/Std[v] score. Two failure modes are explicit in the paper's own gap register: (i) when the feasible-trajectory manifold is **multimodal** (e.g., two viable grasp strategies), a single Gaussian averages across modes and the mean collapses into an infeasible region; (ii) SNR is a heuristic choice never compared against mean, quantile, or CVaR scorers, and it conflates "high expected return" with "low value uncertainty." Both failures show up on LIBERO-Long (SR drops 1.7 pts on the planning ablation, largest delta among suites) and are likely to worsen under real-world distribution shift, but WAV has no mechanism to represent plan multimodality or to separate epistemic-value-uncertainty from aleatoric-return-variance.

## Core Idea
Replace the Gaussian-over-latents + SNR-elite loop in WAV with a **Stein Variational Particle** planner whose scoring rule is the **lower-tail CVaR of a deep-ensemble value posterior**. Particles preserve multimodal elite structure by construction (a repulsive kernel prevents mode collapse); CVaR on an ensemble disentangles the two distinct reasons a plan could be bad — *model believes return is low* (aleatoric) vs. *model is uncertain about return* (epistemic) — and penalizes the second explicitly.

## Approach
Starting from a frozen WAV-trained video generator W and value head V (2604.14732), we replace Algorithm 1 (the MPPI-style latent planner) with:

1. **Particle cloud in video-noise latent space.** Initialize M=64 particles {x^(i)} from N(0, I) in the same latent dimension WAV uses.
2. **Ensemble value head.** Train K=5 value decoders {V_k} jointly on WAV's value-flow-matching objective using the GIRL recipe (2604.07426) — shared encoder trunk, independent denoising heads with different initializations. No extra data; just heads.
3. **CVaR-at-α scoring.** For each particle x^(i), roll W(x^(i)) through all K heads to obtain K return samples; compute `r(x^(i)) = CVaR_α({V_k})` with α=0.2. This down-weights latents whose value distribution has a heavy lower tail (epistemic risk) without needing explicit ensemble-disagreement penalties.
4. **Stein update.** Update particles by one step of SVGD: `x^(i) ← x^(i) + η [Σ_j k(x^(j), x^(i)) ∇r(x^(j)) + ∇_{x^(j)} k(x^(j), x^(i))]`, where k is an RBF kernel on the latent. The repulsion term is the mechanism that preserves multiple modes; the attraction term drives particles toward high-CVaR regions.
5. **Cross-check with spatial value maps.** Borrowing AIM's ASVM (2604.11135), project the particle's predicted future frame through a pretrained ASVM head and discard particles whose predicted end-effector target lies outside the high-response region of the ASVM — a cheap, spatially-grounded feasibility veto independent of V.
6. Repeat for K_iter=3 iterations matching WAV's inference schedule; decode actions from the final top-1 particle.

Training cost is just the ensemble of V heads (≤8% parameter overhead per GIRL's distilled variant). Inference cost is linear in K (≈5× per-step vs. WAV), but M and K_iter can be cut because particles do not need to re-estimate a Gaussian.

## Why Now
- 2604.14732 published the first implicit-planning result for VLA and, crucially, documented the Gaussian/SNR assumption as an open gap — so the target is well-defined, the baseline is reproducible, and the KB already grades it as the state of the art on LIBERO.
- 2604.07426 gave a working recipe for calibrating value posteriors via a K=5 ensemble whose EIG signal tracks true model disagreement, and showed ~15% compute cost for the ensemble — making deep-ensemble-based CVaR tractable exactly in the regime WAV operates.
- 2604.11135 established that dense spatial value maps can be emitted by a WAM backbone with negligible added cost, providing the second-source grounding signal our particle veto needs.

## Expected Contribution
- A latent-space planner for WAMs that (1) preserves multimodal elite structure via Stein repulsion and (2) scores under risk-aware CVaR of an ensemble value posterior, dropping the Gaussian/SNR coupling.
- On LIBERO-Long, target ≥+2.0 SR over WAV (currently 94.4) with equal K_iter; on a new **multimodal-grasp stress split** (bimodal expert demos with two equally valid grasp strategies) target ≥+10 SR.
- Empirical separation of epistemic vs. aleatoric contributions to planning failure — CVaR with a single-head V should *not* recover the gain, isolating the ensemble's role.

## Minimum Viable Experiment (MVE)
- **Setup:** reproduce WAV on LIBERO-Long (public weights) + construct a 20-task "TwoGrasp" variant by demonstrating two distinct grasp strategies per task in equal proportion.
- **Variants:** WAV (Gaussian/SNR) | WAV + CVaR-ensemble (no particles) | WAV + particles (Gaussian init, mean scoring) | Full (Stein + CVaR + ASVM veto).
- **Metrics:** SR on standard LIBERO-Long + SR on TwoGrasp + mode-coverage rate (fraction of episodes across seeds covering both grasp strategies) + inference wall-clock.
- **Expected signal:** ≥+2 SR on LIBERO-Long and ≥+10 SR on TwoGrasp, with mode-coverage rising from ~0.5 (single-mode collapse) to ≥0.9 for the full variant. The three ablations should each capture a distinct piece of the gain, isolating Stein repulsion vs. CVaR vs. spatial veto.

## Risks & Failure Modes
- **SVGD in high-dim latent space is unstable.** Video-noise latents are thousands of dimensions; the RBF kernel degenerates and repulsion signal vanishes. Mitigation: project to the AdaPool-compressed embedding used by VAG (2604.09330) before computing the kernel.
- **Ensemble captures nuisance variance rather than return risk.** If the K heads differ mainly in unrelated attention pathways, CVaR becomes a noise penalty and hurts SR. Mitigation: GIRL-style EIG-adaptive head weighting and a held-out calibration split to verify CVaR correlates with true return quantiles.
- **ASVM veto disagrees with V too often on novel objects.** Mitigation: use veto as a *soft* penalty (reweight particles) rather than a hard cut, with the veto weight λ tuned on a validation set.

## Not To Be Confused With
This is not "add an ensemble to WAV" — the representation change (particles in place of Gaussian) is load-bearing and orthogonal to the ensemble; and it is not AIM's ASVM interface reused — the ASVM here serves only as an independent feasibility vote, not as the primary value signal for action decoding.

---

## Review
reviewer: dr-agent-reviewer
date: 2026-04-18

**Scores**
- Novelty: 4/5 — SVGD and CVaR are each known, but their joint use as a drop-in replacement for WAV's Gaussian/SNR loop targeting a specific flagged gap is a genuinely new formulation.
- Impact: 4/5 — WAV is the current SOTA on LIBERO and the Gaussian/SNR choice is its most cited open question; a principled multimodal-plan story plus the TwoGrasp stress split would be broadly cited across VLA/WAM work.
- Feasibility: 3/5 — WAV weights, LIBERO, and GIRL-style ensembles are accessible, but SVGD in thousands-dim video-noise latents is a well-known failure regime and the proposed "project via VAG AdaPool" mitigation is under-specified — AdaPool is lossy and non-invertible, so how the SVGD update is lifted back into the full latent is not said.
- Sum: 11/15

**Venue fit:** fine (NeurIPS); CoRL is also a strong fit given the LIBERO + real-robot arc.

**Strengths**
- Targets two gaps that WAV's own notes.md explicitly flags (multimodal elite manifold, SNR-unablated), not a manufactured gap.
- MVE ablation grid (WAV | +CVaR only | +particles only | Full) cleanly isolates each of the three mechanisms; the "CVaR with single head should not recover the gain" prediction is genuinely falsifiable.
- TwoGrasp stress split is a reusable artifact that would outlive the paper.
- Parameter/compute overhead is quantified (≤8% params, ~5× inference step) using numbers from the cited KB entries, not invented.

**Concerns**
- **Approach §1/§4 — SVGD scalability.** Video-noise latents in WAV are per-view per-frame and easily >10^4 dim; RBF-kernel SVGD is known to degenerate above ~10^3 dim (kernel bandwidth collapses, repulsion vanishes). The proposed "project through AdaPool" mitigation is a one-liner in the Risks section but is structurally the hardest part — AdaPool is lossy, so computing SVGD in the compressed space and lifting back is ambiguous. This needs to be first-class in the Approach, not a footnote.
- **Approach §3 — CVaR α choice.** α=0.2 with K=5 heads means CVaR is effectively "the worst 1 of 5" — extremely noisy at that ensemble size. Either K must grow or α must be chosen with an estimator-variance argument.
- **Approach §5 — ASVM veto scope.** ASVM (2604.11135) is trained for single-arm pick-and-place on TableTop; applying it to LIBERO-Long (multi-stage, cluttered) as a feasibility gate risks introducing a domain-shift bug that masquerades as a planner ablation. The "soft penalty" fallback in Risks helps but the Approach should say when the veto fires and when it is disabled.
- **MVE — TwoGrasp construction cost.** 20 tasks × 2 strategies × enough demos to train is non-trivial; the idea should specify demo count per strategy or propose reusing an existing multimodal benchmark (e.g., PushT variants) as a cheaper proxy first.

**Verdict:** improve
**Rationale:** The target, baseline, and ablation design are all crisp and the gap being attacked is exactly the one the load-bearing citation admits to. The feasibility of SVGD in WAV's raw latent space is the single load-bearing technical risk and the current write-up treats it as an afterthought; making the compressed-latent planner first-class (rather than a mitigation) fixes this without changing the core contribution.

## Revised Version (reviewer amendments)

### What I changed and why
- Changed Approach §1 and §4: moved SVGD into an explicitly defined low-dim planning subspace, not as a fallback — addresses: "SVGD scalability / AdaPool non-invertibility as a footnote."
- Changed Approach §3: tied α and K together via an estimator-variance budget — addresses: "α=0.2 with K=5 is worst-of-5 and noisy."
- Changed Approach §5: scoped ASVM veto to only the in-distribution suites and downgraded to a soft reweight by default — addresses: "ASVM domain shift may masquerade as a planner ablation."
- Changed MVE: added a cheap proxy benchmark before TwoGrasp and specified demo budget — addresses: "TwoGrasp cost unbounded."
- Kept Core Idea and Why Now: the central story (particles + risk-aware CVaR ensemble against WAV's Gaussian/SNR) is correct and well-motivated.

### Revised Core Idea
Replace WAV's Gaussian-over-full-latents + SNR-elite loop with a Stein Variational Particle planner operating in a **learned low-dimensional planning subspace** of the video-noise latent, scored by the **lower-tail CVaR of a deep-ensemble value posterior** — the subspace makes the kernel repulsion numerically well-posed, and CVaR on the ensemble separates "model thinks this is bad" from "model is not sure."

### Revised Approach
Starting from frozen WAV weights (2604.14732):
1. **Learn a planning subspace.** Train a lightweight encoder E: latent → R^d (d=64) and decoder D: R^d → latent by reconstruction + a *planning-consistency* loss (value and decoded actions match the full-latent counterparts on a held-out calibration split). All particle dynamics happen in R^d; decoding to the full latent is via D, making the lift well-defined rather than relying on AdaPool inversion.
2. **Particle cloud in R^d.** M=64 particles from N(0, I_d).
3. **Ensemble value head.** K=5 GIRL-style value decoders (2604.07426) on the shared WAV trunk.
4. **CVaR scoring with variance-aware α.** For each particle x^(i), roll D(x^(i)) through W and all K heads to get K return samples; use CVaR_α where α is set so that α·K ≥ 2 (so CVaR averages at least the worst two ensemble members — with K=5 this means α ≥ 0.4). For tighter risk aversion, grow K to 10 at ~25% extra train cost.
5. **SVGD step in R^d.** Standard RBF-SVGD with median-heuristic bandwidth — numerically stable at d=64.
6. **Optional spatial feasibility reweight.** On LIBERO suites whose scene distribution overlaps AIM's training domain (2604.11135), use ASVM response as a soft multiplicative reweight w^(i) ∈ [0.5, 1.0] on the CVaR score. On LIBERO-Long and TwoGrasp, disable the veto by default; report both conditions.
7. K_iter=3 iterations; decode actions from top-1 particle through D then the frozen WAV action head.

### Revised MVE
- **Proxy first:** reproduce WAV on a 2D-toy multimodal planning benchmark (e.g., bimodal-reward MPC in a 64-dim latent synthesized from a frozen video autoencoder on BAIR pushing) to validate Stein+CVaR vs. Gaussian/SNR mechanistically with ≤1 GPU-day.
- **Main:** reproduce WAV on LIBERO-Long (public weights); construct a 10-task TwoGrasp subset with 40 demos per strategy per task (≈800 demos total — within a two-week collection budget on existing LIBERO rigs).
- **Variants:** WAV (Gaussian/SNR) | WAV + CVaR-ensemble in full latent | WAV + particles in R^d (Gaussian init, mean scoring) | Full (Stein in R^d + CVaR + optional ASVM reweight).
- **Metrics:** SR on LIBERO-Long; SR on TwoGrasp; mode-coverage rate; CVaR-vs-true-return calibration (ECE on held-out rollouts); inference wall-clock.
- **Expected signal:** proxy — Stein+CVaR recovers both modes in ≥90% of runs vs. ≤30% for Gaussian/SNR. Main — ≥+1.5 SR on LIBERO-Long (tighter than original +2 claim given honest compute parity) and ≥+8 SR on TwoGrasp with mode-coverage ≥0.85 for the full variant.

### Revised Risks
- **Planning subspace under-fits multimodality.** If the d=64 encoder collapses the two grasp modes at training time, no downstream planner can recover them. Mitigation: audit mode-preservation on TwoGrasp demos before training the planner; grow d if the two grasp trajectories encode to overlapping clusters.
- **Ensemble captures nuisance variance rather than return risk.** Same as original — GIRL EIG-adaptive weighting + held-out calibration.
- **CVaR-with-K=5 is estimator-noisy at small α.** Forced α·K ≥ 2 constraint above; fall back to K=10 if ECE calibration fails on the held-out split.
- **ASVM veto disagrees with V on novel objects.** Scoped out on LIBERO-Long by default in the revised Approach; reported as an ablation rather than in the headline number.

---

## Validator
validator: dr-agent-validator
date: 2026-04-18

**Checklist**
- C1 Claim-capability alignment: ✓ — WAV (Gaussian/SNR MPPI, K=3), GIRL (K=5 ensemble, ~15% compute), AIM (ASVM) all match notes.md; AIM scoped to in-distribution in revised §6 respects its single-arm tabletop training domain.
- C2 Benchmark fitness: ✗ — Revised MVE "proxy" says "reproduce WAV on a 2D-toy… in a 64-dim latent synthesized from a frozen video autoencoder on BAIR pushing." WAV is defined on its own multi-view flow-matching video generator plus trained value head; a BAIR-autoencoder latent cannot "reproduce WAV" — at best it tests Stein+CVaR vs. Gaussian/SNR as a generic planner swap in a toy latent regime. Mislabeling risks over-claiming what the proxy establishes about WAV.
- C3 Circularity: ✓ (partial disagreement with human flag) — Planning-consistency loss targets the *frozen* V-head and frozen action decoder, not the Gaussian/SNR planner being replaced; this is calibration to preserved signals, not circularity against the baseline-under-replacement. Weaker residual concern: the subspace is optimized to preserve V's scalar output, so CVaR in R^d is scoring under V, bounding the recoverable gain — worth noting but not a fatal circularity.
- C4 Expected-signal groundedness: ✗ — "CVaR on the ensemble separates 'model thinks this is bad' from 'model is not sure.'" (Core Idea) overclaims: CVaR is a lower-tail expectation, not an epistemic/aleatoric decomposition; it penalizes low-tail mass, which correlates with (but does not isolate) ensemble disagreement. The ablation "CVaR with single head should not recover the gain" partially grounds the weaker claim, but the headline wording should match the mechanism.
- C5 Risks-vs-Approach contradiction: ✓ — ASVM scope (Approach §6 disable-by-default on LIBERO-Long) aligns with Risks §4; subspace-collapse mitigation (grow d) does not contradict d=64 as a starting point.

**Verdict:** patch

**Required patches**
- Revised MVE §Proxy: replace "reproduce WAV on a 2D-toy… synthesized from a frozen video autoencoder on BAIR pushing" with wording that does not claim WAV reproduction — e.g., "a controlled 64-dim latent MPC sandbox with a bimodal reward, used only to test Stein+CVaR vs. Gaussian/SNR as a planning-rule swap; not a WAV reproduction." This preserves the cheap mechanistic check without the C2 category error.
- Revised Core Idea / Expected Contribution: weaken "CVaR on the ensemble separates 'model thinks this is bad' from 'model is not sure'" to "CVaR on the ensemble penalizes latents whose value distribution has a heavy lower tail, capturing epistemic lower-tail risk that SNR's E/Std ratio conflates with return magnitude." Keep the single-head ablation as the falsifier.
- (Optional) Revised Approach §1: add one sentence noting that the subspace is built to preserve V and the action decoder's outputs (not the Gaussian/SNR planner), so the comparison against WAV's planner in R^d is not circular — forestalls the circularity question a reader will raise.

---

## Related Work — Audit 2026-04-19
audit_round: novelty-recheck
priors_added: SVG-MPPI (2309.11040), DRA-MPPI (2506.21205), Q-STAC (2507.06625)

The original draft and Round-0 review predated this project's `novelty-checker` agent. A retroactive live prior-art check on 2026-04-19 surfaced three external priors that were not cited and that materially constrain the novelty claim:

**Prior 1 — SVG-MPPI (Okada et al., ICRA 2024, arxiv 2309.11040).** Combines SVGD with MPPI in raw vehicle action space, *with the explicit goal* of preserving multimodal optimal distributions that Gaussian-MPPI's mean refit collapses. Demonstrated on fast vehicle maneuvering. No learned value function, no ensemble, no risk measure.

**Prior 2 — Dynamic Risk-Aware MPPI / DRA-MPPI (arxiv 2506.21205, 2025).** Uses lower-tail CVaR scoring inside MPPI for crowd-navigation under non-Gaussian uncertainty. Vanilla MPPI samples (not SVGD), state-space planning, no ensemble value posterior, no learned latent substrate.

**Prior 3 — Q-STAC (arxiv 2507.06625, 2025).** SVGD particles over control trajectories scored by a learned Q-function (actor-critic). Raw action space, no CVaR, no ensemble, no latent-subspace projection.

### Sharpened Delta

The "first SVGD-MPPI to handle multimodal elites" framing is no longer available — SVG-MPPI owns it. The "first CVaR scoring inside MPPI" framing is no longer available — DRA-MPPI owns it. The "SVGD-MPPI with a learned value head" framing is no longer available — Q-STAC owns it.

What this idea *does* uniquely combine: (1) **planning in a learned 64-dim subspace of a video-noise world-model latent** — neither SVG-MPPI, DRA-MPPI, nor Q-STAC operate over a learned generator's latent; all three are state/action-space methods with no notion of a video-WM feasibility manifold; (2) **CVaR over a deep-ensemble *value* posterior with α tied to ensemble size K via α·K ≥ 2** — DRA-MPPI's CVaR is over aleatoric crowd-state uncertainty, not over an epistemic ensemble of value heads, and the ensemble-coupling of α is unique; (3) **the WAV-specific composition** — the targeted baseline (WAV's Gaussian-over-latents + SNR scoring) and the diagnostic value-add (P_latent(M_traj) feasibility-coverage measurement that WAV never reports) anchor the contribution to a specific high-profile open question, not "yet another MPPI variant."

Why the difference matters: the multimodal-elite-collapse failure mode that SVG-MPPI fixed in raw action space is *more* severe in latent video-MPC because the latent geometry is non-Euclidean and the value posterior is much more uncertain than a kinematic vehicle model — so the risk-aware CVaR term and the ensemble coupling of α are doing real work that vanilla SVG-MPPI cannot.

### Honest novelty verdict (post-audit)

Still pursue, but **demote the title and headline from "Risk-Aware Particle Planning" to something that names the substrate explicitly**, e.g., "Risk-Aware Particle Planning *in Video-Generator Latents* with Ensemble-CVaR." The contribution lives in the substrate + risk-objective composition, not in SVGD-MPPI generally. The single-head CVaR ablation (already in the MVE) is now load-bearing as the "epistemic-ensemble matters, not just CVaR" falsifier; promote it from a footnote to a primary table row. If a reviewer asks "isn't this just SVG-MPPI + DRA-MPPI + Q-STAC?", the answer is the latent-video substrate, the ensemble coupling, and the WAV-specific measurement claim — all three together, not any one alone.
