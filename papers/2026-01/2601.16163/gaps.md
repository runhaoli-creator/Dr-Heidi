# Gaps
- Pixel rollout costs ~5 s/chunk; can V(s') be learned over a compressed latent world-action tokenizer (K queries, Being-H0.7-style) instead of full HxW frames?
- World model fit on only 648 rollouts; how does V accuracy scale, and can synthetic rollouts from the video prior substitute?
- Depth=1 best-of-N vs deeper search unstudied; at fixed compute, when does depth beat width?
- Q(s,a) underperforms only under low-data + high-dim conditioning; does a tokenized Q close the gap, at what scale?
- LFI wastes HxW on duplicated scalars; would a 1D modality-token channel keep priors while shrinking FLOPs?
- No history: injecting k past latents on POMDPs untested.
- 50/50 and 90/10 mixes are heuristics; adaptive curricula unexplored.
