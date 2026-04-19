"""Read papers/ and ideas/ from the project root for the library/inspector."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Optional


PROJECT_ROOT = Path(__file__).resolve().parents[3]  # webui/backend/dr_heidi_webui/papers.py -> repo root


def list_papers(project_root: Path = PROJECT_ROOT) -> list[dict]:
    """Return all papers in the KB with digest status."""
    papers_dir = project_root / "papers"
    if not papers_dir.exists():
        return []
    out = []
    for meta_path in sorted(papers_dir.rglob("metadata.json")):
        paper_dir = meta_path.parent
        try:
            meta = json.loads(meta_path.read_text())
        except json.JSONDecodeError:
            continue
        out.append({
            "arxiv_id": meta.get("arxiv_id", paper_dir.name),
            "title": meta.get("title", "(unknown title)"),
            "primary_category": meta.get("primary_category", ""),
            "published": meta.get("published", ""),
            "matched_groups": meta.get("matched_groups", []),
            "digested": (paper_dir / "notes.md").exists(),
        })
    out.sort(key=lambda p: p["published"], reverse=True)
    return out


def read_paper_part(arxiv_id: str, part: str, project_root: Path = PROJECT_ROOT) -> Optional[str]:
    """Return notes.md / gaps.md / metadata for one paper."""
    papers_dir = project_root / "papers"
    if not papers_dir.exists():
        return None
    for meta_path in papers_dir.rglob("metadata.json"):
        if meta_path.parent.name == arxiv_id:
            d = meta_path.parent
            if part == "notes":
                p = d / "notes.md"
                return p.read_text() if p.exists() else None
            if part == "gaps":
                p = d / "gaps.md"
                return p.read_text() if p.exists() else None
            if part == "metadata":
                return meta_path.read_text()
    return None


def list_ideas(project_root: Path = PROJECT_ROOT) -> list[dict]:
    """Return all idea files (accepted, drafts, rejected)."""
    ideas_dir = project_root / "ideas"
    if not ideas_dir.exists():
        return []
    out = []
    for status, sub in (("accepted", ideas_dir), ("draft", ideas_dir / "_draft"), ("rejected", ideas_dir / "_rejected")):
        if not sub.exists():
            continue
        # For accepted, only top-level .md files (not in _draft/_rejected)
        if status == "accepted":
            files = [f for f in sub.glob("*.md") if f.parent == ideas_dir]
        else:
            files = list(sub.glob("*.md"))
        for f in files:
            out.append({
                "slug": f.stem,
                "status": status,
                "path": str(f.relative_to(project_root)),
                "size": f.stat().st_size,
            })
    return out


def read_idea(slug: str, project_root: Path = PROJECT_ROOT) -> Optional[str]:
    ideas_dir = project_root / "ideas"
    for sub in (ideas_dir, ideas_dir / "_draft", ideas_dir / "_rejected"):
        p = sub / f"{slug}.md"
        if p.exists():
            return p.read_text()
    return None
