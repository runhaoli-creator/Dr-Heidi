---
name: paper-digest
description: Produce a structured digest of one arXiv paper — downloads the PDF if missing, extracts text with pdftotext, and writes notes.md + gaps.md under papers/YYYY-MM/<id>/. Invoke when promoting a paper from metadata-only to fully digested, or when the user asks to "read", "digest", "summarize paper X", or "extract gaps from <id>".
---

# paper-digest

Turns a metadata-only paper entry into a structured digest grounded in the actual PDF.

## Input
An arXiv id (e.g., `2404.12345`) or path to `metadata.json`.

## Steps

1. **Locate.** Find the paper directory under `papers/` by arxiv_id (use Glob `papers/**/<id>/metadata.json`). Error clearly if missing — suggest `paper-scout` first.

2. **Fetch PDF if missing.**
   ```bash
   mkdir -p papers/<YYYY-MM>/<id>/pdf
   curl -sL -o papers/<YYYY-MM>/<id>/pdf/paper.pdf "<pdf_url from metadata.json>"
   ```

3. **Extract text.**
   ```bash
   pdftotext papers/<YYYY-MM>/<id>/pdf/paper.pdf papers/<YYYY-MM>/<id>/pdf/paper.txt
   ```
   Default (reflow) mode — produces flush-left text. Do NOT use `-layout`; it preserves column indentation and leaves every line leading with 10-30 spaces.

4. **Read selectively.** Do NOT load the whole paper into context. Use:
   - `Read` the abstract/intro via a short offset window.
   - `Grep` for section headers: `^(Abstract|Introduction|Method|Approach|Experiments|Results|Limitations|Conclusion|Related Work)`.
   - Sample the method section (first ~200 lines after its header) and the results section (first ~150 lines).

5. **Write `notes.md`** at the paper dir with this exact structure (≤500 words total):

    ```markdown
    # <Title>
    arxiv: <id> | <primary_category> | published <YYYY-MM-DD>
    authors: <comma-separated, truncate to 5 + "et al.">

    ## Problem
    <1–3 sentences: what they're solving, why it's hard>

    ## Method
    <one paragraph, enough to reproduce mentally — inputs, architecture/algorithm, training/inference loop, key trick>

    ## Key Results
    - <metric → number → vs baseline>
    - ...

    ## Limitations
    **Author-stated:**
    - <...>
    **Observed:**
    - <...>

    ## Open Questions & Gaps
    - <what this paper does NOT answer that could seed a new direction>
    - ...

    ## Connections
    - Related KB papers: <arxiv_ids, if any>
    - Seeds for direction: <free-form tags>
    ```

6. **Write `gaps.md`** — just the "Open Questions & Gaps" bullets (no heading shell needed beyond `# Gaps`). `gap-analyst` will aggregate these later.

## Principles
- **Ground everything in the paper text.** No speculation; no invented numbers.
- Keep Limitations strictly split: what the authors admit vs. what you infer.
- "Open Questions & Gaps" must be *actionable for research*, not generic ("more data would help"). Prefer: "Method X assumes <Y>; untested when <Y> violated."
- Stop at 500 words. Long digests degrade ideation.

## Do not
- Do not modify `metadata.json` (it's the raw record).
- Do not digest a paper you can't locate in `papers/` — run `paper-scout` first.
- Do not skip the PDF and digest from abstract alone. If PDF download fails, report the failure and stop.
