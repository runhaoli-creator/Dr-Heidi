---
id: idea-20260418-07
slug: learned-working-memory-for-hierarchical-vla
created: 2026-04-18
status: improve
target_venue: ICLR
citations:
  - arxiv: 2604.13942
    role: gap-source
    note: Goal2Skill's own ablation shows working memory W_t is non-monotone (drops Observe&Pick Up 8->6% and Blocks Ranking Try 54->42% when added); authors explicitly list "Can the structured memory M_t be learned (end-to-end or via RL) rather than relying on VLM text summaries?" as an open question.
  - arxiv: 2604.13942
    role: baseline
    note: Goal2Skill's full 32.4% RMBench SR (M(n) at 38.7%, M(1) at 23.0%) with the full (H_t, W_t, E_t) VLM-text memory is the direct comparator; the memory-ablation rows (Base 6.7% -> +H 27.7% -> +H+W 28.0% -> Full 35.3%) give us the expected-signal derivation for where a learned memory should recover the missing monotone gain.
  - arxiv: 2604.07426
    role: method-inspiration
    note: GIRL's Distilled Semantic Prior shows a slow, high-quality signal can be compressed into a fast continuous latent that provides a trust-region grounding for a faster policy — the same slow->fast distillation pattern we use to replace VLM text summaries with a learned embedding.
  - arxiv: 2604.11302
    role: method-inspiration
    note: 3D-ALP's persistent SE(3) scene anchor is an explicit, structured (non-text) memory representation whose success on occluded memory tasks (+0.645 Memory SR) empirically validates that structured-non-linguistic memory is the right move for memory-dependent manipulation.
would_benefit_from:
  - "MemoryVLA (arxiv 2508.19236) — perceptual-cognitive working+episodic memory bank fused with current tokens; supervised end-to-end through the diffusion action expert (action loss), no sub-task-selection bottleneck supervision. Closest external prior on the learned-memory-for-VLA axis. Distinguishing delta: MemoryVLA serves a flat diffusion-transformer policy and trains against action-reconstruction, whereas this idea serves a hierarchical VLM planner and trains against planner-decision entropy at sub-task boundaries."
  - "MAP-VLA: Memory-Augmented Prompting for VLA (arxiv 2511.09516, 2025) — stage-specific learnable soft prompts injected into a frozen VLA as a memory module. Closest in mechanism (learned prompt-style memory, frozen backbone, LoRA-style injection), but trained via flow-matching action reconstruction, NOT planner-decision entropy. The supervision-signal swap is the load-bearing delta, and the MVE's B6 (ours with text-recon loss instead of decision-entropy loss) doubles as the head-to-head MAP-VLA-style ablation."
  - "CoMEM: Towards General Continuous Memory for VLMs (arxiv 2505.17670, 2025) — learns continuous memory tokens via LoRA on a memory encoder + Q-Former for frozen VLMs; closest on the 'continuous memory + LoRA + frozen VLM' architectural axis, but for general VLM QA, not hierarchical VLA, and not supervised by sub-task decision entropy."
---

## Title
Learning Structured Working Memory for Hierarchical VLA Planning: Replacing VLM Text Summaries with a Distilled Memory Embedding

## Problem
Goal2Skill (2604.13942) achieves 32.4% SR on RMBench by running a VLM planner over a triple-structured memory `M_t = (H_t episodic history, W_t working-memory NL summary, E_t error register)`, with sub-tasks dispatched to a diffusion skill library. The memory is entirely **linguistic**: W_t is a VLM-generated natural-language summary of H_t that fits the VLM context window. Goal2Skill's own memory ablation is non-monotone — adding W_t over H_t drops Observe&Pick-Up from 8% to 6% and Blocks-Ranking-Try from 54% to 42%, suggesting the VLM text summarisation sometimes destroys task-relevant state. The authors' own open question is whether M_t can be **learned end-to-end rather than relying on VLM text summaries**. This matters beyond Goal2Skill: every hierarchical VLA that mediates planner-executor coordination through language prose inherits VLM summarisation loss, context-window pressure, and the VLM's hallucination failure mode, while paying 1-3 s/decision in VLM inference time. The question is not "can we make the text better" but "should the memory be text at all."

