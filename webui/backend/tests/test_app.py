"""HTTP-level tests for the FastAPI app."""
from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient

from dr_heidi_webui.app import REGISTRY, app


client = TestClient(app)


def test_health_ok():
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True


def test_projects_returns_list():
    r = client.get("/api/projects")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_runs_returns_list():
    r = client.get("/api/runs")
    assert r.status_code == 200
    runs = r.json()
    assert isinstance(runs, list)
    if runs:
        sample = runs[0]
        for key in ("run_id", "session_id", "project_label", "start_ts", "title"):
            assert key in sample


def test_run_meta_for_first_run_has_markers():
    runs = client.get("/api/runs").json()
    if not runs:
        pytest.skip("no runs in user's projects dir")
    run_id = runs[0]["run_id"]
    r = client.get(f"/api/runs/{run_id}")
    assert r.status_code == 200, r.text
    meta = r.json()
    assert meta["event_count"] > 0
    # markers list should include run_started + run_done at minimum
    marker_names = {m["marker"] for m in meta["markers"]}
    assert "run_started" in marker_names
    assert "run_done" in marker_names


def test_run_events_sse_max_speed_streams_all():
    runs = client.get("/api/runs").json()
    if not runs:
        pytest.skip("no runs")
    run_id = runs[0]["run_id"]
    with client.stream("GET", f"/api/runs/{run_id}/events?speed=max") as r:
        assert r.status_code == 200
        # Read raw SSE bytes, parse out 'data: ' lines
        events = []
        for line in r.iter_lines():
            if line.startswith("data:"):
                payload = line[len("data:"):].strip()
                if payload and payload != "{}":
                    try:
                        events.append(json.loads(payload))
                    except json.JSONDecodeError:
                        pass
            if len(events) > 50:
                break
        assert len(events) > 0
        first = events[0]
        assert "type" in first
        assert "seq" in first


def test_papers_endpoint():
    r = client.get("/api/papers")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_paper_notes_404_for_unknown():
    r = client.get("/api/papers/9999.99999?part=notes")
    assert r.status_code == 404


def test_ideas_endpoint_lists_files():
    r = client.get("/api/ideas")
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list)
    # We have several accepted ideas
    statuses = {i["status"] for i in items}
    assert "accepted" in statuses


def test_idea_text_returns_markdown():
    items = client.get("/api/ideas").json()
    if not items:
        pytest.skip("no ideas")
    slug = items[0]["slug"]
    r = client.get(f"/api/ideas/{slug}")
    assert r.status_code == 200
    body = r.json()
    assert body["slug"] == slug
    assert isinstance(body["text"], str)
    assert len(body["text"]) > 0


def test_run_404_for_unknown():
    r = client.get("/api/runs/nope/events?speed=max")
    assert r.status_code == 404


def test_from_seq_skip():
    runs = client.get("/api/runs").json()
    if not runs:
        pytest.skip("no runs")
    run_id = runs[0]["run_id"]
    # Get full event count
    meta = client.get(f"/api/runs/{run_id}").json()
    if meta["event_count"] < 5:
        pytest.skip("run too short")
    skip_to = meta["event_count"] - 3
    with client.stream("GET", f"/api/runs/{run_id}/events?speed=max&from_seq={skip_to}") as r:
        events = []
        for line in r.iter_lines():
            if line.startswith("data:"):
                payload = line[len("data:"):].strip()
                if payload and payload != "{}":
                    try:
                        events.append(json.loads(payload))
                    except Exception:
                        pass
        assert all(e["seq"] >= skip_to for e in events)
