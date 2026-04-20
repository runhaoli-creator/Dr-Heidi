# Gaps

- If pixel-space future prediction at test time is unnecessary, can we replace L_vid with a cheaper latent-only objective (JEPA-style latent prediction, masked video modeling, or contrastive action-conditioned prediction) and match or beat Fast-WAM? This directly attacks the "can we do without pixel futures entirely?" question.
- What does video co-training mechanistically buy — physical priors, temporal smoothness, action-conditioned features, or just bigger effective batch? Needs representation-level probes (linear probes for depth/flow/contact, attention map analysis) across the Fast-WAM / Fast-WAM-Joint / w.o.-co-train variants.
- The paper asserts "world representations are shaped by video co-training" but never visualizes or probes these representations; open seed for a diagnostic study of latent WAM internals.
- Does the "skip test-time imagination" finding hold under long-horizon closed-loop rollouts? Fast-WAM deliberately omits the outer auto-regressive loop; whether imagined futures matter more in AR settings (Motus-style) is untested.
- How does lambda (video vs action loss weight) and the future horizon T trade off against data scale? No sweep is reported.
- Can video co-training from non-robot video (egocentric human, web-scale) give the same representation benefit without ever requiring robot-future imagination — merging the Fast-WAM insight with Being-H0.7-style human-video priors?
- Is the benefit robust OOD? All evaluations are in-distribution (LIBERO, RoboTwin randomized scenes, one real task); removing test-time imagination may hurt compositional or novel-object generalization that future-rollout gives "for free."
- Comparison missing: a VLA backbone trained on the same robot video but with a non-generative auxiliary objective (masked autoencoding, next-latent prediction) — needed to attribute the gain specifically to flow-matching video prediction vs "any video auxiliary loss."
