#!/usr/bin/env python3
"""Fetch latest arXiv papers matching a query YAML into the local KB.

Writes metadata to papers/YYYY-MM/<arxiv_id>/metadata.json.
Skips papers already present (by arxiv_id); for duplicates, merges the
`matched_groups` field so we know every group the paper hit.

Usage:
    python scripts/arxiv_fetch.py --query-file queries/wam_vla.yaml
    python scripts/arxiv_fetch.py --group vla --max-per-group 50
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

try:
    import yaml
except ImportError:
    sys.exit("error: pyyaml not installed. Run: pip install pyyaml")

REPO = Path(__file__).resolve().parent.parent
PAPERS_DIR = REPO / "papers"

ATOM_NS = {
    "atom": "http://www.w3.org/2005/Atom",
    "arxiv": "http://arxiv.org/schemas/atom",
}
API = "http://export.arxiv.org/api/query"


def build_query(keywords: list[str], categories: list[str]) -> str:
    parts = []
    for k in keywords:
        if " AND " in k or " OR " in k:
            parts.append(f"({k})")
        elif " " in k:
            parts.append(f'all:"{k}"')
        else:
            parts.append(f"all:{k}")
    kw = " OR ".join(parts)
    if categories:
        cats = " OR ".join(f"cat:{c}" for c in categories)
        return f"({kw}) AND ({cats})"
    return kw


def fetch(query: str, max_results: int) -> list[dict]:
    params = {
        "search_query": query,
        "start": 0,
        "max_results": max_results,
        "sortBy": "submittedDate",
        "sortOrder": "descending",
    }
    url = f"{API}?{urllib.parse.urlencode(params)}"
    with urllib.request.urlopen(url, timeout=30) as r:
        data = r.read()
    root = ET.fromstring(data)
    papers = []
    for entry in root.findall("atom:entry", ATOM_NS):
        arxiv_url = entry.find("atom:id", ATOM_NS).text.strip()
        tail = arxiv_url.rsplit("/", 1)[-1]
        canonical = re.sub(r"v\d+$", "", tail)
        title = " ".join(entry.find("atom:title", ATOM_NS).text.split())
        summary = " ".join(entry.find("atom:summary", ATOM_NS).text.split())
        authors = [a.find("atom:name", ATOM_NS).text for a in entry.findall("atom:author", ATOM_NS)]
        published = entry.find("atom:published", ATOM_NS).text
        updated = entry.find("atom:updated", ATOM_NS).text
        primary = entry.find("arxiv:primary_category", ATOM_NS)
        primary_cat = primary.attrib["term"] if primary is not None else ""
        cats = [c.attrib["term"] for c in entry.findall("atom:category", ATOM_NS)]
        pdf_url = ""
        for link in entry.findall("atom:link", ATOM_NS):
            if link.attrib.get("title") == "pdf":
                pdf_url = link.attrib["href"]
        papers.append({
            "arxiv_id": canonical,
            "version": tail,
            "title": title,
            "summary": summary,
            "authors": authors,
            "published": published,
            "updated": updated,
            "primary_category": primary_cat,
            "categories": cats,
            "abs_url": arxiv_url,
            "pdf_url": pdf_url,
        })
    return papers


def existing_index() -> dict[str, Path]:
    if not PAPERS_DIR.exists():
        return {}
    idx = {}
    for meta in PAPERS_DIR.rglob("metadata.json"):
        idx[meta.parent.name] = meta.parent
    return idx


def _term_matches(term: str, text: str) -> bool:
    term = term.strip().strip('"').lower()
    return bool(term) and term in text


def _keyword_matches(keyword: str, text: str) -> bool:
    """Evaluate a single keyword's AND/OR expression against text.

    Splits on top-level AND first (all sub-expressions must match), then on
    OR within each sub-expression (any sub-term must match). Plain keywords
    fall through as a single term.
    """
    and_parts = re.split(r"\s+AND\s+", keyword, flags=re.IGNORECASE)
    for ap in and_parts:
        or_parts = re.split(r"\s+OR\s+", ap, flags=re.IGNORECASE)
        if not any(_term_matches(p, text) for p in or_parts):
            return False
    return True


def keyword_in_text(keywords: list[str], text: str) -> bool:
    t = text.lower()
    return any(_keyword_matches(k, t) for k in keywords)


def save_paper(paper: dict, group: str, index: dict[str, Path]) -> str:
    arxiv_id = paper["arxiv_id"]
    if arxiv_id in index:
        meta_path = index[arxiv_id] / "metadata.json"
        meta = json.loads(meta_path.read_text())
        groups = set(meta.get("matched_groups", []))
        if group in groups:
            return "dup"
        groups.add(group)
        meta["matched_groups"] = sorted(groups)
        meta_path.write_text(json.dumps(meta, indent=2))
        return "group-added"
    month = paper["published"][:7]
    d = PAPERS_DIR / month / arxiv_id
    d.mkdir(parents=True, exist_ok=True)
    paper["matched_groups"] = [group]
    paper["fetched_at"] = datetime.now(timezone.utc).isoformat()
    (d / "metadata.json").write_text(json.dumps(paper, indent=2))
    index[arxiv_id] = d
    return "new"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--query-file", default=str(REPO / "queries" / "wam_vla.yaml"))
    ap.add_argument("--max-per-group", type=int, default=30)
    ap.add_argument("--sleep", type=float, default=3.0,
                    help="seconds between API calls (arXiv asks for >=3s)")
    ap.add_argument("--group", help="only run this group name")
    args = ap.parse_args()

    cfg = yaml.safe_load(Path(args.query_file).read_text())
    filters = cfg.get("filters", {}) or {}
    min_year = int(filters.get("min_year", 0))
    drop_title = [t.lower() for t in filters.get("drop_title_contains", [])]
    require_match = bool(filters.get("require_abstract_match", True))

    index = existing_index()
    new_total = 0
    per_group: dict[str, dict] = {}

    groups = cfg["groups"]
    if args.group:
        groups = [g for g in groups if g["name"] == args.group]
        if not groups:
            sys.exit(f"no group named {args.group!r}")

    for i, g in enumerate(groups):
        q = build_query(g["keywords"], g.get("categories", []))
        try:
            papers = fetch(q, max_results=args.max_per_group)
        except Exception as e:
            per_group[g["name"]] = {"error": str(e)}
            continue
        added = 0
        kept = 0
        for p in papers:
            if min_year and int(p["published"][:4]) < min_year:
                continue
            if any(d in p["title"].lower() for d in drop_title):
                continue
            if require_match and not keyword_in_text(g["keywords"], p["title"] + " " + p["summary"]):
                continue
            kept += 1
            status = save_paper(p, g["name"], index)
            if status == "new":
                added += 1
        per_group[g["name"]] = {"fetched": len(papers), "kept": kept, "new": added}
        new_total += added
        if i < len(groups) - 1:
            time.sleep(args.sleep)

    print(json.dumps({"new_total": new_total, "per_group": per_group}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
