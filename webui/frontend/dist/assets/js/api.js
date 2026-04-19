/* Thin fetch wrappers. */

async function jget(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText} on ${url}`);
  return r.json();
}

export const api = {
  health: () => jget("/api/health"),
  runs: () => jget("/api/runs"),
  run: (id) => jget(`/api/runs/${id}`),
  papers: () => jget("/api/papers"),
  paper: (id, part = "notes") => jget(`/api/papers/${id}?part=${part}`),
  ideas: () => jget("/api/ideas"),
  idea: (slug) => jget(`/api/ideas/${slug}`),
  // SSE endpoint URL (consumer creates EventSource directly)
  eventsUrl: (runId, opts = {}) => {
    const q = new URLSearchParams();
    q.set("speed", opts.speed || "4");
    if (opts.fromSeq) q.set("from_seq", String(opts.fromSeq));
    return `/api/runs/${runId}/events?${q.toString()}`;
  },
};
