---
id: idea-20260418-08
slug: feasibility-calibrated-latent-planning
created: 2026-04-18
status: accepted
target_venue: NeurIPS
would_benefit_from:
  - topic: GVP-WM (Grounding Video Plans with World Models, arXiv:2602.01960) -- DINOv2-feature grounding as a feasibility signal for video-planner outputs, applied as offline trajectory-optimization correction; closest external prior; not yet ingested.
  - topic: InDRiVE (arXiv:2505.21996) -- ensemble latent disagreement as Expected Information Gain proxy in a world-model planner; overlaps on the EIG half but for exploration pretraining, not elite gating; not yet ingested.
  - topic: Closing the Train-Test Gap in World Models for Gradient-Based Planning (arXiv:2512.09929) -- critiques SNR-style scoring under distribution shift in world-model planning; same WAV failure mode this idea attacks; not yet ingested.
citations:
  - arxiv: 2604.14732
    role: method-inspiration
    note: WAV's iterative latent planner over a video generator, with the unmeasured P_latent(M_traj) feasibility-coverage assumption.
  - arxiv: 2604.14732
    role: gap-source
    note: explicitly asks how planning quality degrades as the video generator's feasibility coverage delta increases (OOD scenes, multimodal elite manifolds).
  - arxiv: 2604.07426
    role: enabling-technique
    note: GIRL's information-theoretic drift control + DINOv2-grounded latent consistency loss provides the calibration machinery (EIG ensemble disagreement, IPM-style drift bounds).
  - arxiv: 2604.11351
    role: gap-source
    note: WM-DAgger's terminal-frame DINOv2 filter misses mid-trajectory hallucinations and its 120-degree directional cone prunes multimodal recoveries -- a calibrated per-step scorer would fix both.
  - arxiv: 2604.11302
    role: baseline
    note: 3D-ALP needed a geometric oracle because Florence-2 returned flat scores on synthetic frames -- the same broken scorer problem this idea targets, with a quantitative MCTS comparison ready-made.
  - arxiv: 2604.11135
    role: enabling-technique
    note: AIM's ASVM stream shows that an auxiliary value-map head trained jointly with the video generator can be reused as a control-oriented self-supervision signal.
---

## Title
Feasibility-Calibrated Latent Planning: Per-Step Drift-Aware Elite Selection for Video-Generator-Based Implicit Planners

## Problem
Implicit planners that search in the latent noise space of a generative video world model -- e.g., WAV's MPPI-in-latent loop -- assume the generator already covers the feasible-trajectory manifold (Prop. 4.2 in 2604.14732 requires P_latent(M_traj) >= 1 - delta) but never measure delta on the rollouts they actually score. The same blindness shows up in WM-DAgger (2604.11351), which relies on a single terminal-frame DINOv2 cosine similarity to filter out hallucinated futures, and in 3D-ALP (2604.11302), whose VLM scorer collapsed to constant zero on synthetic frames and forced the authors to substitute a geometric oracle. The result: planners optimize value over latents that may be off-manifold or multimodal, and elite-refit Gaussians silently collapse onto unphysical futures with no detection signal.

## Core Idea
Train a lightweight per-step feasibility critic that scores a generated future-video latent by how *consistently it grounds back to a frozen visual foundation model and how confidently an action-ensemble inverse-dynamics head agrees on it*, and use that calibrated score as a multiplicative gate on the value head when refitting the elite distribution -- turning WAV's untested feasibility-coverage assumption into a measured, per-rollout quantity that also exposes multimodality.

## Approach
Inputs: a frozen video world model W (Wan2.2 / Cosmos-Predict2.5, as in WAV/AIM/WM-DAgger), a value head V trained as in WAV, and a target VLA action decoder.

