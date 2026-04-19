# Seeds

Anchor papers and half-formed ideas that steer Dr. Heidi's ideation.

## How to add a seed

Drop a markdown file here: `seeds/<short-slug>.md`

```markdown
---
kind: paper | idea
arxiv_id: 2404.12345   # if kind=paper
tags: [vla, long-horizon]
priority: high | medium | low
---

## Why this matters to me
<1-3 sentences: what you find promising, what gap you see>

## What I want to build on
- <specific aspect 1>
- <specific aspect 2>

## Open questions
- <...>
```

## How Dr. Heidi uses seeds

- `paper-scout` uses seed tags to weight relevance.
- `ideate` reads every seed + recent paper digests; every generated idea must cite ≥3 unique recent papers from `papers/` (seeds are optional and cited only if directly relevant).
- `reviewer` checks new ideas (including against existing `ideas/` to avoid rehashing your own direction).
