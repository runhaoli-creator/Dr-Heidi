---
name: paper-scout
description: Fetch the latest arXiv papers matching Dr. Heidi's WAM/VLA query set and save new entries to papers/YYYY-MM/<arxiv_id>/metadata.json. Run at the start of an ideation session or daily via cron. Invoke when the user says "find new papers", "scan arxiv", "refresh the KB", or when `ideate` needs fresh inputs.
---

# paper-scout

Pulls recent arXiv papers into Dr. Heidi's local knowledge base.

## When to use
- Start of an ideation session (ensures fresh inputs before `/ideate`).
- User asks to "scan arxiv", "find new papers", or "refresh the KB".
- On a daily cron (see `schedule` skill).

## How to run

```bash
python scripts/arxiv_fetch.py --query-file queries/wam_vla.yaml --max-per-group 30
```

Flags:
- `--group <name>` — run only one query group (e.g., `vla`, `wam`)
- `--max-per-group N` — cap per group (default 30)
- `--sleep S` — throttle between API calls (default 3.0s, arXiv policy)

Output is a JSON summary:
```json
{"new_total": 7, "per_group": {"vla": {"fetched": 30, "kept": 24, "new": 3}, ...}}
```

## What it does
1. Loads query groups from `queries/wam_vla.yaml`.
2. Hits `export.arxiv.org/api/query` per group (submitted-date desc).
3. Post-filters: `min_year`, `drop_title_contains`, `require_abstract_match`.
4. Dedupes by canonical `arxiv_id` against existing `papers/**/metadata.json`.
5. New papers → `papers/YYYY-MM/<arxiv_id>/metadata.json`. Existing papers matched by a new group → `matched_groups` updated in place.

## After running
- Report the `new_total` and the most interesting titles (by user's `seeds/` tags).
- Suggest `paper-digest` on the top 3–5 candidates.
- If `new_total == 0`, say so and skip follow-ups.

## Editing queries
`queries/wam_vla.yaml` — keywords are OR'd within a group, AND'd with categories. Use `"quoted phrases"` for multi-word terms. Add a new group rather than overstuffing one. Bump `updated:` when you edit.

## Do not
- Do NOT commit fetched metadata without showing the user the new list first.
- Do NOT push to Zotero automatically — that's a separate step.
- Do NOT fetch PDFs here; `paper-digest` handles that on-demand.
