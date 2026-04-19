"""FastAPI app: serves the frontend + replay SSE."""
from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sse_starlette.sse import EventSourceResponse

from .papers import (
    list_ideas,
    list_papers,
    read_idea,
    read_paper_part,
)
from .parser import build_run_events
from .sessions import RunRegistry


app = FastAPI(title="Dr. Heidi WebUI", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

REGISTRY = RunRegistry()
PROJECT_ROOT = Path(__file__).resolve().parents[3]
FRONTEND_DIST = PROJECT_ROOT / "webui" / "frontend" / "dist"


# -----------------------------------------------------------------------
# JSON API
# -----------------------------------------------------------------------

@app.get("/api/health")
def health():
    return {
        "ok": True,
        "frontend_built": FRONTEND_DIST.exists(),
        "claude_projects": str(Path.home() / ".claude" / "projects"),
    }


@app.get("/api/projects")
def projects():
    return REGISTRY.project_summary()


@app.get("/api/runs")
def runs(project: Optional[str] = None):
    runs = REGISTRY.list_runs()
    out = []
    for r in runs:
        s = r.to_summary()
        if project and s["project_label"] != project:
            continue
        out.append(s)
    return out


@app.get("/api/runs/{run_id}")
def run_meta(run_id: str):
    run = REGISTRY.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="run not found")
    summary = run.to_summary()
    events = build_run_events(run)
    summary["event_count"] = len(events)
    summary["start_epoch"] = events[0].ts if events else None
    summary["end_epoch"] = events[-1].ts if events else None
    # Markers index for the timeline
    summary["markers"] = [
        {"seq": e.seq, "ts": e.ts, "marker": e.marker, "agent_role": e.agent_role}
        for e in events if e.marker
    ]
    return summary


@app.get("/api/runs/{run_id}/events")
async def run_events(
    run_id: str,
    request: Request,
    speed: str = Query("4", description="1|2|4|max"),
    from_seq: int = Query(0, ge=0),
):
    """SSE stream of events for one run.

    `speed` paces using real timestamp deltas: 1x = real time, 4x = 4x faster,
    max = no pacing (flush all immediately).
    """
    run = REGISTRY.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="run not found")
    events = build_run_events(run)
    if from_seq:
        events = [e for e in events if e.seq >= from_seq]

    speed_factor = _parse_speed(speed)

    async def event_generator():
        from datetime import datetime

        prev_ts = None
        for ev in events:
            if await request.is_disconnected():
                break
            if speed_factor is not None and prev_ts is not None and ev.ts:
                try:
                    cur = _ts_to_epoch(ev.ts)
                    delta = cur - prev_ts
                    delta = min(max(delta, 0), 30)  # cap pacing at 30s wall delay
                    if delta > 0:
                        await asyncio.sleep(delta / speed_factor)
                except Exception:
                    pass
            prev_ts = _ts_to_epoch(ev.ts) if ev.ts else prev_ts
            yield {
                "event": "agent-event",
                "id": str(ev.seq),
                "data": json.dumps(ev.to_json()),
            }
        # Final completion sentinel
        yield {"event": "stream-done", "data": "{}"}

    return EventSourceResponse(event_generator())


@app.get("/api/papers")
def papers():
    return list_papers()


@app.get("/api/papers/{arxiv_id}")
def paper_part(arxiv_id: str, part: str = Query("notes", regex="^(notes|gaps|metadata)$")):
    text = read_paper_part(arxiv_id, part)
    if text is None:
        raise HTTPException(status_code=404, detail=f"paper {arxiv_id} {part} not found")
    return JSONResponse({"arxiv_id": arxiv_id, "part": part, "text": text})


@app.get("/api/ideas")
def ideas():
    return list_ideas()


@app.get("/api/ideas/{slug}")
def idea(slug: str):
    text = read_idea(slug)
    if text is None:
        raise HTTPException(status_code=404, detail="idea not found")
    return JSONResponse({"slug": slug, "text": text})


# -----------------------------------------------------------------------
# Static frontend
# -----------------------------------------------------------------------

if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/")
    def index():
        return FileResponse(FRONTEND_DIST / "index.html")

    @app.get("/{full_path:path}")
    def spa(full_path: str):
        # SPA fallback for any non-API route
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404)
        return FileResponse(FRONTEND_DIST / "index.html")
else:

    @app.get("/")
    def stub():
        return {
            "msg": "Frontend not built. Run scripts/build_frontend.sh.",
            "api": "/api/health",
        }


# -----------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------

def _parse_speed(s: str) -> Optional[float]:
    if s == "max":
        return None
    try:
        v = float(s)
        return v if v > 0 else 1.0
    except ValueError:
        return 1.0


def _ts_to_epoch(ts: str) -> float:
    from datetime import datetime
    if ts.endswith("Z"):
        ts = ts[:-1] + "+00:00"
    return datetime.fromisoformat(ts).timestamp()
