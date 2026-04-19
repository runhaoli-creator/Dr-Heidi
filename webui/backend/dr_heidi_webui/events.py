"""Normalized event schema emitted by the parser and consumed by the frontend."""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Optional


# Event types — keep the string list canonical
EVT_PHASE_CHANGE = "phase.change"
EVT_AGENT_SPAWN = "agent.spawn"
EVT_AGENT_THINKING = "agent.thinking"
EVT_AGENT_TOOL_USE = "agent.tool_use"
EVT_AGENT_TOOL_RESULT = "agent.tool_result"
EVT_AGENT_TEXT = "agent.text"
EVT_AGENT_DONE = "agent.done"
EVT_FILE_WRITE = "file.write"
EVT_MARKER = "marker"
EVT_RUN_DONE = "run.done"

# Markers
MK_RUN_STARTED = "run_started"
MK_PAPERS_LOADED = "papers_loaded"
MK_DRAFT_WRITTEN = "draft_written"
MK_NOVELTY_CALLED = "novelty_called"
MK_NOVELTY_RETURNED = "novelty_returned"
MK_FIRST_CRITIQUE = "first_critique"
MK_VERDICT_DECIDED = "verdict_decided"
MK_REVISION_STARTED = "revision_started"
MK_VALIDATOR_STAMPED = "validator_stamped"
MK_RUN_DONE = "run_done"

KNOWN_AGENT_ROLES = {
    "lead-researcher",
    "reviewer",
    "novelty-checker",
    "idea-validator",
    "orchestrator",
}


@dataclass
class Event:
    seq: int
    ts: str  # ISO 8601
    type: str
    agent_role: Optional[str] = None
    agent_id: Optional[str] = None
    payload: dict[str, Any] = field(default_factory=dict)
    marker: Optional[str] = None

    def to_json(self) -> dict[str, Any]:
        d = asdict(self)
        # drop None marker key for cleaner output
        if d.get("marker") is None:
            d.pop("marker")
        return d
