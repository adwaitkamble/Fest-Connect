# FestConnect — Academic Demonstration Script (FA2)
**Project:** FestConnect — Centralized University Technical Fest & Event Registration Management System  
**Course:** Object Oriented Modelling and System Design (BCER27PC02)  
**Target Duration:** 8 to 10 Minutes  
**Demonstration URL:** `http://localhost:80` (or local port `80`)  

---

## 1. Pre-Demo Setup & Environment Verification

Before presenting to the faculty evaluators, verify the containerized stack is running cleanly:

```bash
# 1. Check all 4 containers are healthy
docker compose -p festconnect ps

# Expected Output:
# festconnect-web    ... Up (healthy)   0.0.0.0:80->80/tcp
# festconnect-api    ... Up (healthy)   4000/tcp (internal)
# festconnect-mysql  ... Up (healthy)   3306/tcp (internal)
# festconnect-redis  ... Up (healthy)   6379/tcp (internal)

# 2. Check health probes
curl -i http://localhost/api/health
curl -i http://localhost/api/ready
```

### Seeded Demonstration Accounts (Local Development Only)
*All demo accounts use password:* `demo1234`
- **Participant (Team Leader):** `adwait@festconnect.edu`
- **Participant (Team Member):** `shivam@festconnect.edu`
- **Participant (Team Member):** `nikhil@festconnect.edu`
- **Event Coordinator:** `coordinator@festconnect.edu`
- **Administrator:** `admin@festconnect.edu`

> **Academic Disclosure:** These accounts are seeded solely for local testing and demonstration. In production (`NODE_ENV=production`), seed scripts and mock endpoints are strictly disabled by server guards.

---

## 2. Minute-by-Minute Live Demonstration Walkthrough

### Part 1: Public Event Discovery & Caching Performance (0:00 – 2:00)
1. **Navigate to:** `http://localhost/events` in a clean browser window (e.g., Chrome).
2. **Observe:** The responsive grid of events populated from the database. Note badges: Event Category (`TECHNICAL`), Team Size bounds (`2 – 4 Members`), and Registration Fee (`INR 400.00`).
3. **Interactive Search & Filter:**
   - Type `"CodeCraft"` into the search bar. Observe instant client-side filtering without page refresh.
   - Filter by Category `"TECHNICAL"`.
4. **Open Schedule Modal:** Click on **"CodeCraft 24h Hackathon"** -> Click **"View Schedules"**.
   - Show chronological timeline slots (`09:00 – 18:00`, Auditorium Hall B).
   - *Technical Talking Point:* Explain that this read request was served via Redis Cache-Aside (`festconnect:events:schedules:1`) in <3ms.

---

### Part 2: Participant Authentication & Session Management (2:00 – 3:30)
1. **Navigate to:** `http://localhost/login` or click **"Sign In"** in the top navigation.
2. **One-Click Demo Switcher:** Click the green button: **"Participant (Adwait)"** (auto-fills `adwait@festconnect.edu` and `demo1234`).
3. **Click "Sign In":**
   - The user is authenticated.
   - *Technical Talking Point:* Show developer tools (`Application -> Cookies`). Point out the `festconnect_token` cookie marked **HttpOnly** and **SameSite=Lax**, and the `festconnect_csrf` readable token used for Double-Submit CSRF verification.
4. **Header Navigation Adaptation:** Notice the header dynamically updates to display `"Participant: Adwait Kulkarni"` with participant navigation options (**Dashboard**, **Teams**, **Registrations**).

---

### Part 3: Team Formation & Member Addition (3:30 – 5:00)
1. **Navigate to:** `http://localhost/teams`.
2. **Create New Team:** Click **"Create Team"**.
   - Enter Team Name: `"Alpha Hackers"`.
   - Click **"Create"**. Team appears with caller marked as **Leader** (`team.leader_id`).
3. **Add Team Member:**
   - Click **"Manage Roster"** on the team card.
   - In the invite input, enter: `shivam@festconnect.edu`. Click **"Add Member"**.
   - Member roster updates dynamically to show 2 members.
   - *Technical Talking Point:* Point out team leader invariance: the leader cannot leave or be removed without transferring leadership or disbanding the team.

---

### Part 4: Event Registration & Pass Gating Negative Test (5:00 – 6:30)
1. **Navigate to:** `http://localhost/events` or `http://localhost/dashboard`.
2. **Register for Event:**
   - Click **"Register"** on **"CodeCraft 24h Hackathon"**.
   - Select `"Alpha Hackers"` from the team dropdown.
   - Click **"Confirm Registration"**.
