# Gaps
- How to jointly finetune (or LoRA) V-JEPA 2 with action supervision without destroying its temporal priors?
- Do V-JEPA 2 embeddings still carry policy priors for wrist/egocentric cameras, which dominate fine manipulation and are under-represented in V-JEPA 2 internet-video pretraining?
- Can predictive embeddings be made action-conditioned (like a latent world model) rather than passive video features, closing the gap to dual-branch WAM training (e.g., Being-H0-style hand-motion priors)?
- V-JEPA 2 is trained on natural video; does it encode contact, force, or bimanual coordination priors that RoboTwin2.0 hard-split still needs (domain-randomized only 17.7%)?
- Does the Flamingo-style sparse gated fusion interact with action chunking — e.g., should V-JEPA 2 tokens be refreshed per chunk or per step?
- Can V-JEPA 2's predictor head be repurposed as an auxiliary future-latent-prediction loss during VLA training (dual-branch: action branch + predictive branch), rather than only a frozen feature source?
- How does this compare against diffusion-video-policy baselines (Vidar, FlowVLA) on the same benchmarks?