(1) **Feasibility critic F.** Two cheap heads attached to denoised future-video tokens x_{t+1:t+H}:
  (a) *Grounding consistency* g_t -- a projector f_psi(x_{t+i}) trained to reconstruct stop-gradient DINOv2 CLS embeddings of the *real* anchor frame at t, generalising GIRL's L_cm to multi-step rollouts (rather than one-step prior consistency in 2604.07426).
  (b) *Inverse-dynamics ensemble disagreement* eig_t -- K=5 inverse-dynamics decoders that, given (x_{t+i}, x_{t+i+1}), regress action a_{t+i}; we report the per-step ensemble variance as an Expected Information Gain proxy (mirroring the EIG signal in 2604.07426). Disagreement spikes mark unphysical transitions and *multimodal* feasible continuations (two valid grasps -> two consistent action means with low individual variance but high cross-mode KL, which we measure via a mode-count statistic on the action-mean cluster).

(2) **Calibrated elite selection.** Replace WAV's SNR scorer s = E[v]/Std[v] with s' = E[v] * sigmoid((g - g_thr)/tau_g) * exp(-lambda * eig) and detect bimodality of action means; when bimodality_score > rho, *split* the elite set and refit two Gaussian components in latent space (a mixture refit) instead of collapsing to the joint mean -- directly addressing WAV's open question on multimodal elite manifolds.

(3) **Training.** F is trained offline on the same demo data WAV/AIM use, with no extra reward labels: g_t supervised by DINOv2 self-distillation on real frames; the inverse-dynamics ensemble supervised by demo (s_t, a_t, s_{t+1}) tuples with bootstrap-resampled splits. F adds <5% params on top of the 2.2B WAV backbone and runs one forward pass per latent rollout.

(4) **Inference loop.** Same K-iteration MPPI loop as WAV, but elites are scored by s' and refit as a Gaussian-mixture when bimodality is detected.

## Why Now
- **2604.14732 (WAV)** introduced the latent-space MPPI loop and explicitly flagged feasibility-coverage measurement, multimodal elites, and SNR-vs-other-scorers as open questions -- this proposal directly answers all three.
- **2604.07426 (GIRL)** showed that DINOv2-grounded consistency loss + ensemble-disagreement EIG can cut imagination drift by 38-68% in Dreamer-style RL; we transplant that machinery into the *planning-time* loop of a video-generator WAM, where it has not been tried.
- **2604.11135 (AIM)** showed an auxiliary spatial-value stream can be denoised jointly with future video without retraining the video backbone -- evidence that adding a small per-step head to a frozen generator is feasible and helps control.

## Expected Contribution
- A drop-in feasibility-calibrated scorer + mixture-elite refit module that beats WAV's SNR planner on LIBERO-Long by >=2 SR points and on real-world long-horizon tasks (Piper dual-arm drawer set from WAV) by >=10 absolute SR points, without retraining the video generator.
- The first empirical estimate of P_latent(M_traj) on a deployed VLA implicit planner, with a public diagnostic curve of feasibility coverage vs. iteration K and vs. distribution shift (held-out object set, lighting).
- A unifying per-step hallucination filter that strictly improves on WM-DAgger's terminal-only DINOv2 filter (precision/recall on a hand-labeled hallucination set) and replaces 3D-ALP's broken Florence-2 scorer (matched MCTS comparison on E3).

## Minimum Viable Experiment (MVE)
Re-implement WAV's latent planner on LIBERO with the released DiT video backbone (or substitute Cosmos-Predict2 2B as in WM-DAgger). Train F on the same LIBERO demos. Report:
- LIBERO-Long SR with {SNR scorer (WAV baseline), s' scorer (ours), s' + mixture-elite refit (ours full)}; expected signal: full method gains >=2 SR on LIBERO-Long where WAV's ablation showed the largest planning effect (94.4 vs 91.8).
- A controlled OOD set (LIBERO objects with held-out colors/positions) measuring SR vs. mean per-trajectory g_t -- test the prediction that g_t correlates with SR drop.
- Ablation: replace AIM's RoboTwin task suite hardest tasks (Hanging Mug 43%, Blocks Ranking Size 47%) and test whether the feasibility-calibrated planner closes any of those low-SR gaps.

A PhD student can begin in one day: WAV and AIM code patterns are public, DINOv2 is plug-and-play, and the inverse-dynamics ensemble is ~50 LOC on top of an existing action decoder.