## Core Idea
Replace Goal2Skill's W_t VLM text summary with a **learned continuous embedding memory M^emb_t ∈ R^d trained by a planner-executor predictive objective**: the planner's next-sub-task selection must be predictable from (goal, current observation, M^emb_t) under a frozen VLM planner, and M^emb_t is updated by a small recurrent encoder over the execution stream. The non-obvious move: we supervise M^emb_t not against text (which would just recover VLM summarisation) but against the **counterfactual reduction in planner-decision entropy** — a memory is good if it *decides* planner outputs, bad if it merely describes them. To avoid training a memory against the very VLM we're trying to help, the target is the Goal2Skill planner's ground-truth next-sub-task label from a successful trajectory, not the VLM's live prediction under our memory.

## Approach
Starting from Goal2Skill's released pipeline (2604.13942): VLM planner Φ, diffusion skill library {π_j}, distractor-mask Q_t, episodic H_t, and training demos already decomposed into sub-task sequences.

1. **Memory encoder.** A small transformer encoder E_ψ: (observation sequence, action chunk, sub-task id, reward signal) -> R^d with d=256. Recurrent update `M^emb_t = GRU(E_ψ(o_t, a_t, j_t, r_t), M^emb_{t-1})`. Initialised fresh per episode.
2. **Planner conditioning.** Inject M^emb_t into Φ via a small adapter — 2 cross-attention heads at the VLM's penultimate block, with `Φ(G, o_t, H_t, M^emb_t, E_t)`, dropping W_t entirely. The VLM's text input is the goal + H_t sketch; M^emb_t carries the compressed state that W_t previously encoded in prose.
3. **Training signal — planner-decision entropy, not text reconstruction.** For each demo trajectory with known sub-task labels `(j_1, ..., j_K)`, freeze Φ and train E_ψ, GRU, and the adapter by cross-entropy on `Pr(j_{k+1} | G, o_{t_k}, H_{t_k}, M^emb_{t_k})` where t_k is the k-th sub-task boundary timestep. This explicitly asks: does M^emb let the planner pick the next sub-task correctly, given the same (G, o, H) Goal2Skill already sees? No gradient flows into Φ.
4. **Distillation from GIRL's DSP recipe (2604.07426).** The memory encoder is a "slow → fast" compression exactly analogous to GIRL's Distilled Semantic Prior: a heavy signal (full observation+action history) compressed into a fast continuous latent that conditions a downstream decision. GIRL's MSAE warm-start + replay-batch distillation schedule ports directly, with sub-task-label cross-entropy replacing GIRL's MSE-on-semantic-features.
5. **Preserving the error register E_t.** E_t is structured (concrete failure modes like "gripper slipped") and is kept as-is — only the W_t linguistic summary is replaced. E_t's role as a discrete failure-class input remains.

The key claim: because M^emb_t is trained to be decision-sufficient, it captures exactly the state that drove the planner's choices on successful demos, with no VLM summarisation step to lose or distort.

## Why Now
- **2604.13942 (Goal2Skill)** released the first measured numbers isolating where VLM text memory hurts — non-monotone W_t effects on specific tasks are a named open failure mode with an author-endorsed fix direction (learned memory).
- **2604.07426 (GIRL)** gave a working slow→fast distillation recipe for compressing an expensive signal (DINOv2 foundation features) into a fast student latent that provides a trust-region grounding for a faster policy; the recipe transfers structurally — only the loss function and data pipeline change.
- **2604.11302 (3D-ALP)** proved empirically that a *structured non-linguistic* memory (an SE(3) scene anchor) outperforms reactive policies on occluded memory tasks by +0.645 SR — the strongest evidence in the KB that hierarchical memory for manipulation should not live in text.

