# Prompts

Reusable prompt templates for getting the most out of Dr. Heidi's
ideation pipeline. Copy any of these into a fresh Claude Code session
in this project, fill in the blanks, and let the agents do the work.

## When to use which

| Template | Use when |
|---|---|
| [`template.md`](template.md) | Default — the full, fill-in-the-blanks mega-prompt that does anchor → KB expansion → ideation → honest report in one shot |
| [`example_focused.md`](example_focused.md) | You already know your direction sharply (which papers, which mechanism, which venue). Concrete, short, decisive |
| [`example_exploratory.md`](example_exploratory.md) | You have a research intuition but haven't picked a single mechanism. Asks for N ideas that span different design choices in the same direction, plus a "decision map" |

## Why these prompts work

Dr. Heidi has three knobs that determine ideation quality:

1. **`seeds/<your-direction>.md`** — anchor papers + half-formed thoughts in
   structured YAML. `lead-researcher` reads `seeds/` on every run; entries
   with `priority: high` get prioritized.
2. **Coverage of `papers/` digests** — Lead-researcher can only think with
   papers it has read. ~10 digests is the floor. ~30+ unlocks real
   cross-paper combinations.
3. **The `scope` text in `/ideate`** — goes verbatim into the lead's brief.
   Tighter constraints → narrower, more executable ideas.

Each template makes you fill in those three things explicitly, then asks
the agents to act on all of it in one mega-prompt — no back-and-forth
turns.

## Reading the templates

`<...>` are placeholders. Replace them.

`"""` blocks are direct text Claude will use verbatim — write what you
want the seed file to literally contain, or what you want the scope
field to literally say.

## Tip

If you want to watch the run as it happens, open a second terminal and
launch `./run.sh` before you submit the prompt. Make sure your prompt
explicitly says "use the `paper-digest` skill, not a manual digest" and
"use the `/ideate` skill" — the replay viewer only shows events that
went through the proper Task-spawn path.