## Risks & Failure Modes
- **DINOv2 grounding is too coarse** to detect physics-violation hallucinations (e.g., limb through table) on 256x256 generated frames -- same failure mode flagged in 2604.07426 gaps. Mitigation: add a lightweight depth-foundation-model (Depth-Anything-V2) consistency check as a second grounding term.
- **Inverse-dynamics ensemble collapse** -- if all K members converge under heavy data augmentation, EIG goes to zero and the multimodality detector silently disables. Mitigation: enforce diverse initializations + bootstrap data splits; monitor ensemble effective rank.
- **Mixture-elite refit doubles planning cost.** Mitigation: trigger only when bimodality_score > rho (rare); amortize via single shared video denoising pass per mixture mode.

## Not To Be Confused With
This is *not* GIRL applied to manipulation: GIRL adds drift control to a Dreamer-style imagination critic during *training-time RL*; we add a feasibility critic to a *planning-time MPPI loop* over a frozen video generator at inference, and we explicitly target multimodal elite manifolds with mixture refits -- a problem GIRL does not address. It is also not AIM's ASVM: AIM jointly trains a value-map stream as a control bridge, while we add a post-hoc feasibility/drift score that gates an existing latent planner without retraining the world model.

Differentiation from external prior (per novelty-checker, 2026-04-18):
- GVP-WM (2602.01960) uses a DINOv2-grounded feasibility signal but as an **offline trajectory-optimization correction over already-hallucinated rollouts**; ours is a **per-step multiplicative critic gate inside MPPI elite scoring**, plus a bimodality-triggered mixture refit -- distinct integration point and distinct effect on the elite distribution.
- InDRiVE (2505.21996) uses ensemble latent disagreement for **reward-free exploration pretraining**; ours uses inverse-dynamics ensemble disagreement (a different functional form) as a **planning-time elite-gating term** at inference, on a frozen video backbone.
- The "Closing the Train-Test Gap" paper (2512.09929) critiques SNR-style scoring under distribution shift but does not propose a DINO-grounding + IDM-disagreement multiplicative scorer or a mixture refit on detected bimodality; we do, and we provide the first empirical P_latent(M_traj) audit on a deployed VLA implicit planner.

Differentiation from sister local idea `risk-aware-particle-planner-for-wam.md`:
- Shared target: WAV's Gaussian/SNR elite-selection failure under multimodality + OOD.
- Different uncertainty operator: sister uses **CVaR over an ensemble value posterior + Stein particle repulsion** (epistemic-vs-aleatoric value-risk lens). This idea uses **DINOv2-grounding consistency + IDM-ensemble EIG as a multiplicative critic gate, plus Gaussian-mixture refit** (feasibility-coverage / dynamics-consistency lens).
- Different mechanism for multimodality: sister preserves multimodality structurally via SVGD repulsion in latent; this idea **detects** bimodality from clustered IDM action-mean modes and triggers an explicit mixture-Gaussian refit. The two designs are complementary -- they could be ablated against each other on the same TwoGrasp-style stress split, and a head-to-head comparison would itself be useful.


---

## Review
reviewer: dr-heidi-reviewer
date: 2026-04-18

**Scores**
- Novelty: 3/5 — Each ingredient (DINOv2 grounding, IDM ensemble disagreement, SNR critique) exists in external priors (GVP-WM, InDRiVE, train-test paper); the novel composition is a per-step multiplicative critic gate inside MPPI elite scoring plus a bimodality-triggered mixture-Gaussian refit -- a real but narrow delta.
- Impact: 4/5 — Directly answers the three open questions WAV explicitly flagged (P_latent(M_traj) audit, multimodal elites, SNR-vs-other scorers); a clean +SR result on LIBERO-Long with a public feasibility-coverage curve would be widely cited in the WAM/VLA implicit-planning subcommunity.
- Feasibility: 4/5 — WAV/AIM code patterns are public, DINOv2 is plug-and-play, IDM ensemble is small, no video-backbone retraining; the bimodality-detection statistic on action-mean clusters is the only under-specified piece.
- Sum: 11/15

**Novelty-checker report:** adjacent — GVP-WM (arXiv:2602.01960), InDRiVE (arXiv:2505.21996), Closing the Train-Test Gap (arXiv:2512.09929); each touches one ingredient but none combines them as a per-step multiplicative MPPI elite gate with mixture refit on bimodality.