## Expected Contribution
- A general recipe for replacing VLM text memories in hierarchical VLA pipelines with learned, decision-sufficient continuous embeddings, at ~10x lower per-decision latency (no VLM summarisation call per checkpoint).
- **On Goal2Skill's RMBench (2604.13942):** target overall SR >= 35% (Goal2Skill's full system: 32.4%). Derivation: Goal2Skill's own table shows (Base 6.7%) → (+H 27.7%) → (+H+W 28.0%) → (Full 35.3%) — the +W_t contribution over H_t is only +0.3 SR on average but *drops* performance on 2 specific tasks (Observe&Pick-Up 8→6, Blocks-Ranking-Try 54→42). A learned memory should recover the aggregate +W_t gain and close the two per-task regressions, giving ~+2-3 SR overall. M(n) tasks specifically target >= 42% (baseline 38.7%); on the non-monotone tasks specifically, avoid the W_t regression entirely (e.g., Observe&Pick-Up >= 8%, Blocks-Ranking-Try >= 54%).
- **Planner-decision entropy:** demonstrate a >=30% reduction in planner sub-task-choice entropy at sub-task boundaries vs. Goal2Skill's W_t variant on held-out trajectories, validating that the learned memory is decision-sufficient in a way text summaries are not.
- **Latency:** per-decision wall-clock reduction >= 5x vs. VLM-summarised W_t (Goal2Skill's W_t step is a full VLM forward pass per sub-task boundary; ours is a 256-dim GRU update).

## Minimum Viable Experiment (MVE)
- **Benchmark fitness:** RMBench (Goal2Skill's own benchmark) measures long-horizon, memory-dependent, multi-stage manipulation — exactly the regime where W_t's non-monotone effect appears in Goal2Skill's ablation table. M(n) vs M(1) splits measure memory-intensity isolation; both are reported in Goal2Skill, making our comparison apples-to-apples on every published row.
- **Setup:** Goal2Skill's released 5 RMBench tasks + their 50-demos-per-task training set + their VLM planner + their diffusion skill library, unchanged. Replace only W_t. No new data collection.
- **Target-backbone fidelity:** MVE runs on Goal2Skill's actual VLM planner and diffusion skills — not a toy stand-in — so any SR gain is attributable to the memory swap.
- **Baselines:** (B1) Goal2Skill Full (their 32.4% SR); (B2) Goal2Skill without W_t (their 28.0% SR, H_t only); (B3) Goal2Skill with a longer VLM-text W_t (context doubled) — controls for "more text beats less text" vs "structured memory beats text"; (B4) our learned-memory variant (M^emb replaces W_t); (B5) our variant with the memory frozen after pretraining (tests whether online update matters); (B6) our variant trained with text-reconstruction loss instead of decision-entropy loss (isolates the non-circular-loss claim — a text-recon loss would target the very W_t we're replacing and is a principled negative control).
- **Metrics:** Overall SR, per-task SR (especially Observe&Pick-Up and Blocks-Ranking-Try), M(1) and M(n) splits, planner-decision-entropy reduction, per-decision wall-clock.
- **Expected signal (derivation-tied):** B4 recovers B1's overall SR and *exceeds* it by the Goal2Skill-ablation-implied regression on Observe&Pick-Up and Blocks-Ranking-Try — i.e., the 2 pts of lost gain from W_t should come back (Goal2Skill's B1 minus B2 on those tasks is negative, so the headroom is real). B6 (text-recon loss) should underperform B4: this is the non-circular-loss test — training against text reconstruction would reduce to "learn W_t better" and therefore should inherit W_t's failure modes rather than remove them, which is a falsifiable claim.

## Risks & Failure Modes
- **Learned memory needs more demos than 50/task.** 256-dim embeddings may underfit at Goal2Skill's demo budget. Mitigation: pretrain E_ψ on all tasks jointly then fine-tune per task; if still underfit, report as a *negative* result on memory-efficiency — still scientifically valuable.
- **Adapter destabilises frozen VLM.** Injecting M^emb via cross-attention into a frozen VLM can shift its output distribution catastrophically. Mitigation: use LoRA on the adapter layer only; verify base-VLM zero-shot performance on a held-out text-only prompt set doesn't drift.
- **Decision-entropy label is leaky.** Sub-task labels come from demos that *succeeded* under Goal2Skill's W_t — so the labels carry a bias toward the decisions W_t enabled. Mitigation: include failed-but-corrected demo segments (where Goal2Skill's E_t fired and replanning recovered) in the training set; these carry sub-task transitions that W_t struggled to pick.

## Not To Be Confused With
This is **not** a new hierarchy or a new planner — Goal2Skill's VLM planner, skill library, distractor masks, and error register are all kept intact. The change is strictly in what replaces W_t. It is **not** a MemoryVLA-style vector memory bolted on to a flat policy: the memory here serves a *hierarchical* planner and is trained against a hierarchical-decision signal. And it is **not** Round 0's belief-gated-system2-dispatch: that idea decides *when* to call System-2 from a scalar gate over uncertainty; this idea changes *what state* System-2 receives when called — orthogonal concerns. The non-circular loss (decision-entropy, not text-reconstruction) is what separates this from naive "learned summariser" baselines.

---

## Review
reviewer: dr-agent-reviewer
date: 2026-04-18

**Scores**
- Novelty: 3/5 — MemoryVLA (2508.19236, live-search hit) is the closest adjacent prior but is flat-policy + action-recon; injecting a learned embedding into a *hierarchical planner* trained against *planner-decision entropy on a frozen VLM* is a genuinely new target and loss, though "learned memory for VLA" as a category is now crowded.
- Impact: 4/5 — Hits a named open question in a fresh well-cited paper (Goal2Skill); if the Observe&Pick-Up and Blocks-Ranking-Try regressions recover, the result generalises to every hierarchical VLA that mediates planner-executor coordination through prose (MemoryVLA, MAP-VLA, Meta-Memory, RoboClaw, Critic-in-the-Loop all inherit the same text-summary tax).
- Feasibility: 4/5 — MVE reuses Goal2Skill's released pipeline unchanged; only W_t is swapped. Main risks (50 demos/task, frozen-VLM adapter drift) are flagged with concrete mitigations. Budget fits a single 8xA100 week.
- Sum: 11/15

**Novelty-checker report:** adjacent — closest: MemoryVLA (arxiv 2508.19236), CoMEM (2505.17670), EchoVLA (2511.18112). All train learned memory for VLAs but none target the hierarchical-planner W_t slot specifically, and none use planner-decision entropy as the training signal.

**Non-trash checklist**
- Not already done: ✓ (adjacent, not direct-collision; the hierarchical-planner placement + decision-entropy loss is unclaimed)
- Falsifiable: ✓ (B6 text-recon baseline is an explicit negative control; if B4 ≤ B6 on the two regression tasks, the decision-entropy claim fails)
- Non-trivial: ✓ (the non-circular loss design and frozen-VLM target are the non-obvious moves — "learn W_t better" would be trivial and is explicitly excluded)
- Has MVE path: ✓ (Goal2Skill's released pipeline + RMBench + 50 demos/task, all named)
- Stakeholder exists: ✓ (hierarchical-VLA authors inheriting VLM-summary latency/drift; Goal2Skill authors directly, since this answers their open question)

**Venue fit:** fine — ICLR is right for a representation-learning recipe with a hierarchical-VLA benchmark; CoRL also plausible if real-robot transfer is added.

**Strengths**
- **Non-circular loss is the central move and is defended.** Training against planner-decision entropy (not text reconstruction) is the one thing that separates this from every "learned summariser" variant; B6 explicitly tests this.
- **Derivation-tied expected signal.** The ~+2-3 SR target is derived from Goal2Skill's own ablation rows rather than guessed — rare and credible.
- **Per-task falsifiability.** Observe&Pick-Up ≥8 and Blocks-Ranking-Try ≥54 are narrow, named targets that can't be hand-waved.

**Concerns**
- **"Planner-decision entropy" training signal is under-specified.** Approach §3 asks for cross-entropy on `Pr(j_{k+1} | ...)` under a *frozen* Φ, but if Φ is a VLM decoding text tokens, the gradient path from M^emb_t through 2 cross-attention heads to a discrete sub-task label through a frozen VLM is nontrivial. Need: pin down whether Φ outputs a sub-task ID via a classifier head (gradient-friendly) or via free-form text decoding (which needs REINFORCE or STE) — the paper's reproducibility rests on this.
- **Not-to-be-confused-with misses MemoryVLA's actual threat.** The draft dismisses MemoryVLA as "flat-policy bolted-on", but the closer collision is with MemoryVLA's *PCMB-fuse-then-predict* mechanism, which is architecturally similar to the GRU-memory-then-cross-attend here. The delta (hierarchical placement + non-circular loss) should be stated more sharply up front.
- **Adapter risk is underweighted.** Injecting cross-attention into a frozen VLM's penultimate block with only demo-scale data (50/task × 5 tasks = 250 episodes) is the modal failure mode for this whole class of work. LoRA on the adapter alone may not be enough; a text-only drift check is named but no pass/fail threshold is given.
- **B3 "longer VLM-text W_t" may not isolate what it claims.** Doubling context for W_t could improve SR via any number of non-memory reasons (better grounding, more recency). Worth adding a "W_t with same token budget but structured (JSON)" baseline to separate "text vs. embedding" from "unstructured text vs. structured text."

**Verdict:** improve
**Rationale:** The core insight (non-circular decision-entropy loss on a frozen VLM planner) is a genuinely new move at a defensible point in the design space, and the MVE is derivation-tied. But the training-signal implementation is under-specified and the closest adjacent prior (MemoryVLA) is dismissed too briefly. Revised below tightens §3, adds a structured-text control, and pins down the adapter-drift threshold.

## Revised Version (reviewer amendments)

### What I changed and why
- Changed **Approach §3 (Training signal)**: made the gradient path explicit — Φ gets a lightweight sub-task classifier head so cross-entropy is actually differentiable — addresses: "training signal under-specified."
- Changed **Approach §2 (Planner conditioning)**: added a named drift threshold (≤2 pts on a held-out 100-prompt text-only eval) and a fail-fast criterion — addresses: "adapter-drift underweighted."
- Changed **MVE Baselines**: added B7 (structured-JSON W_t at matched token budget) so B3 vs B7 isolates "more text" from "more structure," and B4 vs B7 isolates "text-structure vs. embedding" — addresses: "B3 doesn't isolate what it claims."
- Kept **Core Idea, Why Now, Expected Contribution, Risks** unchanged: the claim structure is sound.
- Kept **Not To Be Confused With** but sharpened the MemoryVLA delta inline.

### Revised Core Idea
Replace Goal2Skill's W_t VLM text summary with a learned continuous memory M^emb_t trained against **planner-decision entropy at sub-task boundaries under a frozen VLM planner** (not against text or actions) — the memory is supervised by the decisions it needs to enable, not by the prose it replaces. Unlike MemoryVLA's PCMB (which fuses into a flat diffusion policy trained on action reconstruction), this memory enters a *hierarchical* planner at the sub-task-selection bottleneck, and its loss never flows through the text-summariser it's displacing.

### Revised Approach
Starting from Goal2Skill's released pipeline (2604.13942):

1. **Memory encoder (unchanged).** E_ψ + GRU → M^emb_t ∈ R^{256}, inputs (o_t, a_t, j_t, r_t), reset per episode.
2. **Planner conditioning with drift guard.** Add a LoRA adapter (rank 8) at Φ's penultimate transformer block with 2 cross-attention heads conditioned on M^emb_t. **Fail-fast check:** before any memory training, verify the LoRA-initialised (zero-init adapter) Φ matches base Φ within ≤2 pts on a 100-prompt text-only held-out eval; if not, rank-8 is too aggressive — drop to rank 4. The VLM text input is goal + H_t sketch only; W_t prose is dropped.
3. **Training signal — decision entropy with an explicit gradient path.** Attach a frozen-backbone classifier head `h: R^{hidden} → R^J` over Φ's final hidden state, reading sub-task logits directly (no free-form text decoding — that kills gradients). Train E_ψ + GRU + adapter + h by cross-entropy on `Pr(j_{k+1} | G, o_{t_k}, H_{t_k}, M^emb_{t_k})` at demo sub-task boundaries. Φ's weights and LoRA-free text path stay frozen; gradients flow into h, the adapter, and the memory stack only. To avoid label bias from W_t-driven successes, include failed-then-replanned demo segments (where E_t fired) as positive labels for the correct sub-task transition.
4. **GIRL distillation schedule (unchanged).** MSAE warm-start on observation-sequence reconstruction, then replay-batch distillation with decision-entropy loss.
5. **E_t preserved (unchanged).**

### Revised MVE
- **Setup:** Goal2Skill's released RMBench 5 tasks + 50 demos/task + their VLM + their skill library, unchanged. Swap only W_t.
- **Baselines:**
  - B1 Goal2Skill Full (their 32.4% SR)
  - B2 Goal2Skill H_t only (their 28.0%)
  - B3 Goal2Skill with doubled-token W_t (same unstructured prose, more budget)
  - **B7 (new) Goal2Skill with structured-JSON W_t at matched token budget** (isolates text-structure from text-unstructured)
  - B4 Ours (M^emb replaces W_t, decision-entropy loss)
  - B5 Ours with memory frozen post-pretrain (tests online update)
  - B6 Ours with text-reconstruction loss on W_t targets (the non-circular-loss negative control)
- **Metrics:** Overall SR, per-task SR (especially Observe&Pick-Up, Blocks-Ranking-Try), M(1)/M(n) splits, planner-decision-entropy at boundaries, wall-clock per decision, VLM-drift check (≤2 pts on held-out text eval).
- **Expected signal (derivation-tied):** B4 ≥ B1 overall (+2-3 SR), B4 recovers W_t-regressions (Observe&Pick-Up ≥8, Blocks-Ranking-Try ≥54). **Crucial falsifiers:** (i) B4 > B6 on the two regression tasks (non-circular-loss claim); (ii) B4 > B7 on overall SR (embedding beats structured-text at matched budget — "it's not just structure, it's non-text structure"); (iii) ≥30% planner-decision-entropy reduction at boundaries; (iv) ≥5x wall-clock reduction per decision.

### Revised Risks
- **Sub-task classifier head overfits on 250 episodes and carries the planner alone** — M^emb becomes redundant. Mitigation: ablate h alone (no memory) as a zeroth baseline; if it already matches B1, the problem is the head not the memory, and we report the null result.
- **LoRA adapter drift exceeds 2 pts** on the text-only eval even at rank 4 — adapter injection is infeasible for this VLM. Mitigation: fall back to prefix-tuning (soft prompts conditioned on M^emb_t) as a more conservative injection path.

### Additional citations (if any added)
None added — MemoryVLA (2508.19236) and CoMEM (2505.17670) are the obvious adjacent priors but are not in the local KB; they are noted in frontmatter `would-benefit-from` and should be ingested before submission.

---

## Validator
validator: dr-agent-validator
date: 2026-04-18

**Checklist**
- C1 Claim-capability alignment: ✓ — Goal2Skill (32.4% overall, 38.7% M(n), W_t regressions on Observe&Pick-Up 8→6 and Blocks-Ranking-Try 54→42, ablation row 28.0%→35.3% with E_t), GIRL (slow→fast distillation via MSAE/DINOv2-student), and 3D-ALP (+0.645 Memory SR as structured-non-linguistic memory) all match their notes.md.
- C2 Benchmark fitness: ✓ — RMBench is Goal2Skill's own long-horizon memory-dependent benchmark with M(n)/M(1) splits; directly measures the regime the idea targets.
- C3 Circularity: ✓ — sub-task labels come from pre-existing human-decomposed demos (not W_t output), loss targets discrete sub-task IDs via a new classifier head h, no gradient path through the W_t summariser; B6 text-recon control is a principled falsifier. Risk of h carrying the planner alone is explicitly ablated.
- C4 Expected-signal groundedness: ✗ — the "≥30% planner-decision-entropy reduction at boundaries" target has no derivation (unlike the ≥35% SR which is tied to Goal2Skill's ablation rows). It is the weakest-grounded number in Expected Contribution.
- C5 Risks-vs-Approach contradiction: ✓ — LoRA-rank fallback (8→4→prefix-tuning), label-bias mitigation (failed-then-replanned segments), and h-alone ablation all compose with Approach constraints.

**Verdict:** patch

**Required patches**
- Expected Contribution / Revised MVE: either derive the ≥30% planner-decision-entropy target from a reference point (e.g., measure Goal2Skill W_t's entropy at sub-task boundaries on a held-out split and state the target as a relative reduction with an empirical baseline), or soften to "report entropy reduction; any positive effect validates decision-sufficiency" so the claim is not an unbacked magnitude.

