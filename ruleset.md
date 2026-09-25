# ET Chess — Agent Ruleset

**This file is the standing rulebook for any agent working on this codebase.**
Before starting any task, re-read this file. If a rule here conflicts with convenience, speed, or "it probably works," this file wins. No exceptions, no shortcuts, no "good enough for now."

---

## 1. Mindset — How You Must Operate

- Operate like a **senior engineer with years of production experience**, not a junior guessing its way forward.
- **Do not hallucinate.** Never invent an API, a config option, a library method, or a behavior you have not confirmed. If you are not sure, go check — do not assume and move on.
- **Do not assume. Do not predict. Be realistic.** If something is ambiguous or unverified, stop and verify it before writing code that depends on it.
- **Be confident, not tentative** — but confidence must be earned by verification, not by guessing. "I'm fairly sure this works" is not acceptable; "I checked the docs/tests and confirmed this works" is.
- Never claim a task is "done," "complete," "working," or "ready" unless it has been verified per §4. A claim of completion without verification is a rule violation, full stop.
- If you hit something you don't know, say so and go find out — don't paper over it.

---

## 2. Mandatory Documentation-First Policy

**Before writing or implementing any code that touches a given technology, library, or framework, you must first read its official/current documentation.** This applies to every technology in this stack, every time — not just the first time you use it, and not skipped because you "already know it."

Applies to (non-exhaustive — applies to anything added to the stack later too):
- React / React Native / Expo
- chess.js
- Stockfish (WASM build + UCI protocol)
- Turborepo / pnpm workspaces
- Hono
- Better Auth
- Cloudflare (Pages, Workers, D1/KV — whichever is in use)
- Any new library before it is added to the project

Rules:
- Do not implement from memory or assumption. Cross-check against the actual current docs for the version in use.
- If the docs and your prior assumption disagree, the docs win.
- If official docs are ambiguous or incomplete, say so explicitly rather than filling the gap with a guess.

---

## 3. Task Breakdown — Required Structure

All work must be broken down in this hierarchy before implementation starts:

1. **Task** — a full feature or milestone (e.g. "Implement the game board UI").
2. **Subtask** — a coherent chunk of the task (e.g. "Wire chess.js state to the board component").
3. **Microtask** — a single, small, independently verifiable unit of work (e.g. "Implement legal-move highlighting on square select").

Rules:
- No task goes straight to code without this breakdown existing first, in writing.
- A microtask must be small enough that its correctness can be checked on its own, in isolation, without needing the rest of the feature finished.
- If a microtask turns out to be too big to verify cleanly, split it further before continuing.

---

## 4. Execution Loop — Mandatory, No Skipping Steps

For every microtask, follow this exact loop:

1. **Dispatch** — a single agent is assigned exactly one microtask. Not a bundle, not "while you're in there also do X."
2. **Implement** — the agent writes the code and writes the corresponding tests for that microtask (see §5). Tests are not optional and are not deferred to "later."
3. **Test** — run the tests. They must actually pass, not "look like they should pass."
4. **Verify** — a separate check confirms:
   - The tests genuinely test the intended behavior (not a trivial/fake pass).
   - The implementation matches the microtask's requirement, not a partial or reinterpreted version of it.
   - Code quality standards from §6 are met.
5. **Decision:**
   - **If verification passes:** the microtask may be marked complete. Only then does work proceed to the next microtask.
   - **If verification fails, in any way:** do NOT mark it done. Loop back to step 2 with the same microtask and fix it. Repeat the full loop until it genuinely passes.
6. **No task, subtask, or the overall feature may be claimed "finished" until every microtask underneath it has independently passed this loop.**

This loop is not a suggestion — skipping verification, self-certifying without checking, or claiming completion "because it should work" is a rule violation.

---

## 5. Testing Requirements

- Every microtask that produces logic (not pure styling) needs a corresponding test written alongside it, not after the fact and not skipped.
- Tests must exercise real behavior — edge cases, invalid input, failure paths — not just the happy path.
- A test that always passes regardless of the implementation (a fake/trivial test) is treated as **no test at all** and fails verification.
- Game-logic-critical code (chess-core move validation, game-status detection, bot integration) needs the highest test rigor in the codebase — this is the part that must never be subtly wrong.

---

## 6. Code Quality Standards — Non-Negotiable

The codebase must read like it was written by a senior engineer, not scaffolded by an AI in a hurry.

- **No inline CSS / inline styles.** Use the project's actual styling approach consistently (proper stylesheets / styled components / design tokens — whatever is standardized for this stack), never one-off inline style props as a shortcut.
- No dead code, no commented-out leftovers, no placeholder `TODO` left unresolved in code that's presented as "done."
- Consistent naming, consistent formatting (linted, not just "looks fine to me").
- No copy-pasted duplication across files — shared logic belongs in the shared packages (`chess-core`, `bot-engine`, `types`), not re-implemented per app.
- Functions and components should do one thing. If a function is doing five things, split it.
- No magic numbers/strings scattered through the code — use named constants.
- Error handling must be real — no swallowed errors, no empty catch blocks.

---

## 7. UI / Design Standards — No "AI Slop"

- No generic, obviously-AI-default UI: no unstyled default browser buttons, no lazy centered-div-with-shadow layouts, no clashing gradient backgrounds, no giant unnecessary emoji-as-icon usage, no filler placeholder copy left in visible UI.
- The UI must look like it was intentionally designed — deliberate spacing, deliberate type scale, a coherent color system — not assembled from whatever a component library defaults to.
- Every screen must look like a finished, considered product, not a scaffold.
- If a screen doesn't clearly meet this bar, it goes back for another pass before being called done — this is covered by the same verification loop in §4, not a separate/optional polish step.

---

## 8. Definition of "Done"

A microtask, subtask, or task is only "done" when ALL of the following are true:
- [ ] Relevant documentation was read before implementation (§2)
- [ ] Code was implemented at senior/clean-code standard (§6)
- [ ] Tests were written and actually pass (§5)
- [ ] An independent verification step confirmed correctness, not just self-report (§4)
- [ ] UI (if applicable) meets the no-AI-slop standard (§7)

If any box isn't genuinely checked, it isn't done — loop back.
