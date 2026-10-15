# CLAUDE.md — Operating manual for agents working on Aalmaram Health

You are building the Aalmaram Health care platform autonomously. Read this whole file
before doing anything. It overrides your defaults.

## 1. What this product is (60-second version)

Aalmaram Health curates health, wellness and heritage/culture trips in Kerala for
(mostly international) clients. The platform has **two inputs** and **four stages**:

- Inputs: **Vendor profiles** (what providers offer, their branches, who the
  practitioners are, their accreditations) and **Trip requirements** (extracted from
  conversations, including a module mix like 40% health / 30% wellness / 30% culture).
- Stages: **1 Intake & Curation** (the team fixes the health core, the client builds
  the rest in the drag-and-drop builder with AI suggestions, then confirms and pays) →
  **2 Booking** (one booking per block; AI drafts vendor requests, staff send them,
  tracked to confirmation) → **3 In-Trip** (calendar / today view of confirmed blocks)
  → **4 Post-Trip** (health dossier, lasting preferences for the next trip).

The competitive edge is how well AI understands client conversations and plans from
available components. That depends on vendor profile quality, which is why **Phase 1
(the vendor profile) is built first.**

**Naming rule:** `Module` in code = content category (Health & Medical, Wellness & Spa,
Heritage & Culture). The four lifecycle parts are **Stages**. Never name lifecycle code
"module".

## 2. Read first, in this order

1. `docs/platform/PROGRESS.md` — where things stand, blockers, decisions.
2. `docs/platform/PLAN.md` — phases, data models, tasks, acceptance criteria.
3. `README.md` — architecture, conventions, security model, known limitations.
4. `prisma/schema.prisma`, then the files for the area you are about to change.

## 3. The work loop

Repeat until the stop conditions in §9:

1. **Orient.** Read PROGRESS.md. Pick the next `[ ]` or `[~]` task in the build order
   (PLAN.md §4 "MVP and build order") whose dependencies are done. Skip `[!]` blocked
   tasks (build any unblocked part of them).
2. **Branch.** One branch per phase: `feat/phase-<n>-<slug>` (e.g.
   `feat/phase-1-vendor-profile`), created from the previous phase's branch if that
   hasn't merged yet, otherwise from `main`. Never commit to `main`.
3. **Plan the task** briefly (files, schema changes, tests). For tasks touching the
   schema or more than ~5 files, write the plan into the session log first.
4. **Load relevant skills before coding**: `supabase-postgres-best-practices` for any
   schema/migration/query work; `vercel:ai-sdk` + `vercel:ai-gateway` (and `claude-api`
   for model choice) for AI work; `vercel:nextjs` for App Router questions;
   `vercel:vercel-storage` for Blob; `vercel:vercel-functions` for cron. Trust current
   docs over memory.
5. **Implement** following §5 conventions. Write tests alongside, not after.
6. **Verify** (§6). All must pass.
7. **Update** PROGRESS.md (checkbox, session log, decisions) and, when a phase or a
   user-visible capability lands, the README.
8. **Commit** (§7). Mark the task `[x]`. Continue.
9. At the end of each phase: run the full verification including e2e, write a phase
   summary in the session log, push the branch and open a PR (never merge it).

## 4. Hard guardrails — never violate

**Production safety**
- **Pushing to `main` deploys production** (Vercel). Never commit to, push to, merge
  into, or rebase `main`. Never merge your own PRs. Never enable auto-merge.
- Never run `vercel deploy --prod`, `vercel env add/rm`, or change Vercel project settings.
- **Never read, source, or use `.env.production.local`** or any production `DATABASE_URL`.
  Before any Prisma command, confirm `DATABASE_URL` points to `localhost`.
- Never run `prisma migrate reset`, `db:reset`, `npm test` (it truncates the DB) or
  seeds against anything except the local embedded Postgres.
- Never use `prisma db push`. Schema changes are always `npx prisma migrate dev --name <slug>`.
- Never edit an already-committed migration; add a new one.

