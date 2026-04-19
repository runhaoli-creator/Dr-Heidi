"""Session/run discovery and caching.

Maintains an in-memory map run_id -> RunSpan to avoid re-scanning JSONLs
on every request. Cache invalidates by file mtime.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from .parser import RunSpan, build_run_events, detect_runs, discover_sessions, project_label


CLAUDE_PROJECTS = Path.home() / ".claude" / "projects"


@dataclass
class _CacheEntry:
    mtime: float
    runs: list[RunSpan]


class RunRegistry:
    def __init__(self, projects_dir: Path = CLAUDE_PROJECTS):
        self.projects_dir = projects_dir
        self._cache: dict[Path, _CacheEntry] = {}

    def list_runs(self) -> list[RunSpan]:
        all_runs: list[RunSpan] = []
        for sess in discover_sessions(self.projects_dir):
            all_runs.extend(self._runs_for_session(sess))
        # Newest first
        all_runs.sort(key=lambda r: r.start_ts, reverse=True)
        return all_runs

    def get_run(self, run_id: str) -> Optional[RunSpan]:
        for run in self.list_runs():
            if run.run_id == run_id:
                return run
        return None

    def get_run_events(self, run_id: str):
        run = self.get_run(run_id)
        if not run:
            return None
        return build_run_events(run)

    def _runs_for_session(self, sess_jsonl: Path) -> list[RunSpan]:
        try:
            mtime = sess_jsonl.stat().st_mtime
        except FileNotFoundError:
            return []
        cached = self._cache.get(sess_jsonl)
        if cached and cached.mtime == mtime:
            return cached.runs
        runs = detect_runs(sess_jsonl)
        self._cache[sess_jsonl] = _CacheEntry(mtime, runs)
        return runs

    def project_summary(self) -> list[dict]:
        """Group runs by project, return summary list."""
        runs = self.list_runs()
        by_proj: dict[str, list[RunSpan]] = {}
        for r in runs:
            label = project_label(r.session_jsonl)
            by_proj.setdefault(label, []).append(r)
        out = []
        for label, rs in sorted(by_proj.items()):
            out.append({
                "project_label": label,
                "run_count": len(rs),
                "newest": rs[0].start_ts if rs else None,
            })
        return out
