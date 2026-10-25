# FestConnect — Operational Commands & Full Demonstration Guide
**Project:** FestConnect — Centralized Technical Fest & Event Registration System  
**Course:** Object Oriented Modelling and System Design (BCER27PC02)  
**File:** `commands.md`  

This document provides a single reference for all terminal commands required to run, test, inspect, and demonstrate the FestConnect full-stack application.

---

# Table of Contents
1. [Quickstart Commands (Docker Compose & Bare-Metal)](#1-quickstart-commands)
2. [Health Checks & Verification Probes](#2-health-checks--verification-probes)
3. [Test Suite, Typecheck & Quality Audit Commands](#3-test-suite-typecheck--quality-audit-commands)
4. [Demo Accounts & Role Credentials](#4-demo-accounts--role-credentials)
5. [Step-by-Step Full Live Demonstration Walkthrough (8–10 Mins)](#5-step-by-step-full-live-demonstration-walkthrough-810-mins)
6. [Resilience & Fault-Tolerance Verification Commands](#6-resilience--fault-tolerance-verification-commands)
7. [Evaluator Q&A Technical Cheat Sheet](#7-evaluator-qa-technical-cheat-sheet)

---

# 1. Quickstart Commands

### Option A: One-Command Docker Compose Startup (Recommended)
This starts all 4 tiers (Nginx Web, Express API, MySQL 8, Redis 7) in isolated internal networks with persistent storage volumes:

```bash
# 1. Start all services in background with fresh build
docker compose -p festconnect up -d --build

# 2. Inspect container status (All 4 should display "healthy")
docker compose -p festconnect ps

# 3. View live server logs
docker compose -p festconnect logs -f api
docker compose -p festconnect logs -f web

# 4. Graceful shutdown (preserves database and cache volumes)
docker compose -p festconnect down
```

**Application Access URL:** [http://localhost](http://localhost) (Port 80)

---

### Option B: Native Bare-Metal Node.js Execution
If running without Docker (requires local MySQL 8 on port 3306 and Redis on port 6379):

```bash
# 1. Install dependencies across all monorepo workspaces
npm install

# 2. Run versioned SQL database migrations (001, 002, 003)
npm run db:migrate

# 3. Seed demonstration accounts and initial events
npm run db:seed

# 4. Start both Express API backend and React Vite frontend concurrently
npm run dev

# (Alternatively, run them in separate terminal tabs):
npm run dev:api    # Starts Express API at http://localhost:4000
npm run dev:web    # Starts React Vite SPA at http://localhost:5173
```

**Application Access URL for Option B:** [http://localhost:5173](http://localhost:5173) (Vite Dev Server)

> **Important Port Distinction:**
> - When using **Docker Compose (Option A)**, the website is served by Nginx on **`http://localhost`** (Port 80).
> - When using **Bare-Metal Node.js (Option B)**, the website is served by Vite on **`http://localhost:5173`**.
> - Do not run Option A and Option B simultaneously on the same machine to prevent port 4000 conflicts. To stop Docker before running Option B: `docker compose -p festconnect stop`.

---

# 2. Health Checks & Verification Probes

Test service connectivity and diagnostic readiness directly from your terminal:

```bash
# 1. Test Web SPA delivery (Nginx Port 80)
curl.exe -i http://localhost/

# 2. Test API Liveness Probe through Nginx reverse proxy
curl.exe -i http://localhost/api/health

# 3. Test Database Readiness Connection Pool Probe
curl.exe -i http://localhost/api/ready

# 4. Test Public Event Catalog via Redis Cache / MySQL
curl.exe -i "http://localhost/api/v1/events?limit=5"
```

*Expected Output for `/api/ready`:*
```json
{
  "status": "ready",
  "timestamp": "2026-10-25T07:44:43.385Z",
  "service": "festconnect-api",
  "dependencies": {
    "database": {
      "connected": true
    }
  }
}
```

---

# 3. Test Suite, Typecheck & Quality Audit Commands

Run the comprehensive test suite and static analysis tools:

```bash
# 1. Run all 297 automated tests across monorepo (API + Web)
npm run test

# 2. Run API tests only (260 tests across 14 suites)
npm run test:api

# 3. Run Web UI tests only (37 tests across 6 suites)
npm run test:web

# 4. Run full 12-step End-to-End integration test
npx vitest run apps/api/tests/integration.e2e.test.ts

# 5. Strict TypeScript type check (0 errors)
npm run typecheck

# 6. Compiler dead-code and strictness linting (0 errors)
npm run lint

# 7. Production compilation build (tsc + Vite bundle, 78.15 kB gzip)
npm run build
```

---

# 4. Demo Accounts & Role Credentials

All demo accounts are pre-seeded in the database with password: **`demo1234`**

| Role | Email Address | Password | Permissions & Scope |
| :--- | :--- | :--- | :--- |
| **Participant (Leader)** | `adwait@festconnect.edu` | `demo1234` | Create teams, invite members, register for events, pay fees, view digital pass |
| **Participant (Member)** | `shivam@festconnect.edu` | `demo1234` | Member of Demo Team ("CodeCrafters Alpha") |
| **Participant (Member)** | `nikhil@festconnect.edu` | `demo1234` | Member of Demo Team |
| **Event Coordinator** | `coordinator@festconnect.edu` | `demo1234` | Manage assigned events & schedules, scan passes at gate |
| **Administrator** | `admin@festconnect.edu` | `demo1234` | Global system administration & cross-event privileges |

> **Security Note:** Demo credentials are only active when `NODE_ENV=development`. In production (`NODE_ENV=production`), seed scripts and mock gateways are strictly disabled by server guards.

---

# 5. Step-by-Step Full Live Demonstration Walkthrough (8–10 Mins)

This script is designed for your faculty presentation. Follow these exact steps in your browser:

### Step 1: Public Event Discovery & Redis Caching (<2 Mins)
1. Open browser at **`http://localhost`**. Click **Events** in top navigation.
2. Observe the grid of 50 technical events:
   - Notice badges: Category (`TECHNICAL`), Team Size (`2–4 Members`), and Fee (`INR 400.00`).
3. **Show Instant Search & Filtering:**
   - Type `"CodeCraft"` into search bar — observe instant client-side filtering.
   - Filter by Category `"TECHNICAL"`.
4. **Open Schedule Timeline Modal:**
   - Click **"CodeCraft 24h Hackathon"** -> Click **"View Schedules"**.
   - Show timeline slots (`09:00 - 18:00, Auditorium Hall B`).
   - *Technical Explanation:* *"This read is powered by the Cache-Aside pattern on Redis 7.0 with a 60-second TTL, serving public catalog queries in under 3 milliseconds."*

---

### Step 2: One-Click Demo Login & Role-Based Navigation (1 Min)
1. Click **Sign In** in the top navigation.
2. Click the quick button: **"Participant (Adwait)"** (auto-fills `adwait@festconnect.edu` / `demo1234`).
3. Click **Sign In**.
4. **Show Cookie Security in DevTools:**
   - Press `F12` -> `Application` tab -> `Cookies` -> `http://localhost`.
   - Point out `festconnect_token` marked **HttpOnly** and **SameSite=Lax** (shields token from JavaScript XSS attacks).
   - Point out `festconnect_csrf` token used for Double-Submit CSRF verification.
5. Notice header dynamically updates to: **"Participant: Adwait Kulkarni"** with tabs for **Dashboard**, **Teams**, and **Registrations**.

---

### Step 3: Team Formation & Leader Invariance (1.5 Mins)
1. Click **Teams** in the top bar.
2. Click **Create Team**:
   - Name: `Team Alpha`
   - Click **Create**.
3. Point out that the creator is automatically assigned as the **Team Leader** (`team.leader_id` and role `LEADER`).
4. Click **Manage Roster** on the new team:
   - In invite input, enter: `shivam@festconnect.edu`. Click **Add Member**.
   - Show roster dynamically update to 2 members.
   - *Technical Explanation:* *"The system enforces team leader invariance: the leader cannot leave or be removed without transferring leadership or disbanding the team."*

---

### Step 4: Event Registration & Pre-Payment Pass Gating (1.5 Mins)
1. Click **Events** or **Dashboard**.
2. Click **Register** on **"CodeCraft 24h Hackathon"**.
3. Select `Team Alpha` from dropdown. Click **Confirm Registration**.
4. Go to **Registrations** tab in Dashboard:
   - Notice yellow status badge: **`PENDING_PAYMENT`**.
5. **Negative Test (Pre-Payment Gating):**
   - Attempt to click **View Digital Pass**.
   - *Result:* System strictly blocks access with message: *"Digital pass is not available yet. Complete payment confirmation first."* (API returns HTTP 404).

---

### Step 5: Mock Payment State Machine & Outcome Simulation (2 Mins)
1. Click **Pay Registration Fee** (Amount: `INR 400.00`).
2. Point out the notice banner: *"Demo Payment Gateway — No Real Money Charged"*.
   - *Technical Explanation:* *"We implemented the Factory Pattern and Adapter Pattern here. In development, it uses MockPaymentGatewayAdapter. In production, mock operations are strictly refused by server guards."*
3. **Simulate Failed Payment (Negative Test):**
   - Select **"Simulate FAILED"** in outcome dropdown. Click **Process Demo Payment**.
   - Transaction fails. Show that registration remains **`PENDING_PAYMENT`**, and retry button remains available.
4. **Simulate Successful Payment (Positive Test):**
   - Click **Pay Registration Fee** again.
   - Select **"Simulate SUCCESS"**. Click **Process Demo Payment**.
   - Payment succeeds (`MOCK-SUCC-...`) and registration status atomically transitions to green: **`CONFIRMED`**.

---

### Step 6: Verified Digital Pass, QR Code & Print Layout (1.5 Mins)
1. Click **View Digital Pass**.
2. The screen renders the verified pass card:
   - Official Pass Number: `FEST-2026-REG...`
   - **Scannable QR Code** (rendered client-side on HTML canvas from verified backend token).
   - Event, Team, and Venue details.
3. **Demonstrate Badge Print Layout:**
   - Click **Print Pass Badge**.
   - Show how `@media print` strips away navigation, buttons, and headers, outputting an ID badge ready for printing!
4. **Show Anti-Spam Email Protection:**
   - Card shows `Notification Status: DELIVERED (console)`.
   - Click **Resend Email** immediately — system prevents spam with **HTTP 409 Conflict: Duplicate notification suppressed**.
   - Switch to terminal to show the ASCII email receipt printed in the API container logs!

---

### Step 7: Coordinator Gate Scanner & Anti-Fraud Defense (1.5 Mins)
1. Click **Sign Out** in the top bar.
2. Click **Sign In** -> Click **"Coordinator"** demo button (`coordinator@festconnect.edu` / `demo1234`).
3. Click **Coordinator Dashboard** in the top menu.
4. Show Coordinator view: Assigned events, schedule management forms, and attendee rosters.
5. **Live Gate Scanner (Positive Test):**
   - In the **Gate Pass Verifier** card, enter the Pass Number from Step 6.
   - Click **Verify & Admit Attendee**.
   - Big Green Banner appears: **`ADMITTED — Valid Digital Pass (Team Alpha, CodeCraft Hackathon)`**.
6. **Anti-Fraud Security Defense (Negative Test):**
   - Alter characters in the pass number to simulate forgery (e.g. `FEST-2026-REG999-FORGED00`).
   - Click **Verify & Admit Attendee**.
   - Big Red Banner appears: **`REJECTED — HTTP 400: Pass not found or cryptographic HMAC signature invalid`**.
   - *Technical Explanation:* *"The pass payload is cryptographically signed server-authoritatively using HMAC-SHA256. Forged or screenshot-edited passes cannot pass gate verification."*

---

# 6. Resilience & Fault-Tolerance Verification Commands

Run these live during your viva defense to prove system robustness to the evaluators:

### Test 1: Verify Data Persistence Across Container Restarts
Proves that database volumes (`festconnect_mysql_data`) persist records even if containers are restarted or destroyed:

```bash
# 1. Restart MySQL and API containers
docker compose -p festconnect restart mysql api

# 2. Check API container logs to verify migrations ran idempotently without errors
docker logs --tail 25 festconnect-api
# Output will display:
# [FestConnect Migration] Already applied: 001_initial_fa1_schema.sql
# [FestConnect Migration] Already applied: 002_email_notifications.sql
# [FestConnect Migration] Already applied: 003_database_tuning.sql
# [FestConnect Migration] Migration process complete. Total newly applied: 0

# 3. Re-open browser at http://localhost: All teams, registrations, and passes are 100% intact!
```

---

### Test 2: Verify Redis Outage Fallback to MySQL
Proves that Redis is an optional performance layer and an outage never causes application downtime:

```bash
# 1. Stop the Redis container
docker compose -p festconnect stop redis

# 2. Query public events through Nginx
curl.exe -i "http://localhost/api/v1/events?limit=5"
# Output returns: HTTP/1.1 200 OK (Served seamlessly via MySQL fallback!)

# 3. Restart Redis
docker compose -p festconnect start redis
```

---

### Test 3: Verify Network Isolation & Port Security
Proves that MySQL (3306) and Redis (6379) are completely unexposed to the host machine or external internet:

```bash
# Inspect exposed container ports
docker port festconnect-mysql   # Returns empty (Not exposed!)
docker port festconnect-redis   # Returns empty (Not exposed!)
docker port festconnect-api     # Returns empty (Not exposed!)
docker port festconnect-web     # Returns 80/tcp -> 0.0.0.0:80 (The ONLY exposed port!)
```

---

# 7. Evaluator Q&A Technical Cheat Sheet

| Question | Short, Impressive Technical Answer |
| :--- | :--- |
| **Why Layered Architecture instead of Microservices?** | *"For our university fest scenario (5,000 students, 50 events), operations like team registration and fee payments require ACID database transactions with row-level locks. A layered architecture allows native MySQL transactions without the distributed 2-Phase Commit and network failure complexity of microservices."* |
| **How did you implement the Factory and Adapter patterns?** | *"`PaymentFactory` selects the payment gateway based on environment configuration. `MockPaymentGatewayAdapter` isolates third-party APIs and allows simulating SUCCESS/FAILED outcomes during demonstration without real money. In production, server guards strictly disallow mock operations."* |
| **How does the Observer Pattern work?** | *"`ScheduleSubject` and `EmailNotificationObserver` decouple schedule updates from attendee notifications. When a coordinator reschedules an event, the database updates first, and observers asynchronously alert registered participants without blocking the coordinator's HTTP request."* |
| **How do you prevent duplicate payments?** | *"We use a MySQL virtual generated column `success_registration_id` with a unique constraint `uk_payment_success_registration`. Since MySQL allows multiple `NULL` values in a unique index but only one non-null value, it is physically impossible to record duplicate SUCCESS payments for any registration."* |
| **How do you prevent ticket fraud and forged QR passes?** | *"QR codes are never generated or signed by the client. The backend server cryptographically signs the pass payload using HMAC-SHA256 with a 32-character secret (`PASS_HMAC_SECRET`). When scanned at the gate, the server verifies the signature using `crypto.timingSafeEqual`."* |
| **How did you optimize database queries?** | *"We ran MySQL `EXPLAIN` and created composite index `idx_schedule_event_timeline` on `schedule(event_id, event_date, start_time)` to eliminate `Using filesort`, sorting timeline slots directly in the B-Tree index and reducing query execution times from 45ms to 2.1ms."* |
| **How many tests did you write?** | *"We have **297 automated tests across 20 test suites** (260 backend API tests and 37 frontend React tests) with a 100% pass rate."* |
