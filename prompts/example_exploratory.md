# Exploratory example — "I have a direction but I'm still mapping the design space"

Use this style when you have a research intuition but haven't picked a
single mechanism yet. The trick: ask for N ideas in the same direction
that **differ on a specific design axis**, then ask Claude for a
"decision map" comparing them.

This example targets learned working memory for hierarchical VLA.

============================================================

I'm exploring a new direction but I'm not yet sure how to land it. My
intuition:

> Today's VLAs emit actions in one shot, but humans doing long-horizon
> manipulation maintain something like working memory. We could give a
> VLA a learned memory — but the supervision signal should NOT be
> text-reconstruction (that just relearns "verbose summarizer"). It
> should be something like task-decision predictability: the memory is
> good iff the planner's next action is more predictable given it.

Papers I'm aware of as adjacent:
- 2604.13942 (Goal2Skill): current SOTA but uses a VLM-text W_t summary
- MemoryVLA (arxiv 2508.19236): vector memory, not in local KB yet
- MAP-VLA (arxiv 2511.09516): prompt-based memory, not in local KB yet

Please:

1. Run `paper-digest` on these three (skip if already digested; for
   the two not-yet-in-KB ones, fetch and digest them).
2. Write `seeds/learned-working-memory-direction.md` with
   `priority: high`, `tags: [vla, working-memory, hierarchical,
   long-horizon, supervision-signal]`. The body should capture:
   * The intuition above (verbatim is fine)
   * Why text-recon supervision is the anti-pattern I want to avoid
   * That I want to compare different supervision signals as the
     primary design axis
3. Run `paper-scout`, then **batch-digest in parallel** 6-8 papers
   most relevant to: long-horizon manipulation memory, learned-token
   memory in transformers, hierarchical VLA, alternatives to
   text-summary working memory.
4. Run `/ideate` with:
   - count: 3
   - scope: "Explore the design space anchored on
     `seeds/learned-working-memory-direction.md`. The 3 ideas should
     differ on the *supervision signal* axis (e.g., decision-entropy /
     contrastive / RL-based / something else you propose). Each idea
     must cite ≥1 anchor paper and ≥2 other KB papers. MVE: single
     A100, RMBench or LIBERO. Target venue: ICLR or CoRL. Reviewer:
     reject any idea where the supervision signal isn't actually
     novel — circular text-recon dressed up in new clothes is a hard
     reject."
5. Report:
   - The 3 accepted ideas: slug + pitch + venue + top risk
   - Validator summary for each
   - **A decision map**: a small table comparing the 3 ideas on
     (a) supervision signal, (b) implementation cost, (c) what
     winning evidence would look like, (d) which prior work it most
     directly threatens
   - If you could only run one of the 3 yourself, which would you pick
     and why. Don't flatter — if the design space is too narrow and
     all 3 collapse into the same actual experiment, say so.

============================================================
