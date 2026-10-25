# AGENTS.md — Persistent Project Instructions for Antigravity

This repository is **FestConnect**, a full-stack university demonstration project for the course **Object Oriented Modelling and System Design (BCER27PC02)**.

All AI coding agents, pairs, and contributors must strictly adhere to the following persistent instructions.

---

## 1. Source of Truth Priority

1. Explicit instructions from the user in the active conversation.
2. Verified original FA1 source / reference materials (class diagrams, ER diagrams, relational schema, business rules).
3. `PRD.md`, `TRD.md`, `ARCHITECTURE.md`, `DESIGN.md`, `FEATURES.md`, and `DEVELOPMENT_RULES.md` read collectively.
4. `AGENTS.md`, `PROJECT_MEMORY.md`, `TODO.md`, and phase prompts in `ANTIGRAVITY_PHASE_PROMPTS_ALL.md`.
5. Existing code and automated tests (as long as they do not contradict higher-priority requirements).

---

## 2. Core Architectural & Technical Baseline

- **Architecture:** Layered Architecture / modular monolith. No microservices decomposition.
- **Frontend:** React + TypeScript + Vite (`apps/web`). Plain CSS / CSS Modules with shared design tokens from `DESIGN.md`.
- **Backend:** Node.js LTS + Express + TypeScript (`apps/api`). Layered into Controllers → Services → Repositories → MySQL.
- **Validation:** Zod for all request parameters, query strings, and payloads.
- **Database:** MySQL 8 with versioned SQL migrations and parameterized SQL queries (`mysql2/promise`).
- **Cache:** Optional Redis cache-aside (60-second TTL) strictly for public event listings/details. Must fall back safely to MySQL if unavailable.
- **Authentication:** Password hashing with bcrypt; short-lived signed JWT in HttpOnly cookie with CSRF / origin protection.
- **Patterns:** Factory (Payment processor selection), Adapter (Payment gateway & Email service), Observer (Schedule change notifications).
- **Email:** Default `ConsoleEmailAdapter` printing previews to server logs; optional `GmailSmtpAdapter` when environment variables are supplied.
- **Payments:** Development-only `MockPaymentGatewayAdapter` with explicit "Demo payment — no money is charged" label. Refuses mock endpoints in production.
- **Orchestration:** Docker Compose for local reproduction.

---

## 3. Strict Operational Rules

1. **One Phase at a Time:** Complete the current phase according to its acceptance criteria. At the end of each phase, stop and report the outcome. Never begin the next phase autonomously without explicit user instruction.
2. **Never Fabricate Success:** Only claim a test or command passed if you actually executed it and inspected the output. Clearly report any failures or unexecuted checks.
3. **No Phantom FA1 Claims:** Do not invent database columns or relationships and present them as FA1 facts.
4. **Security & Safety Invariants:**
   - Parameterize all SQL queries. Never concatenate user input into SQL.
   - Use database transactions for multi-step mutations (registrations, payments, passes).
   - Server-authoritative computation: the client never dictates role, amount, payment success, owner, or pass validity.
   - Never commit secrets or real credentials to git or documentation.
5. **Preserve Existing Documents:** Never overwrite specification documents wholesale or wipe existing progress without verified justification. Update `TODO.md` and `PROJECT_MEMORY.md` at every phase conclusion.
