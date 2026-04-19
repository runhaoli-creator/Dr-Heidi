"""Parse Claude Code session JSONL files into normalized event streams.

Reads:
- Parent session JSONL: ~/.claude/projects/<encoded-cwd>/<session>.jsonl
- Per-subagent JSONLs:  ~/.claude/projects/<encoded-cwd>/<session>/subagents/agent-<id>.jsonl
- Per-subagent meta:    ~/.claude/projects/<encoded-cwd>/<session>/subagents/agent-<id>.meta.json

Produces a flat, time-ordered list of `Event` dicts with stable agent attribution.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Iterator, Optional

from .events import (
    EVT_AGENT_DONE,
    EVT_AGENT_SPAWN,
    EVT_AGENT_TEXT,
    EVT_AGENT_THINKING,
    EVT_AGENT_TOOL_RESULT,
    EVT_AGENT_TOOL_USE,
    EVT_FILE_WRITE,
    EVT_RUN_DONE,
    KNOWN_AGENT_ROLES,
    MK_DRAFT_WRITTEN,
    MK_FIRST_CRITIQUE,
    MK_NOVELTY_CALLED,
    MK_NOVELTY_RETURNED,
    MK_REVISION_STARTED,
    MK_RUN_DONE,
    MK_RUN_STARTED,
    MK_VALIDATOR_STAMPED,
    MK_VERDICT_DECIDED,
    Event,
)


AGENT_ID_FROM_RESULT = re.compile(r"agentId:\s*([0-9a-f]{16,32})")
TS_RE = re.compile(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z")


def _infer_role_from_description(description: str, default: str = "unknown") -> str:
    """Map a free-form spawn description back to one of the canonical roles.

    Used for legacy sessions where every subagent was 'general-purpose' and
    only the description hints at the intended role.
    """
    d = (description or "").lower()
    if "lead" in d or "draft" in d or "lead-researcher" in d:
        return "lead-researcher"
    if "review" in d:  # "Lean review", "Review", "R1 review"
        return "reviewer"
    if "novelty" in d or "prior-art" in d or "prior art" in d:
        return "novelty-checker"
    if "validate" in d or "validator" in d:
        return "idea-validator"
    if "digest" in d:
        return "digest"
    return default


@dataclass
class SubagentMeta:
    agent_id: str
    agent_type: str
    description: str
    jsonl_path: Path


# ---------------------------------------------------------------------------
# Discovery helpers
# ---------------------------------------------------------------------------

def discover_sessions(claude_projects_dir: Path) -> list[Path]:
    """Return all session JSONL files under ~/.claude/projects/<encoded>/<session>.jsonl."""
    sessions = []
    if not claude_projects_dir.exists():
        return sessions
    for project_dir in sorted(claude_projects_dir.iterdir()):
        if not project_dir.is_dir():
            continue
        for f in sorted(project_dir.glob("*.jsonl")):
            sessions.append(f)
    return sessions


def project_label(session_jsonl: Path) -> str:
    """Best-effort human label from the encoded project dir name.

    e.g., '-Users-runhaoli-Desktop-Dr--Heidi' -> 'Dr Heidi'
    """
    stem = session_jsonl.parent.name
    parts = stem.split("-")
    # find the project name token (last meaningful segment)
    if "Desktop" in parts:
        idx = parts.index("Desktop")
        rest = [p for p in parts[idx + 1:] if p]
        return " ".join(rest).replace("  ", " ").strip()
    return stem


# ---------------------------------------------------------------------------
# Subagent index
# ---------------------------------------------------------------------------

def index_subagents(session_jsonl: Path) -> dict[str, SubagentMeta]:
    """Map agentId -> SubagentMeta for all subagents under this session."""
    base = session_jsonl.with_suffix("")  # strip .jsonl
    sa_dir = base / "subagents"
    out: dict[str, SubagentMeta] = {}
    if not sa_dir.exists():
        return out
    for jsonl in sorted(sa_dir.glob("agent-*.jsonl")):
        m = re.match(r"agent-(.+)\.jsonl$", jsonl.name)
        if not m:
            continue
        agent_id = m.group(1)
        meta_path = jsonl.with_suffix(".meta.json")
        agent_type = "unknown"
        description = ""
        if meta_path.exists():
            try:
                meta = json.loads(meta_path.read_text())
                agent_type = meta.get("agentType", "unknown")
                description = meta.get("description", "")
            except json.JSONDecodeError:
                pass
        out[agent_id] = SubagentMeta(agent_id, agent_type, description, jsonl)
    return out


# ---------------------------------------------------------------------------
# Run detection
# ---------------------------------------------------------------------------

@dataclass
class RunSpan:
    run_id: str  # synthesized: <session_id>-<index>
    session_jsonl: Path
    start_ts: str
    end_ts: str
    start_uuid: str
    end_uuid: str
    agent_ids: list[str]
    agent_roles: list[str]  # ordered, deduped by appearance
    title: str  # short human-readable

    def to_summary(self) -> dict:
        return {
            "run_id": self.run_id,
            "session_id": self.session_jsonl.parent.name + "/" + self.session_jsonl.stem,
            "project_label": project_label(self.session_jsonl),
            "start_ts": self.start_ts,
            "end_ts": self.end_ts,
            "agent_count": len(self.agent_ids),
            "roles": sorted(set(self.agent_roles)),
            "title": self.title,
        }


def _parse_ts(ts: str) -> float:
    """Convert ISO timestamp to epoch seconds; tolerant of None."""
    if not ts:
        return 0.0
    try:
        from datetime import datetime, timezone

        if ts.endswith("Z"):
            ts = ts[:-1] + "+00:00"
        return datetime.fromisoformat(ts).timestamp()
    except Exception:
        return 0.0


def detect_runs(
    session_jsonl: Path,
    *,
    inactivity_gap_s: int = 1800,  # 30 min gap closes a run
    require_lead_or_reviewer: bool = True,
) -> list[RunSpan]:
    """Find ideation runs within a session.

    Heuristic: a run is a contiguous span of Agent tool_use events that
    includes at least one lead-researcher OR reviewer spawn, where consecutive
    spawns are within `inactivity_gap_s` seconds of each other. The span ends
    when no more Agent spawns occur within the gap.

    Default gap of 30 min handles long reviewer/validator runs without
    fragmenting; tunable via config.
    """
    spawns: list[dict] = []
    with session_jsonl.open() as f:
        for line in f:
            try:
                rec = json.loads(line)
            except json.JSONDecodeError:
                continue
            if rec.get("type") != "assistant":
                continue
            msg = rec.get("message", {})
            if not isinstance(msg, dict):
                continue
            for c in msg.get("content", []) or []:
                if not isinstance(c, dict):
                    continue
                if c.get("type") == "tool_use" and c.get("name") in ("Agent", "Task"):
                    inp = c.get("input", {}) or {}
                    raw_type = inp.get("subagent_type") or "general-purpose"
                    desc = inp.get("description", "")
                    # If raw type is generic, fall back to description-based inference
                    if raw_type in ("general-purpose", "unknown", ""):
                        inferred = _infer_role_from_description(desc, default=raw_type)
                    else:
                        inferred = raw_type
                    spawns.append({
                        "ts": rec.get("timestamp", ""),
                        "uuid": rec.get("uuid", ""),
                        "tool_use_id": c.get("id", ""),
                        "subagent_type": inferred,
                        "raw_subagent_type": raw_type,
                        "description": desc,
                    })
    if not spawns:
        return []

    # Need to map tool_use_id -> agent_id by re-scanning user/tool_result records
    spawn_to_agent_id: dict[str, str] = {}
    with session_jsonl.open() as f:
        for line in f:
            try:
                rec = json.loads(line)
            except json.JSONDecodeError:
                continue
            if rec.get("type") != "user":
                continue
            content = rec.get("message", {}).get("content", []) or []
            if not isinstance(content, list):
                continue
            for c in content:
                if not isinstance(c, dict) or c.get("type") != "tool_result":
                    continue
                tu_id = c.get("tool_use_id", "")
                if tu_id not in spawn_to_agent_id and tu_id:
                    raw = c.get("content")
                    blob = ""
                    if isinstance(raw, list):
                        for blk in raw:
                            if isinstance(blk, dict) and blk.get("type") == "text":
                                blob += blk.get("text", "")
                    elif isinstance(raw, str):
                        blob = raw
                    m = AGENT_ID_FROM_RESULT.search(blob)
                    if m:
                        spawn_to_agent_id[tu_id] = m.group(1)

    # Group spawns into runs by inactivity gap
    runs_data: list[list[dict]] = []
    current: list[dict] = []
    last_ts = 0.0
    for sp in spawns:
        ts = _parse_ts(sp["ts"])
        if current and (ts - last_ts) > inactivity_gap_s:
            runs_data.append(current)
            current = []
        current.append(sp)
        last_ts = ts
    if current:
        runs_data.append(current)

    # Filter: require at least one lead-researcher or reviewer spawn
    runs: list[RunSpan] = []
    session_id = session_jsonl.stem
    for idx, group in enumerate(runs_data):
        roles = [s["subagent_type"] for s in group]
        if require_lead_or_reviewer and not (
            "lead-researcher" in roles or "reviewer" in roles
        ):
            continue
        agent_ids = [spawn_to_agent_id.get(s["tool_use_id"], "") for s in group]
        agent_ids = [a for a in agent_ids if a]
        # Skip runs where we can't link any agent_id (broken/incomplete)
        if not agent_ids:
            continue
        # Title: first lead-researcher description, else first reviewer
        title = ""
        for s in group:
            if s["subagent_type"] == "lead-researcher":
                title = s["description"]
                break
        if not title:
            for s in group:
                if s["subagent_type"] == "reviewer":
                    title = s["description"]
                    break
        if not title:
            title = group[0]["description"] or f"run {idx + 1}"
        runs.append(RunSpan(
            run_id=f"{session_id}--{idx + 1}",
            session_jsonl=session_jsonl,
            start_ts=group[0]["ts"],
            end_ts=group[-1]["ts"],
            start_uuid=group[0]["uuid"],
            end_uuid=group[-1]["uuid"],
            agent_ids=agent_ids,
            agent_roles=roles,
            title=title,
        ))
    return runs


# ---------------------------------------------------------------------------
# Event extraction per subagent
# ---------------------------------------------------------------------------

def _looks_like_file_content(text: str) -> bool:
    """Heuristic: does this text look like file content rather than dialog?"""
    return text.startswith(("```", "---\n", "## ", "# "))


def _extract_subagent_events(
    sa: SubagentMeta,
    seq_start: int,
    *,
    role_override: Optional[str] = None,
) -> list[Event]:
    """Read one subagent's JSONL and emit normalized events.

    If `role_override` is provided (e.g., the parent's inferred subagent_type),
    it takes precedence over the meta.json's agentType — this lets us attribute
    legacy 'general-purpose' subagents correctly.
    """
    out: list[Event] = []
    seq = seq_start
    role = role_override or sa.agent_type
    if not sa.jsonl_path.exists():
        return out
    first_text_emitted = False  # for marker tracking
    with sa.jsonl_path.open() as f:
        for line in f:
            try:
                rec = json.loads(line)
            except json.JSONDecodeError:
                continue
            ts = rec.get("timestamp", "")
            msg = rec.get("message", {})
            if not isinstance(msg, dict):
                continue
            role = msg.get("role")
            content = msg.get("content", []) or []
            if not isinstance(content, list):
                # Sometimes content is a string for user records
                if role == "user" and isinstance(content, str):
                    # The very first user record carries the brief; skip emitting it as text
                    continue
                continue
            for c in content:
                if not isinstance(c, dict):
                    continue
                ctype = c.get("type")
                if role == "assistant" and ctype == "thinking":
                    out.append(Event(
                        seq=seq, ts=ts, type=EVT_AGENT_THINKING,
                        agent_role=role, agent_id=sa.agent_id,
                        payload={"text": c.get("thinking") or c.get("text", "")},
                    ))
                    seq += 1
                elif role == "assistant" and ctype == "text":
                    text = c.get("text", "")
                    out.append(Event(
                        seq=seq, ts=ts, type=EVT_AGENT_TEXT,
                        agent_role=role, agent_id=sa.agent_id,
                        payload={
                            "text": text,
                            "looks_like": "file_content" if _looks_like_file_content(text) else "speech",
                        },
                    ))
                    seq += 1
                    if not first_text_emitted and role == "reviewer":
                        # mark first reviewer text as "first critique"
                        out[-1].marker = MK_FIRST_CRITIQUE
                        first_text_emitted = True
                elif role == "assistant" and ctype == "tool_use":
                    name = c.get("name", "?")
                    args = c.get("input", {}) or {}
                    args_summary = _summarize_args(name, args)
                    ev = Event(
                        seq=seq, ts=ts, type=EVT_AGENT_TOOL_USE,
                        agent_role=role, agent_id=sa.agent_id,
                        payload={
                            "tool": name,
                            "tool_use_id": c.get("id", ""),
                            "args_summary": args_summary,
                        },
                    )
                    # If tool is Edit/Write to ideas/, emit a file.write afterward too
                    out.append(ev)
                    seq += 1
                    if name in ("Edit", "Write") and "file_path" in args:
                        path = args.get("file_path", "")
                        kind = _classify_file_write(path)
                        marker = None
                        if kind == "draft":
                            marker = MK_DRAFT_WRITTEN
                        out.append(Event(
                            seq=seq, ts=ts, type=EVT_FILE_WRITE,
                            agent_role=role, agent_id=sa.agent_id,
                            payload={"path": path, "kind": kind, "tool": name},
                            marker=marker,
                        ))
                        seq += 1
                elif role == "user" and ctype == "tool_result":
                    raw = c.get("content")
                    summary = _summarize_tool_result(raw)
                    out.append(Event(
                        seq=seq, ts=ts, type=EVT_AGENT_TOOL_RESULT,
                        agent_role=role, agent_id=sa.agent_id,
                        payload={
                            "tool_use_id": c.get("tool_use_id", ""),
                            "result_summary": summary,
                            "is_error": bool(c.get("is_error", False)),
                        },
                    ))
                    seq += 1

    # Emit a synthetic agent.done at the end
    if out:
        out.append(Event(
            seq=seq,
            ts=out[-1].ts,
            type=EVT_AGENT_DONE,
            agent_role=role,
            agent_id=sa.agent_id,
            payload={"description": sa.description},
        ))
    return out


def _summarize_args(tool: str, args: dict) -> str:
    """Compact args display for the UI."""
    if tool in ("Read", "Edit", "Write"):
        p = args.get("file_path", "")
        if p:
            # just the basename + parent
            from os.path import basename, dirname
            return basename(p) or p
    if tool == "Glob":
        return args.get("pattern", "")
    if tool == "Grep":
        pat = args.get("pattern", "")
        return pat[:60] + ("…" if len(pat) > 60 else "")
    if tool == "Bash":
        cmd = args.get("command", "")
        return cmd[:80].replace("\n", " ") + ("…" if len(cmd) > 80 else "")
    if tool == "WebSearch":
        return args.get("query", "")[:80]
    if tool == "WebFetch":
        return args.get("url", "")[:80]
    if tool in ("Task", "Agent"):
        return args.get("subagent_type", "") + ": " + args.get("description", "")[:60]
    # generic fallback
    keys = list(args.keys())[:3]
    return ", ".join(keys)


def _summarize_tool_result(raw) -> str:
    if isinstance(raw, str):
        return raw[:200].replace("\n", " ")
    if isinstance(raw, list):
        for blk in raw:
            if isinstance(blk, dict) and blk.get("type") == "text":
                return blk.get("text", "")[:200].replace("\n", " ")
    return ""


def _classify_file_write(path: str) -> str:
    """Categorize what kind of file is being written."""
    if "/ideas/_draft/" in path:
        return "draft"
    if "/ideas/_rejected/" in path:
        return "rejected"
    if "/ideas/" in path:
        return "accepted"
    if "/papers/" in path and path.endswith("notes.md"):
        return "digest_notes"
    if "/papers/" in path and path.endswith("gaps.md"):
        return "digest_gaps"
    if path.endswith(".md"):
        return "markdown"
    return "other"


# ---------------------------------------------------------------------------
# Top-level: build a flat event stream for one run
# ---------------------------------------------------------------------------

def build_run_events(run: RunSpan) -> list[Event]:
    """Build the full normalized event stream for one ideation run.

    Strategy:
    - Re-scan the parent JSONL for spawns + tool_results inside this run's window
    - For each spawn, locate the subagent meta by agent_id
    - Pull all events from each subagent's JSONL
    - Inject parent-side spawn / done / handoff events
    - Sort by timestamp, then by source-order for events within same ts
    """
    sa_index = index_subagents(run.session_jsonl)
    events: list[Event] = []
    seq = 0

    # Build a list of spawn records within the run window (using uuids as bounds)
    spawns_in_run: list[dict] = []
    in_window = False
    with run.session_jsonl.open() as f:
        for line in f:
            try:
                rec = json.loads(line)
            except json.JSONDecodeError:
                continue
            uu = rec.get("uuid", "")
            if uu == run.start_uuid:
                in_window = True
            if rec.get("type") == "assistant" and in_window:
                msg = rec.get("message", {})
                for c in msg.get("content", []) or []:
                    if isinstance(c, dict) and c.get("type") == "tool_use" and c.get("name") in ("Agent", "Task"):
                        inp = c.get("input", {}) or {}
                        raw_type = inp.get("subagent_type") or "general-purpose"
                        desc = inp.get("description", "")
                        if raw_type in ("general-purpose", "unknown", ""):
                            inferred = _infer_role_from_description(desc, default=raw_type)
                        else:
                            inferred = raw_type
                        spawns_in_run.append({
                            "ts": rec.get("timestamp", ""),
                            "uuid": uu,
                            "tool_use_id": c.get("id", ""),
                            "subagent_type": inferred,
                            "raw_subagent_type": raw_type,
                            "description": desc,
                            "run_in_background": inp.get("run_in_background", False),
                        })
            if uu == run.end_uuid and in_window:
                # include any spawn at the end_uuid; mark we will continue parsing
                # to capture downstream tool_results for that spawn
                continue
            # Continue to allow tool_results after end_uuid (background async returns)

    # Resolve agent_ids for these spawns
    tu_to_agent_id: dict[str, str] = {}
    with run.session_jsonl.open() as f:
        for line in f:
            try:
                rec = json.loads(line)
            except json.JSONDecodeError:
                continue
            if rec.get("type") != "user":
                continue
            content = rec.get("message", {}).get("content", []) or []
            if not isinstance(content, list):
                continue
            for c in content:
                if not isinstance(c, dict) or c.get("type") != "tool_result":
                    continue
                tu = c.get("tool_use_id", "")
                if not tu or tu in tu_to_agent_id:
                    continue
                raw = c.get("content")
                blob = ""
                if isinstance(raw, list):
                    for blk in raw:
                        if isinstance(blk, dict) and blk.get("type") == "text":
                            blob += blk.get("text", "")
                elif isinstance(raw, str):
                    blob = raw
                m = AGENT_ID_FROM_RESULT.search(blob)
                if m:
                    tu_to_agent_id[tu] = m.group(1)

    # Emit run_started marker
    events.append(Event(
        seq=seq, ts=run.start_ts, type=EVT_AGENT_DONE,  # placeholder, will replace
        marker=MK_RUN_STARTED, payload={"title": run.title},
    ))
    # Replace with a clean marker event
    events[-1] = Event(seq=seq, ts=run.start_ts, type="marker",
                       marker=MK_RUN_STARTED, payload={"title": run.title})
    seq += 1

    for sp in spawns_in_run:
        agent_id = tu_to_agent_id.get(sp["tool_use_id"], "")
        events.append(Event(
            seq=seq,
            ts=sp["ts"],
            type=EVT_AGENT_SPAWN,
            agent_role=sp["subagent_type"],
            agent_id=agent_id or None,
            payload={
                "subagent_type": sp["subagent_type"],
                "description": sp["description"],
                "tool_use_id": sp["tool_use_id"],
                "run_in_background": sp["run_in_background"],
            },
            marker=(MK_NOVELTY_CALLED if sp["subagent_type"] == "novelty-checker" else None),
        ))
        seq += 1
        if not agent_id:
            # Can't reach this agent's internals — skip to next
            continue
        sa = sa_index.get(agent_id)
        if not sa:
            continue
        sub_events = _extract_subagent_events(
            sa, seq, role_override=sp["subagent_type"]
        )
        events.extend(sub_events)
        seq += len(sub_events)

        # If this is a novelty-checker, mark its done event with novelty_returned
        if sp["subagent_type"] == "novelty-checker" and sub_events:
            for ev in reversed(sub_events):
                if ev.type == EVT_AGENT_DONE:
                    ev.marker = MK_NOVELTY_RETURNED
                    break

        # If this is a reviewer, look for verdict markers in its text events
        if sp["subagent_type"] == "reviewer":
            for ev in sub_events:
                if ev.type == EVT_AGENT_TEXT:
                    txt = ev.payload.get("text", "").lower()
                    if "**verdict:**" in txt or "verdict: accept" in txt or "verdict: improve" in txt or "verdict: reject" in txt:
                        ev.marker = MK_VERDICT_DECIDED
                        break
            # Also flag revision_started — first text containing "## Revised"
            for ev in sub_events:
                if ev.type == EVT_AGENT_TEXT and "## Revised" in ev.payload.get("text", ""):
                    ev.marker = MK_REVISION_STARTED
                    break

        # If this is the validator, mark its last text/verdict as validator_stamped
        if sp["subagent_type"] == "idea-validator" and sub_events:
            for ev in reversed(sub_events):
                if ev.type == EVT_AGENT_TEXT:
                    ev.marker = MK_VALIDATOR_STAMPED
                    break

    # Sort events stably by timestamp; preserve seq for ties
    events.sort(key=lambda e: (_parse_ts(e.ts), e.seq))
    # Re-number seq after sort
    for i, ev in enumerate(events):
        ev.seq = i

    # Append a synthetic run_done marker
    if events:
        last_ts = events[-1].ts
        events.append(Event(
            seq=len(events), ts=last_ts, type="marker",
            marker=MK_RUN_DONE, payload={},
        ))

    return events


def events_to_json(events: Iterable[Event]) -> list[dict]:
    return [e.to_json() for e in events]