**Non-trash checklist**
- Not already done: ✓ (adjacent, not direct collision)
- Falsifiable: ✓ (LIBERO-Long >=2 SR target; OOD g_t-vs-SR correlation prediction; mixture-refit ablation isolates bimodality benefit)
- Non-trivial: ✓ (multiplicative gate + bimodality-triggered mixture refit is a concrete mechanism, not "combine A+B")
- Has MVE path: ✓ (LIBERO-Long with WAV reproduction; baselines, metric, and expected magnitudes all named)
- Stakeholder exists: ✓ (WAM/VLA implicit-planner researchers needing a measurable feasibility-coverage signal and a multimodal-elite handler at inference)

**Venue fit:** fine (NeurIPS); CoRL is also a strong fit given the LIBERO + Piper real-robot arc.

**Strengths**
- Tight grounding in WAV's own gap register (Prop. 4.2 P_latent assumption, Q on multimodal elites, Q on SNR-vs-others) -- the idea is constructed *exactly* to fill those holes.
- MVE is sharp: dataset, baseline, metric, and expected signal magnitude (>=2 SR on LIBERO-Long, >=10 on Piper) are all concrete; a PhD student can start in one day per the author's claim, which is realistic given public WAV/AIM code.
- The bimodality-detector + mixture refit is an actually distinct mechanism from the sister CVaR/Stein draft, so the two ideas don't cannibalize.

**Concerns**
- **Section "Approach" (1b):** the bimodality-detection statistic is hand-wavy ("two consistent action means with low individual variance but high cross-mode KL, which we measure via a mode-count statistic on the action-mean cluster") -- needs an explicit clustering rule (e.g., k-means with silhouette gap, or a Hartigan dip test on action-mean projections) and a falsifiable trigger threshold rho.
- **External prior coverage:** GVP-WM, InDRiVE, and the train-test paper were not cited in the original draft; the novelty-checker correctly flagged that the per-step-gate-vs-offline-grounding delta needs to be argued explicitly.
- **Sister-idea overlap:** without an explicit deconfliction paragraph, this idea and `risk-aware-particle-planner-for-wam.md` look like two answers to the same WAV gap; a one-paragraph differentiation is mandatory.
- **DINOv2 grounding granularity:** the author acknowledges DINOv2 may not catch physics violations; the depth-foundation-model fallback should be promoted from "mitigation" to a default second grounding term to avoid a known failure mode dominating results.

**Verdict:** improve
**Rationale:** The idea passes every non-trash gate and has a clean MVE, but novelty is narrower than the draft implies once GVP-WM and InDRiVE are on the table, and two specifics (bimodality detector, sister-idea differentiation) need to be tightened before submission. With those edits, the per-step multiplicative gate + mixture refit stands as a genuinely novel composition aimed at WAV's most-cited open question.

## Revised Version (reviewer amendments)

### What I changed and why
- Added **frontmatter `would_benefit_from`** for GVP-WM, InDRiVE, and the train-test paper -- addresses: "External prior coverage" (these arxiv IDs are not yet in `papers/` so they cannot be cited as if they were).
- Added **"Differentiation from external prior" and "Differentiation from sister local idea" paragraphs** under "Not To Be Confused With" -- addresses: "Sister-idea overlap" and the novelty-checker's instruction to sharpen the per-step-gate vs. offline-grounding delta.
- Tightened **bimodality detector** in the Revised Approach below with an explicit Hartigan dip-test rule and a calibrated rho -- addresses: "Approach (1b) hand-wavy statistic".
- Promoted **Depth-Anything-V2 grounding** from a Mitigation bullet to a default second grounding term in F -- addresses: "DINOv2 grounding granularity".
- Kept **Problem, Why Now, Expected Contribution, MVE structure, and the cited papers list** unchanged: the WAV-grounded framing and the LIBERO-Long + Piper experimental plan are the strongest parts of the draft.

