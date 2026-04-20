# Focused example — "I know exactly what I want"

Use this style when your direction is sharp: which baseline you're
attacking, which mechanism you want to use, which venue you're aiming
at. Concrete, decisive, no exploration.

This example targets latent-space planning for VLAs.

============================================================

I'm running an ideation session, focused on **latent-space planning for VLAs**.

Anchors:
- 2604.14732 (WAV): I want to start from its SNR-scoring failure mode
  on multimodal elite manifolds.
- 2604.07426 (GIRL): I want to use its K=5 ensemble + EIG signal as a
  building block for a calibrated value posterior.
- 2604.11135 (AIM): I want to explore whether ASVM can serve as an
  independent calibration signal cross-checking the value head.

Please:

1. Run `paper-digest` on the three above (skip any already digested).
2. Write `seeds/risk-aware-latent-planning.md` with `priority: high`,
   `tags: [vla, wam, latent-planning, risk-aware, ensemble]`. The body
   should capture:
   * I want to attack WAV's Gaussian-refit + SNR failure on multimodal
     elite manifolds
   * Mechanism I'm exploring: ensemble-CVaR + particle planner in a
     learned compressed latent subspace
   * What I do NOT want: more "stack-yet-another-loss" tricks; I want
     a structural claim about the planning rule
3. Run `paper-scout` once, then **batch-digest in parallel** 8 papers
   from the scout output that look most relevant to: latent planning,
   value-head ensembling, multimodal action distribution handling,
   particle filtering / SVGD in continuous control. Skip surveys.
4. Run `/ideate` with:
   - count: 2
   - scope: "Anchored on `seeds/risk-aware-latent-planning.md`. Each
     idea must cite ≥1 anchor paper and ≥2 other KB papers. MVE must be
     startable on a single A100 in one week with LIBERO + a public WAV
     checkpoint. Target venue: NeurIPS. Reviewer: be willing to reject
     — do not rescue trivial ideas into improve."
5. Report:
   - the 2 accepted ideas (slug + pitch + venue + top risk)
   - Validator summary for each
   - which one you'd pursue first, why; which has the riskier MVE; and
     whether the batch feels meaningfully novel vs. incremental on WAV

============================================================
