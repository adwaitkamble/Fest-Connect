# FestConnect

**A Centralized Technical Fest & Event Registration System**  
*Academic Project for Object Oriented Modelling and System Design (BCER27PC02)*

- **Guide:** Prof. Shalu Mahajan  
- **Team Members:** Adwait Kamble (123B1D002), Shivam Kasodekar (123B1D024), Nikhil Puppalwar (123B1D040)  
- **Architecture:** Layered Modular Monolith (React 18 + Express LTS + MySQL 8 + Redis 7 + Nginx)

---

## 1. Project Overview

FestConnect streamlines collegiate technical festival operations by unifying event discovery, participant and team management, eligibility-checked event registration, server-verified payment workflows, cryptographic digital pass issuance, and schedule change notifications.

### Design Patterns Implemented
- **Factory Pattern (`PaymentFactory`):** Dynamically instantiates the configured payment gateway adapter (`MockPaymentGatewayAdapter` in development; real gateway in production).
- **Adapter Pattern (`PaymentGatewayAdapter`, `EmailServiceAdapter`):** Isolates third-party payment providers and email transport providers (local console preview log vs. remote Gmail SMTP).
- **Observer Pattern (`ScheduleSubject`, `EmailNotificationObserver`):** Asynchronously dispatches schedule change alerts to registered participants when coordinators adjust venues or timings without blocking HTTP requests.
- **Cache-Aside Pattern (`CacheService`):** Redis in-memory caching for public event catalogs and schedules with deterministic keys, configurable TTL (60s), and silent fallback to MySQL on outages.

---

## 2. Monorepo Structure

```text
FestConnect/
├── apps/
│   ├── api/                  # Express + TypeScript layered backend (Controllers, Services, Repositories)
│   └── web/                  # React 18 + TypeScript + Vite frontend (SPA)
├── infra/
│   ├── nginx/                # Production Nginx reverse proxy & security headers
│   └── mysql/                # Canonical MySQL database migrations
├── docs/                     # Architectural, database, and API specifications
│   ├── FA2_SUBMISSION_DOSSIER.md      # Master 10-point FA2 submission document
│   ├── ARCHITECTURE_AND_DEPLOYMENT.md # Layered Architecture & UML Deployment Diagram
│   ├── REST_API_ENDPOINTS.md          # Complete REST API reference (35 endpoints)
│   ├── DEMO_SCRIPT.md                 # 8-10 minute presentation & live demo sequence
│   ├── VIVA_QUESTIONS_AND_ANSWERS.md  # Detailed student viva defense guide
│   ├── KNOWN_LIMITATIONS.md           # Academic technical disclosures
│   ├── FA1_SCHEMA_RECONCILIATION.md   # Domain schema & relational mappings
│   └── openapi.yaml                   # OpenAPI 3.0.3 machine-readable contract
├── docker-compose.yml        # Multi-container orchestration (Web, API, MySQL 8, Redis 7)
├── docker-compose.override.yml.example # Developer host port mappings
├── .env.example              # Environment variables template
├── package.json              # Monorepo workspaces & root quality scripts
├── AGENTS.md                 # Persistent AI pair programming guidelines
├── ARCHITECTURE.md           # Core architecture specification
├── DESIGN.md                 # UI/UX design tokens & responsive screen guidelines
├── DEVELOPMENT_RULES.md      # Coding standards & security invariants
├── FEATURES.md               # Feature checklist & acceptance criteria
├── PRD.md                    # Product requirements document
├── PROJECT_MEMORY.md         # Full project trajectory & phase audit logs
├── TODO.md                   # Detailed task checklist
└── TRD.md                    # Technical requirements document
```

---

## 3. Prerequisites

- **Docker & Docker Compose:** Docker Desktop (v20+ or Docker Compose v5+) — *Recommended for one-command startup*
- **Node.js (for bare-metal execution):** `v20.x` or `v24.x` LTS (tested on `v24.13.0`)
- **npm:** `v10.x` or `v11.x` (tested on `11.6.2`)
- **MySQL Server (if not using Docker):** MySQL 8.0
- **Redis Server (optional):** Redis 7.0

---

## 4. Quickstart Guide

### Option A: Running with Docker Compose (Recommended)

Docker Compose starts the entire 4-tier stack (Nginx, React Web, Express API, MySQL 8, Redis 7) in isolated internal networks with automatic migrations and seed data:

```bash
# 1. Clone repository and navigate to root
cd "TechFest Implementation"

# 2. Copy environment template
cp .env.example .env

# 3. Build and launch all services in detached mode
docker compose up --build -d

# 4. Inspect container health and service logs
docker compose ps
docker compose logs -f api
```