3. **Inspect Registration Status:**
   - Go to **"Registrations"** tab in Dashboard.
   - Notice the status badge is yellow: **`PENDING_PAYMENT`**.
4. **Negative Test (Pass Gating Pre-Payment):**
   - Attempt to click **"View Digital Pass"** or navigate directly to `/pass/:registrationId`.
   - *Observed Outcome:* The system blocks access and displays: `"Digital pass is not available yet. Complete payment confirmation first."` (API returns HTTP 404).

---

### Part 5: Mock Payment State Machine & Digital Pass Issuance (6:30 – 8:00)
1. **Open Payment Modal:** Click **"Pay Registration Fee"** (Amount: `INR 400.00`).
2. **Observe Academic Disclosure:** Point out the prominent banner: `"Demo Payment Gateway — No Real Money is Charged"`.
3. **Simulate Payment Failure (Negative Test):**
   - In the outcome dropdown, select **"Simulate FAILED"**.
   - Click **"Process Demo Payment"**.
   - *Observed Outcome:* An alert explains the transaction failed. The registration remains **`PENDING_PAYMENT`**, and retry button remains active.
4. **Simulate Payment Success (Positive Test):**
   - Select **"Simulate SUCCESS"**. Click **"Process Demo Payment"**.
   - *Observed Outcome:* The payment succeeds with mock transaction ID (`MOCK-SUCC-...`). Registration status transitions atomically to green: **`CONFIRMED`**.
5. **Inspect Verified Digital Pass:**
   - Click **"View Digital Pass"**.
   - The screen renders the official pass card:
     - Pass Number: `FEST-2026-REG...`
     - Visual Scannable QR Code (generated client-side via canvas from the verified backend token).
     - Event, Venue, and Team details.
6. **Print Badge:** Click **"Print Pass Badge"**. Demonstrate the `@media print` layout stripping away headers and navigation to output an ID badge.
7. **Email Notification Verification:**
   - Point to the notification section showing: `Status: DELIVERED (console)`.
   - Click **"Resend Email"** -> Immediate click shows anti-spam cooldown (`409 Conflict: Duplicate notification suppressed`).
   - Switch to terminal to show the ASCII email preview printed in the container logs (`docker compose logs api`).

---

### Part 6: Coordinator Gate Pass Scanner & Anti-Fraud Verification (8:00 – 10:00)
1. **Role Switch to Coordinator:**
   - Click **"Sign Out"**.
   - Click **"Sign In"** -> Click **"Coordinator"** demo button (`coordinator@festconnect.edu` / `demo1234`).
2. **Navigate to:** `http://localhost/coordinator`.
   - Show coordinator-specific dashboard: Event management, schedule updates, registered passholders list.
3. **Live Gate Scanner Verification (Positive Test):**
   - In the **Gate Pass Verifier** card, enter the newly issued Pass Number (or scan QR).
   - Click **"Verify & Admit Attendee"**.
   - *Observed Outcome:* Big Green Banner: **`ADMITTED — Valid Digital Pass (Team: Alpha Hackers, Event: CodeCraft 24h Hackathon)`**.
4. **Anti-Fraud Forgery Defense (Negative Test):**
   - In the pass number input, alter characters or enter a forged number: `FEST-2026-REG999-FORGED00`.
   - Click **"Verify & Admit Attendee"**.
   - *Observed Outcome:* Big Red Banner: **`REJECTED — HTTP 400: Pass number not found or cryptographic HMAC signature invalid`**.
5. **Conclude Demo:** Invite evaluator questions for the viva defense.

---

## 3. Evaluator Q&A Quick Reference

| Faculty Question | One-Line Technical Answer |
| :--- | :--- |
| *Where is the database hosted?* | Inside a Docker container running MySQL 8.0, isolated on an internal network with named volume persistence (`festconnect_mysql_data`). |
| *What happens if Redis crashes?* | Public reads transparently fall back to MySQL without throwing 500 errors; authoritative writes bypass Redis completely. |
| *How do you prevent duplicate registrations?* | Database composite unique constraint `uk_team_event` on `registration(team_id, event_id)` and row-level locking. |
| *How do you prevent forged QR passes?* | Pass payloads are signed server-authoritatively with HMAC-SHA256 using `PASS_HMAC_SECRET` and verified via `crypto.timingSafeEqual`. |