### Revised Core Idea
Train a lightweight per-step feasibility critic that scores each generated future-video latent inside WAV's MPPI loop by (i) how consistently it grounds back to a *frozen* DINOv2 *and* Depth-Anything-V2 anchor of the real frame and (ii) how confidently a K=5 inverse-dynamics action ensemble agrees on the implied transition; use that calibrated score as a **multiplicative gate** on WAV's value head during elite scoring, and when a Hartigan dip-test on the elites' inferred-action means rejects unimodality, **refit the elite distribution as a 2-component Gaussian mixture in latent space** instead of collapsing to the joint mean.

### Revised Approach
Inputs unchanged: frozen WAV video generator W, value head V, action decoder, demo dataset.

(1) **Feasibility critic F = (g, eig).**
  (a) *Grounding consistency g_t.* For denoised future tokens x_{t+i}, train two cheap projectors f_psi^DINO and f_psi^Depth to reconstruct stop-gradient DINOv2 CLS and Depth-Anything-V2 disparity-pooled embeddings of the *real* anchor frame at t. g_t = 0.5 * (cos(f_psi^DINO(x_{t+i}), DINO(real)) + cos(f_psi^Depth(x_{t+i}), Depth(real))). Depth term catches the "limb through table" failure mode that DINOv2 alone misses on 256x256 generated frames.
  (b) *IDM-ensemble disagreement eig_t.* K=5 inverse-dynamics decoders {phi_k} regress a_{t+i} from (x_{t+i}, x_{t+i+1}); per-step EIG = Var_k(phi_k) (action-space variance of the ensemble means).

(2) **Calibrated elite scoring.** Replace WAV's SNR scorer s = E[v]/Std[v] with
  s' = E[v] * sigmoid((g - g_thr)/tau_g) * exp(-lambda * eig).
  Calibrate g_thr and tau_g on a held-out demo split so that the median s' on real demo trajectories equals the median value E[v] (i.e. the gate is unit-mean on in-distribution rollouts and only attenuates suspect ones).