Once running:
- **Web Application:** Open [http://localhost](http://localhost) (or port configured in `PORT_WEB`)
- **REST API Health Probe:** [http://localhost/api/health](http://localhost/api/health)
- **Database Readiness Probe:** [http://localhost/api/ready](http://localhost/api/ready)

To shut down services and preserve persistent database volumes:
```bash
docker compose down
```

---

### Option B: Local Bare-Metal Development

If running directly on your host machine:

```bash
# 1. Install all monorepo dependencies
npm install

# 2. Ensure MySQL 8 is running locally on port 3306 and Redis on port 6379

# 3. Apply versioned database migrations
npm run db:migrate

# 4. Seed initial demonstration accounts and events
npm run db:seed

# 5. Start both API and Web concurrently in development mode
npm run dev
```

The application will be accessible at:
- **Frontend (Vite Dev Server):** [http://localhost:5173](http://localhost:5173)
- **Backend (Express API):** [http://localhost:4000](http://localhost:4000)

---

## 5. Demonstration Accounts & Credentials

> [!IMPORTANT]
> The following demo credentials are for **local academic demonstration and testing only**. They are disabled in production builds.

| Role | Email Address | Password | Permissions & Scope |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@festconnect.edu` | `demo1234` | Full university-wide access; all events, rosters, and passes |
| **Event Coordinator** | `coordinator@festconnect.edu` | `demo1234` | Coordinated events only (e.g. Event 1: *CodeCraft Hackathon*); schedule edits, gate verification |
| **Participant (Leader)** | `adwait@festconnect.edu` | `demo1234` | Team Leader (*CyberKnights*); event registration, mock payment, pass access |
| **Participant (Member)** | `shivam@festconnect.edu` | `demo1234` | Team Member (*CyberKnights*); pass viewer |
| **Participant (Member)** | `nikhil@festconnect.edu` | `demo1234` | Team Member (*CyberKnights*); pass viewer |

---

## 6. Mock Payment & Email Notification Disclosures

1. **Mock Payment Operations:**
   - **No real money is charged.** In development mode, the `MockPaymentGatewayAdapter` simulates instant payments.
   - The UI displays an explicit badge: *"Demo payment — no money is charged"*.
   - **Production Guard:** If `NODE_ENV=production`, `PaymentFactory` strictly refuses to instantiate the mock gateway, throwing an un-bypassable `ForbiddenError`.
2. **Email Notifications:**
   - **Console Preview Default:** By default, email notifications are routed through the `ConsoleEmailAdapter`, which logs complete email previews (Message-ID, recipient, subject, body, digital pass number) directly to server terminal logs. No external credentials are required.
   - **Gmail Delivery:** If `GMAIL_USER` and `GMAIL_APP_PASSWORD` environment variables are provided, the `GmailSmtpAdapter` will dispatch real emails via SMTP over TLS (port 587).
   - **Spam Guard:** Resending confirmation emails enforces a 60-second cooldown timer (`429 Too Many Requests`).

---

## 7. Testing & Quality Verification

Run the full automated test suite and static analysis quality gates:

```bash
# 1. Run all automated tests (297 tests across 20 suites)
npm run test

# 2. Strict TypeScript type check (0 errors)
npm run typecheck

# 3. Compiler strictness & dead-code linting (0 errors)
npm run lint

# 4. Production build verification (tsc + Vite bundle)
npm run build
```

---

## 8. Implementation Phase Status

| Phase | Description | Status | Test Coverage |
| :--- | :--- | :---: | :---: |
| **Phase 00** | Reconnaissance & Architectural Blueprint | **Completed** | Spec validated |
| **Phase 01** | Project Scaffold, Monorepo & Dev Quality Scripts | **Completed** | Baseline passed |
| **Phase 02** | MySQL 8 Schema, Migrations & Idempotent Seeds | **Completed** | 10 live DB tests |
| **Phase 03** | Authentication, HttpOnly JWT & Double-Submit CSRF | **Completed** | 21 auth + 22 security tests |
| **Phase 04** | Public Event Catalog & Observer Schedule Updates | **Completed** | 30 event/schedule tests |
| **Phase 05** | Team Creation, Member Rosters & Registrations | **Completed** | 31 team tests |
| **Phase 06** | Payment Factory, Adapters & Transactional State | **Completed** | 28 payment tests |
| **Phase 07** | HMAC-SHA256 Digital Pass, QR & Email Persistence | **Completed** | 49 pass tests |
| **Phase 08** | Dedicated React UI Screens & Coordinator Dashboards | **Completed** | 37 web tests |
| **Phase 09** | Redis Cache-Aside & Database Index Tuning | **Completed** | 12 cache tests |
| **Phase 10** | Docker Compose, Integration & Security Verification | **Completed** | 17 integration tests |
| **Phase 11** | FA2 Submission Dossier, Demo Script & Final Handover | **Completed** | Full Handover (297/297 tests) |
