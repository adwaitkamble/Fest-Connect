# FestConnect Frontend Redesign — Antigravity Master Prompt

## Mission

You are implementing a **frontend-only, production-quality UI/UX redesign** for the FestConnect college event-management portal. The current backend is complete and functional. Make the React frontend (`apps/web`) simple, attractive, responsive, readable, accessible, and distinctly suited to an event-management journey — while preserving every verified behaviour.

## Mandatory source of truth

1. Read `AGENTS.md` in full.
2. Read `DESIGN.md` in full, with special attention to **Section 8, “Frontend Redesign Specification — FestConnect UI/UX v2.”** That section is the complete design specification for this work.
3. Inspect the current `apps/web` source, tests, CSS, API clients, types, and router implementation before editing. Do not rely on this prompt as a substitute for code inspection.
4. Consult `PRD.md`, `TRD.md`, `ARCHITECTURE.md`, `FEATURES.md`, and `DEVELOPMENT_RULES.md` when a product or contract question is unclear.

If the specification and the actual implemented API contract differ, preserve the implemented/server/OpenAPI contract and document the discrepancy rather than inventing frontend data or changing backend code.

## Scope

Work in `apps/web` only, plus tests whose changes are necessary to reflect accessible UI semantics. You may create well-scoped frontend components, styles, and utility functions. Keep the existing plain React + TypeScript + Vite + React Router + CSS approach; do not add a UI kit or a remote asset dependency.

You must redesign these current routes:

- `/` — replace scaffold/phase-centric content with a product landing page.
- `/events` and `/events/:id` — discovery and detail.
- `/login` and `/register` — authentication.
- `/teams` — team creation and management.
- `/registrations` and `/dashboard` — participant registrations/dashboard.
- `/coordinator` — protected coordinator workspace, event/schedule and registration/pass workflows.
- `/pass/:id` — verified printable digital pass.
- `*` — useful 404.

Also redesign and harden the current event detail, register-event, payment, team-detail, pass, event-form, and schedule-form dialogs.

## Strictly preserve

- Backend source, database/migrations, Docker, API routes, OpenAPI contract, and server business logic: **do not edit them**.
- Existing API-client endpoint paths, request payloads, credentials/CSRF handling, response-driven data, auth flow, role guard, demo-mode checks, payment logic, pass flow, and notification logic.
- React Router paths, parameter names, direct-link behaviour, `MemoryRouter` support, and the `/dashboard` alias.
- Server authority: never compute/override authoritative role, amount, payment success, registration/pass eligibility, or status in the browser.
- The mock-payment disclosure: use the exact visible statement **“Demo payment — no money is charged”** whenever mock payment is available.
- Existing documents; do not replace or truncate them. Update `PROJECT_MEMORY.md` and `TODO.md` only if project instructions explicitly require it at the end of a completed implementation phase.

## Required design implementation

Apply every requirement in `DESIGN.md` Section 8, including:

1. The ink/violet/coral palette, system-first typography, 4px spacing scale, responsive layout, reusable CSS tokens, components, and visual hierarchy.
2. Semantic `AppShell`, header/navigation, mobile menu, footer, skip link, main landmark, accessible current-route navigation, live feedback region, and compact route-oriented pages.
3. Reusable components for buttons, cards, status badges, alerts, loading/empty/error states, form fields/error summary, dialogs, responsive data display, schedules, and pass display. Keep types explicit and avoid duplicated inline styling.
4. All route-specific states and flows listed in the design file, including unauthenticated, loading, empty, failure, 401/403/404/409 handling, busy submit, success, pending payment, confirmed registration, unavailable pass, and server-error retry paths.
5. Subtle, purposeful motion only, plus a global `prefers-reduced-motion: reduce` implementation.
6. WCAG 2.2 AA-minded implementation: contrast, semantic HTML, persistent form labels, focus indicators, keyboard navigation, dialog focus management/trapping/restoration, screen-reader labels, error associations, and non-colour status indicators.
7. Mobile-first behaviour at 320px/375px, tablet at 768px, and desktop at 1024px/1440px. Make tables usable on narrow screens and controls touch-friendly.
8. A print stylesheet for the pass route/modal that produces a clean pass and omits navigation/nonessential controls.

## Implementation sequence

1. Inspect current code and make a concise internal route/component/API map.
2. Establish design tokens, base styles, app shell, responsive navigation, focus treatment, and motion defaults.
3. Create/reuse typed presentational primitives and migrate event discovery/detail/authentication.
4. Migrate teams, registration, payment, pass, and their dialogs while retaining the existing API calls and state transitions.
5. Migrate coordinator workflows, including CRUD/schedule forms, registration display, pass verification, authorization/error cases, and destructive-action confirmation.
6. Remove stale Phase/scaffold language from user-facing screens; do not delete functional behaviours merely because the presentation changes.
7. Run tests and build; fix all frontend regressions before reporting completion.

## Verification checklist — execute and report actual results

From the project root, run the relevant commands (use the repository’s existing scripts):

```powershell
npm run typecheck
npm run lint
npm run test
npm run build
```

Then manually inspect, in a browser if the local stack is available:

- all routes listed above, including direct URL entry and the 404 path;
- signed-out participant pages, participant flows, and coordinator/unauthorized views;
- event searching/filtering/pagination, team creation/member actions, registration/payment/pass journeys, coordinator event/schedule edits, and pass verification;
- loading, empty, error, conflict, disabled/busy, and retry states;
- keyboard-only navigation, dialog Escape/focus restoration, visible focus, form error announcements, colour contrast, and reduced-motion mode;
- 320px, 375px, 768px, 1024px, and 1440px widths; 200% zoom; and pass print preview.

## Completion criteria

Do not claim completion until the UI feels like one coherent FestConnect product rather than an AI-generated scaffold, every existing route and workflow remains functional, all required accessibility/responsive/motion behaviour is present, and the actual typecheck, lint, tests, and build results have been verified. In your final report, list changed files, state that backend files were untouched, and include exact command outcomes plus any manual checks that could not be run and why.
