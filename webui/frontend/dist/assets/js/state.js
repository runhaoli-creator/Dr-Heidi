/* Tiny pub/sub store with derived agent state. */

class Store {
  constructor() {
    this.state = {
      route: { name: "home" },               // {name: "home"} | {name: "run", runId}
      runs: [],
      papers: [],
      ideas: [],
      run: null,                              // current run meta
      events: [],                             // full event log seen so far
      headSeq: 0,                             // playback head — events up to this seq are "current"
      paused: false,
      speed: "4",
      sound: false,
      tokens: { in: 0, out: 0, ev: 0 },
      // per-agent live state (driven by events)
      agents: {                               // agent_id -> { role, status, lastText, tools[], visible, alive, idx }
      },
      // active speech bubbles per agent_id (max 1 per agent)
      bubbles: {},
      // active novelty bursts (parallel)
      noveltyActive: [],                      // [{agent_id, role, text, started}]
      // validator state
      validator: null,                         // {checks: [{c, ok, note}], verdict, started}
      // file writes (for highlighting library)
      lastFileWrite: null,
      // accepted idea reveal
      acceptedIdea: null,                     // {slug, path}
    };
    this.listeners = [];
  }
  subscribe(fn) { this.listeners.push(fn); return () => { this.listeners = this.listeners.filter(f => f !== fn); }; }
  set(patch) {
    Object.assign(this.state, patch);
    this.emit();
  }
  emit() {
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => {
      this._raf = null;
      for (const fn of this.listeners) try { fn(this.state); } catch (e) { console.error(e); }
    });
  }
  emitNow() {
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
    for (const fn of this.listeners) try { fn(this.state); } catch (e) { console.error(e); }
  }
}

export const store = new Store();
window.__STORE__ = store;