(3) **Bimodality detection + mixture refit.** Project each elite latent to its IDM-implied action mean a_bar = mean_k(phi_k(x, x')). Run a **Hartigan dip test** on the 1-D PCA projection of {a_bar} across the elite set; if the dip statistic exceeds rho (rho calibrated on synthetic bimodal-vs-unimodal action-mean swarms so that false-positive rate <= 5%), run k=2 means on the elites in latent space and refit a 2-component Gaussian mixture (one Gaussian per cluster) for the next MPPI iteration; otherwise refit the standard single Gaussian as in WAV. The two-mode pass shares a single denoising forward by batching mode samples, so the wall-clock penalty is sub-2x only on triggered iterations.

(4) **Training of F.** No extra reward labels; g supervised by DINOv2/Depth self-distillation on real demo frames; IDM ensemble supervised by demo (s_t, a_t, s_{t+1}) tuples with bootstrap-resampled splits and diverse seed initializations. F adds <5% params on top of WAV's 2.2B backbone.

(5) **Inference loop.** Same K=3 MPPI iterations as WAV, but elites are scored by s' and refit as a Gaussian-mixture when the dip test triggers.

### Revised MVE
- **Dataset / setup:** reproduce WAV's latent planner on LIBERO with the released DiT video backbone (or substitute Cosmos-Predict2 2B as in WM-DAgger). Train F (g + IDM ensemble) on the same LIBERO demos.
- **Baselines:** (i) WAV with SNR scorer (paper baseline); (ii) WAV + s' scorer only (no mixture refit); (iii) WAV + s' + mixture refit (full); (iv) ablation: g-only gate (no eig); (v) ablation: eig-only gate (no g).
- **Metrics + expected signal:**
  - LIBERO-Long SR: full method >= +2 SR over WAV (94.4 -> >=96.4), with mixture refit alone contributing >=0.5 SR on the bimodal-grasp subset.
  - **First public P_latent(M_traj) audit:** mean per-trajectory g_t plotted vs. iteration K and vs. an OOD object/lighting holdout; falsifiable prediction: g_t Pearson-correlates with SR drop at r >= 0.6 on the OOD split.
  - Hand-labeled hallucination set (~200 mid-trajectory frames, balanced): F's per-step (g, eig) score should beat WM-DAgger's terminal DINOv2 cosine on precision @ recall=0.8 by >=10 absolute points.
  - Wall-clock: full method <= 1.4x WAV inference on LIBERO-Long (mixture refit triggers on <=20% of iterations by design).

### Revised Risks
- **Hartigan dip-test mis-calibrated on small elite sets** (WAV uses K1=8 elites by default) -- statistical power is weak below n=30. Mitigation: pool dip statistics across the last two MPPI iterations before triggering, and validate rho on a synthetic bimodal-vs-unimodal sweep.
- **DINOv2 + Depth grounding still misses semantic-level hallucinations** (e.g., wrong object grasped). Mitigation: as a backstop, add an open-vocab object-presence check via the existing language conditioning -- punted to a follow-up if MVE shows the geometric grounding is insufficient.
- **IDM ensemble collapses under heavy data augmentation** so eig -> 0 and the multimodality detector silently disables. Mitigation: enforce diverse initializations + bootstrap data splits; monitor ensemble effective rank during training and abort if it drops below 0.5K.

### Additional citations (if any added)
- None added to `citations:` (would-benefit-from items moved to a separate frontmatter list because the three external priors are not yet ingested into `papers/`).

---

## Validator
validator: dr-heidi-validator
date: 2026-04-18

**Checklist**
- C1 Claim-capability alignment: ✓ — All five locally-cited papers (WAV 2604.14732, GIRL 2604.07426, WM-DAgger 2604.11351, 3D-ALP 2604.11302, AIM 2604.11135) match their `notes.md` digests on the specific capabilities invoked (MPPI/SNR/Prop 4.2; L_cm + K=5 EIG; terminal-frame DINOv2 + 120° cone; Florence-2 flat-score + geometric-oracle substitution; ASVM auxiliary value-map stream). The three external priors are honestly flagged in `would_benefit_from`.
- C2 Benchmark fitness: ✓ — LIBERO-Long for long-horizon SR, WAV Piper drawer for real-world long-horizon, RoboTwin Hanging Mug / Blocks Ranking Size cited as ablation cases all measure the property under test (planning quality on long-horizon / contact-rich tasks).
- C3 Circularity: ✓ — IDM ensemble trained on demo (s,a,s') tuples, not on WAV's own outputs; g calibration uses real demo trajectories so the gate cannot be tautologically satisfied by the planner it scores; bimodality detector reads IDM action-mean modes, not the WAV action decoder being optimized.
- C4 Expected-signal groundedness: ✗ (partial) — LIBERO-Long >=2 SR is grounded in WAV's own 94.4-vs-91.8 ablation. The Piper >=10 SR claim and the "g_t Pearson r >= 0.6 on OOD" prediction have no explicit reference point or derivation; the "mixture refit triggers <=20% of iterations" rate is asserted by-design but unmeasured.
- C5 Risks-vs-Approach contradiction: ✓ — The Hartigan dip-test power risk at n<30 is a real tension with WAV's K1=8 elites (pooling two iterations still gives ~16); the Risks block names it explicitly and proposes synthetic-sweep validation, so this is acknowledged uncertainty rather than a contradiction.

**Verdict:** patch

**Required patches**
- Revised MVE (Piper expected signal): replace the bare ">=10 absolute SR points" with an explicit anchor, e.g., "WAV reports 75.6% avg on Piper drawer/towel/bowl; we target >=10 SR on the drawer subset where long-horizon planning matters most, i.e. lifting from the implied ~70% baseline toward ~80%." Without that anchor the magnitude is air.
- Revised MVE (OOD correlation prediction): the r >= 0.6 Pearson target needs either a citation (GVP-WM-style grounding-vs-SR correlation, or GIRL's DFM-vs-IQM correlation) or a sample-size statement (n trajectories in the OOD split) so the prediction is operationally falsifiable.
- Revised Risks (dip test power): pooling two MPPI iterations gives ~16 elites — still under the n=30 power floor named in the same bullet. Either raise the trigger to require persistence across all K=3 iterations (~24) and accept a one-iteration detection lag, or commit to bumping K1 from 8 to >=15 elites for the bimodality-detection iterations only.
