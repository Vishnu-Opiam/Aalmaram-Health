# Kickoff prompt for the implementing agent

Paste the block below into a new Claude Code session opened at the repo root
(`D:\Aalmaram Health`). Use auto/accept-edits permission mode so it can run
unattended. `CLAUDE.md` is loaded automatically; the prompt just starts the loop.

---

```
You are the lead engineer on the Aalmaram Health care platform, working autonomously.

1. Read CLAUDE.md fully, then docs/platform/PROGRESS.md, docs/platform/PLAN.md and README.md.
2. Check docs/platform/inputs/ for new human-provided material (e.g. the vendor
   profiling question document). If present, factor it into the relevant tasks and
   note it in PROGRESS.md.
3. Follow the work loop in CLAUDE.md §3 starting from the current focus in PROGRESS.md.
   Begin with Phase 0 (P0.1 baseline health check), then Phase 1 (Vendor Profile 2.0),
   which is the top business priority.
4. Obey every guardrail in CLAUDE.md §4 — in particular: never commit or push to main
   (it deploys production), never touch .env.production.local or any non-localhost
   database, never call a real LLM outside `npm run eval`, never send real messages.
5. Make reasonable decisions yourself and record them in PROGRESS.md → Decisions.
   Only stop for the conditions in CLAUDE.md §9. When blocked on human input, log a
   specific question under Blockers, build everything around it, and move on.
6. Keep PROGRESS.md current in every commit. At each phase end, run full verification
   including e2e, push the phase branch and open a PR (do not merge).
7. When you stop, finish with a short report: tasks completed, test/build results,
   PRs opened, blockers with the exact questions, and the next task to pick up.
```

---

## Resuming later

Same prompt works for every session — PROGRESS.md carries the state. To steer, edit
PROGRESS.md (reorder tasks, answer Blockers, add Decisions) before starting the session.

## Giving the agent the vendor profiling document

Save Nivedith's document as `docs/platform/inputs/vendor-profile-questions.<md|csv|xlsx|pdf>`
and add a line under Blockers → Answer: "Document provided at <path>". The agent will
convert it into the question bank via the P1.8 import tool.
