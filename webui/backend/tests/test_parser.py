"""Parser tests against real Claude Code session JSONLs.

These tests are skipped if the user's Claude Code projects directory
doesn't contain a Dr. Heidi session (or the legacy "Dr. Agent" session
directory from before the project was renamed). CI users would need
their own fixtures.
"""
from __future__ import annotations

from pathlib import Path

import pytest

from dr_heidi_webui.events import (
    EVT_AGENT_DONE,
    EVT_AGENT_SPAWN,
    EVT_AGENT_TEXT,
    EVT_AGENT_TOOL_USE,
    EVT_FILE_WRITE,
    MK_NOVELTY_CALLED,
    MK_NOVELTY_RETURNED,
    MK_RUN_DONE,
    MK_RUN_STARTED,
    MK_VALIDATOR_STAMPED,
)
from dr_heidi_webui.parser import (
    build_run_events,
    detect_runs,
    discover_sessions,
    index_subagents,
    project_label,
)


CLAUDE_PROJECTS = Path.home() / ".claude" / "projects"
HEIDI_DIR = CLAUDE_PROJECTS / "-Users-runhaoli-Desktop-Dr--Heidi"
AGENT_DIR = CLAUDE_PROJECTS / "-Users-runhaoli-Desktop-Dr--Agent"


def _heidi_session() -> Path | None:
    if not HEIDI_DIR.exists():
        return None
    sessions = sorted(HEIDI_DIR.glob("*.jsonl"))
    return sessions[0] if sessions else None


def _agent_session() -> Path | None:
    if not AGENT_DIR.exists():
        return None
    sessions = sorted(AGENT_DIR.glob("*.jsonl"))
    return sessions[0] if sessions else None


def test_discover_sessions():
    sessions = discover_sessions(CLAUDE_PROJECTS)
    assert isinstance(sessions, list)
    # If any sessions exist, they should all be .jsonl files
    for s in sessions:
        assert s.suffix == ".jsonl"


def test_project_label():
    fake = Path("/tmp/-Users-runhaoli-Desktop-Dr--Heidi/abc.jsonl")
    label = project_label(fake)
    assert "Dr" in label and "Heidi" in label


@pytest.mark.skipif(_heidi_session() is None, reason="no Dr. Heidi session")
def test_index_subagents_heidi():
    s = _heidi_session()
    sa = index_subagents(s)
    assert len(sa) > 0
    # Every subagent should have a known role or 'unknown'
    for agent_id, meta in sa.items():
        assert meta.agent_id == agent_id
        assert meta.jsonl_path.exists()
        assert meta.agent_type  # non-empty


@pytest.mark.skipif(_heidi_session() is None, reason="no Dr. Heidi session")
def test_detect_runs_heidi_finds_at_least_one():
    s = _heidi_session()
    runs = detect_runs(s)
    assert len(runs) >= 1, "should detect at least one ideation run in Dr. Heidi session"
    for r in runs:
        assert r.start_ts <= r.end_ts
        assert "lead-researcher" in r.agent_roles or "reviewer" in r.agent_roles
        assert len(r.agent_ids) > 0


@pytest.mark.skipif(_agent_session() is None, reason="no legacy session present")
def test_detect_runs_agent_session_finds_runs():
    s = _agent_session()
    runs = detect_runs(s)
    assert len(runs) >= 1
    # Round 1 had bidirectional-flow + contact-reward + learned-working-memory
    # so we expect runs that include at least lead+reviewer
    for r in runs:
        assert "lead-researcher" in r.agent_roles or "reviewer" in r.agent_roles


@pytest.mark.skipif(_heidi_session() is None, reason="no Dr. Heidi session")
def test_build_run_events_heidi_has_expected_event_types():
    s = _heidi_session()
    runs = detect_runs(s)
    assert runs
    events = build_run_events(runs[0])
    types = {e.type for e in events}
    # Must have spawns and at least some agent-side events
    assert EVT_AGENT_SPAWN in types
    # Full pipeline runs should have all of these
    assert EVT_AGENT_TOOL_USE in types
    assert EVT_AGENT_DONE in types


