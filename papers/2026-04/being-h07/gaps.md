# Gaps

- Can the posterior branch be supervised by non-pixel futures — CoT reasoning traces, language-described futures, action-token futures, tactile/force futures, or multi-modal mixes? Which is the cheapest signal that still shapes useful latent reasoning?
- How should `K` (number of latent queries, hand-picked as 16) scale with task complexity, action-chunk length, and embodiment count? No ablation is reported.
- Can the plain L2 alignment on hidden states be replaced with InfoNCE / distributional matching / VICReg-style regularized variants without needing the manual norm+rank crutch?
- Prior-branch latent queries are static learnable parameters shared across all tasks. Can they be made **instruction-conditional** or **task-dispatched** (e.g., mixture-of-queries with a router, hierarchical Q) for better cross-embodiment / cross-skill transfer?
- Norm and rank regularizer hyperparameters (`τ`, `w_norm`, `w_rank`) are tuned, not derived. Can they be made adaptive / data-driven / loss-balanced?
- The latent queries are never searched over at inference (one-shot prior forward). Could MCTS-style search, particle filters, MPC, or ensembling over Q recover Cosmos-Policy's planning capability without paying its pixel-rollout cost?
- No failure-mode analysis or dedicated Limitations section. What does Being-H0.7 fail on that vanilla VLAs or pixel-WAMs handle? The RoboCasa gap (62.1 vs Cosmos-Policy 67.1) hints that pixel-rollout still has an edge on long-horizon kitchen generalization.
- Being-H0.7 drops general VL knowledge that Being-H0.5 kept. Does the latent substrate compose with language priors if VL data is re-introduced during pretraining?
- The frozen-ViT + Perceiver-resampler posterior encoder is heavy; can a cheaper encoder (e.g., action-tokenized future, language-captioned future, pose-only future) preserve alignment quality?