**Secrets & external effects**
- Never commit `.env*` files (except `.env.example`), keys, or tokens. Add new variables
  to `.env.example` and `src/lib/env.ts` with safe defaults.
- `EMAIL_TRANSPORT` stays `log`. Never send real email, WhatsApp or SMS, never call
  vendor systems, never contact real people or businesses.
- Tests and the dev server must never call a real LLM. `AI_PROVIDER=fake` is the default
  without a key. Real-model calls happen only in `npm run eval`, and only if the human
  has put a key in `.env.local`; otherwise skip evals and note it in PROGRESS.md.
- No new paid services or Marketplace integrations provisioned by you. Build the seam,
  document the env var, and list it under Blockers.

**Product & data**
- **No medical advice or claims.** AI output must never diagnose, interpret results,
  or promise health outcomes. Add assertions for this to tests/evals for every AI task
  that produces text.
- **Human in the loop:** AI output is always a draft or suggestion requiring an explicit
  human action to publish, send, confirm, or book.
- **Client projections only** in `/trip` and any vendor-facing page. Every new internal
  field must be added to the projection-leak integration tests.
- Transcripts, intake text, health goals, messages, documents: never logged (extend
  logger redaction), never stored in `AiRun.output`, PII minimised before being sent to a model.
- All seed data is fictional and suffixed `(demo)`. Never put real vendor, practitioner,
  or client names in seeds, fixtures or evals.
- Do not claim legal/regulatory compliance (GDPR, DPDP, etc.) in UI, docs, or commits.

## 5. Codebase conventions (match existing code)

- **Stack:** Next.js 15 App Router, React 19, TypeScript strict, Prisma 6 + PostgreSQL,
  Tailwind v4, Zod v4, Vitest, Playwright. Node 20+. Windows dev machine — scripts must
  work in PowerShell and Git Bash (use Node scripts, not bash-only scripts).
- **Server Components read, Server Actions write.** No separate API layer except route
  handlers that genuinely need one (token links, cron, file download).
- **Business logic in `src/domain/<area>/`**, framework-free, taking plain objects and
  returning plain objects; unit-tested without a DB. Mirror `src/domain/itineraries/`.
- **Every write goes through `runAction()`** (`src/lib/validation/form.ts`) with a Zod
  schema in `src/lib/validation/schemas.ts`. Actor always from session, never from input.
  Re-check ownership server-side for every id from the browser.
- **Actions return `redirectTo`**; forms navigate via `useActionRedirect`. Do not call
  `redirect()` inside form actions (see README "Known limitations").
- Admin links use `prefetch={false}`. UI uses `src/components/ui/primitives.tsx`
  (`Card`, `Field`, `Input`, `Select`, `Textarea`, buttons) and existing admin components;
  keep the admin dense and the client portal calm/editorial.
- **Money is `Decimal`** end to end. Dates-only values use helpers in `src/domain/shared/dates.ts`.
- **Status machines** are explicit transition tables with unit tests (see
  `src/domain/itineraries/status.ts`). Use the same pattern for trips, payments and bookings.
- **Auth:** admin via `src/lib/auth/guards.ts`; token links via the hashed-token pattern in
  `src/lib/auth/access-token.ts` (store SHA-256 only, expiry, exchange for cookie).
- **Audit:** meaningful state changes write `ActivityLog` via `src/lib/services/activity-log.ts`
  (ids, counts and status names only — never free text).
- Match surrounding comment density and style. Comments explain *why*, not *what*.
- **Relations:** inventory uses `onDelete: Restrict`; child records of a trip/itinerary
  cascade. Keep that philosophy and explain deviations in a schema comment.

### AI conventions (introduced in Phase 0)

- All model calls go through `src/lib/ai/` (`generateStructured`). No direct SDK calls elsewhere.
- Structured output only, validated by Zod; one repair retry; IDs in output must be
  validated against the IDs you supplied.
- Prompts in `src/lib/ai/prompts/<task>.ts` with `PROMPT_VERSION`; bump it on any change.
- Models from env (`AI_MODEL_REASONING`, `AI_MODEL_FAST`); no model strings at call sites.
- Each task has fake-provider fixtures (for tests) and eval fixtures (`evals/<task>/`).
- Every call records an `AiRun`.