@pytest.mark.skipif(_heidi_session() is None, reason="no Dr. Heidi session")
def test_build_run_events_marker_set_includes_run_done():
    s = _heidi_session()
    runs = detect_runs(s)
    events = build_run_events(runs[0])
    markers = {e.marker for e in events if e.marker}
    assert MK_RUN_STARTED in markers
    assert MK_RUN_DONE in markers


@pytest.mark.skipif(_heidi_session() is None, reason="no Dr. Heidi session")
def test_build_run_events_chronological():
    s = _heidi_session()
    runs = detect_runs(s)
    events = build_run_events(runs[0])
    # seq must be monotonic
    assert all(events[i].seq < events[i + 1].seq for i in range(len(events) - 1))
    # timestamps mostly monotonic (allow ties)
    last = ""
    for e in events:
        if e.ts:
            assert e.ts >= last
            last = e.ts


@pytest.mark.skipif(_heidi_session() is None, reason="no Dr. Heidi session")
def test_build_run_events_attribution_known_roles():
    s = _heidi_session()
    runs = detect_runs(s)
    events = build_run_events(runs[0])
    # Every agent.* event should have a non-empty agent_role
    for e in events:
        if e.type.startswith("agent.") and e.type != "agent.spawn":
            # spawn includes synthetic; subagent-internal events must carry role
            assert e.agent_role, f"missing agent_role on {e.type} at seq {e.seq}"


@pytest.mark.skipif(_heidi_session() is None, reason="no Dr. Heidi session")
def test_build_run_events_no_orphan_subagents():
    """Every spawn with an agent_id should be followed by at least one agent event from that id."""
    s = _heidi_session()
    runs = detect_runs(s)
    events = build_run_events(runs[0])
    spawns = [e for e in events if e.type == EVT_AGENT_SPAWN and e.agent_id]
    by_agent = {}
    for e in events:
        if e.agent_id and e.type != EVT_AGENT_SPAWN:
            by_agent.setdefault(e.agent_id, []).append(e)
    for sp in spawns:
        sub_events = by_agent.get(sp.agent_id, [])
        assert sub_events, f"spawn for {sp.agent_role} agent {sp.agent_id} produced no internal events"


@pytest.mark.skipif(_heidi_session() is None, reason="no Dr. Heidi session")
def test_novelty_markers_appear_when_novelty_checker_spawned():
    s = _heidi_session()
    runs = detect_runs(s)
    # find any run that includes novelty-checker
    for run in runs:
        if "novelty-checker" in run.agent_roles:
            events = build_run_events(run)
            markers = {e.marker for e in events if e.marker}
            assert MK_NOVELTY_CALLED in markers
            assert MK_NOVELTY_RETURNED in markers
            return
    pytest.skip("no run includes novelty-checker")


@pytest.mark.skipif(_heidi_session() is None, reason="no Dr. Heidi session")
def test_validator_stamp_marker():
    s = _heidi_session()
    runs = detect_runs(s)
    for run in runs:
        if "idea-validator" in run.agent_roles:
            events = build_run_events(run)
            markers = {e.marker for e in events if e.marker}
            assert MK_VALIDATOR_STAMPED in markers
            return
    pytest.skip("no run includes idea-validator")


@pytest.mark.skipif(_heidi_session() is None, reason="no Dr. Heidi session")
def test_file_writes_classified():
    s = _heidi_session()
    runs = detect_runs(s)
    events = build_run_events(runs[0])
    file_writes = [e for e in events if e.type == EVT_FILE_WRITE]
    if not file_writes:
        pytest.skip("no file writes in this run")
    kinds = {e.payload.get("kind") for e in file_writes}
    # At least some writes should target ideas/_draft/ (draft) or /ideas/ (accepted)
    assert any(k in ("draft", "accepted", "rejected", "markdown") for k in kinds)


@pytest.mark.skipif(_heidi_session() is None, reason="no Dr. Heidi session")
def test_run_summary_serializable():
    s = _heidi_session()
    runs = detect_runs(s)
    for r in runs:
        d = r.to_summary()
        import json
        json.dumps(d)  # must be JSON-serializable


@pytest.mark.skipif(_heidi_session() is None, reason="no Dr. Heidi session")
def test_event_to_json_roundtrip():
    s = _heidi_session()
    runs = detect_runs(s)
    events = build_run_events(runs[0])
    import json
    for e in events[:50]:
        json.dumps(e.to_json())