## 6. Verification — definition of done for a task

Start the DB once per session in a background process: `npm run db:start` (embedded
Postgres on :5433; leave it running). Then:

```
npx prisma migrate dev          # if the schema changed
npm run typecheck
npm run lint                    # if it runs cleanly on main; don't chase pre-existing lint noise
npm test                        # unit + integration (truncates local dev DB)
npm run db:seed                 # restore demo data after tests
npm run build
```

At phase end, and after any change to a user-facing flow: `npm run test:e2e`.

A task is done only when:
- Acceptance criteria in PLAN.md for that task are met.
- New domain logic has unit tests; new DB behaviour/authorization has integration tests;
  each phase adds or extends at least one Playwright e2e covering its golden path.
- Projection-leak tests cover every new internal field.
- Seed data demonstrates the feature.
- For UI work: start the dev server and look at the page in the browser pane
  (`mcp__Claude_Browser__*`) as the demo admin (`admin@aalmaram.test` / `Aalmaram!Demo1`);
  check the empty state, an error state and a narrow viewport.
- Typecheck, tests and build pass. Report failures honestly in the session log — never
  skip, `.only`, or weaken a test to get green.

## 7. Git

- Small, focused commits, one task (or a coherent part) each. Message format:
  `P1.3: vendor profile editor with branches and practitioners` + a short body on why.
- End every commit message with:
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`
- Commit migrations together with the schema and code that use them.
- Never `--no-verify`, never force-push shared branches, never rewrite history on pushed branches.
- PR body: what landed, screenshots/notes of verification, test results, open questions,
  and end with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
  Pushing a feature branch and opening a PR is allowed; merging is not.

## 8. Making decisions without a human

- If PLAN.md specifies it, follow it. If the codebase disagrees with PLAN.md, the
  codebase's established conventions win for *how*; PLAN.md wins for *what*. Note the
  conflict in Decisions.
- If ambiguous, pick the option that is **simplest, reversible, and consistent with
  existing patterns**, record it in PROGRESS.md → Decisions (date, choice, why), and move on.
- Refine the PLAN.md data model sketches freely when implementation reveals a better
  shape — keep the intent, record the change in Decisions.
- If a task genuinely needs human input (content, credentials, a policy decision, a paid
  service), mark it `[!]`, add a row to Blockers with a specific question, build every
  part that doesn't need the answer (seams, UI with placeholder data, import tooling),
  and continue with the next task.
- Don't gold-plate. Optional tasks (marked optional) come only after all Must tasks of
  that phase are done.

## 9. Stop conditions

Stop and write a clear summary in the session log (what's done, what's blocked, exact
next step) when any of these happen:

- All unblocked tasks in the current phase are done and the phase PR is open — then
  continue to the next phase **only if** the next phase does not depend on unmerged
  schema that a human might still change substantially (Phases 1→2 may proceed in
  parallel on stacked branches; Phase 3+ should wait for the human to merge 1 and 2
  unless PROGRESS.md says otherwise).
- The same verification failure persists after three genuinely different fix attempts.
- A required action would violate §4.
- The environment is broken in a way you can't repair locally (DB won't start, install fails).

## 10. Useful facts

- Demo admin (local only): `admin@aalmaram.test` / `Aalmaram!Demo1`.
- Client portal locally: client page → Portal access → Send invitation → copy the
  `/trip/access/<token>` URL from the server console or `.mail.log`.
- E2E uses its own database `aalmaram_e2e` (see `scripts/e2e-db.mjs`).
- Existing AI seam to replace in Phase 4 (P4.3): `src/lib/services/itinerary-recommendation.ts`.
- Existing report generator to mirror for new reports: `src/domain/reports/generate.ts`.
- Human inputs (e.g. meeting notes and transcripts) will be placed in
  `docs/platform/inputs/`. Check it at the start of every session. It stays local:
  never commit it.
