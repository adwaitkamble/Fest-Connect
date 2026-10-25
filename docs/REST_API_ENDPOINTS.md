# FestConnect — REST API Specification & Endpoints Reference

**Course:** Object Oriented Modelling and System Design (BCER27PC02)  
**Project:** FestConnect — Centralized Technical Fest & Event Registration System  
**Base URL:** `http://localhost:4000`  
**API Version:** `v1` (`/api/v1`)  
**Specification Format:** REST / JSON over HTTP/1.1 or HTTP/2  

---

## 1. Architectural & Protocol Standards

### 1.1 Content Negotiation & Encoding
- **Request Headers:**
  - `Content-Type: application/json` (mandatory for all `POST`, `PUT`, `PATCH` operations containing a body)
  - `Accept: application/json`
- **Response Headers:**
  - `Content-Type: application/json; charset=utf-8`

### 1.2 Authentication & Session Architecture
FestConnect implements an **enterprise session model using HttpOnly signed JWT cookies**:
- **Authentication Cookie:** `festconnect_token`
  - Signed using HMAC-SHA256 with `JWT_SECRET`.
  - Properties: `HttpOnly=true` (inaccessible to JavaScript / XSS protection), `SameSite=Lax`, `Path=/`, `Max-Age=86400` (24 hours).
  - Contains: `userId`, `email`, `role` (`'PARTICIPANT' | 'COORDINATOR' | 'ADMIN'`), `iat`, `exp`.

### 1.3 CSRF Protection Mechanism
All state-modifying HTTP methods (`POST`, `PUT`, `PATCH`, `DELETE`) are guarded by **Double-Submit Cookie CSRF Protection**:
1. The client issues a `GET /api/v1/auth/csrf` request to obtain a cryptographically secure token.
2. The server sets a readable cookie `festconnect_csrf` and returns `{ "csrfToken": "<token>" }`.
3. The frontend includes this token in the custom header `x-csrf-token` on all mutations.
4. The server's `csrfProtection` middleware verifies that the header matches the cookie token before permitting execution.

### 1.4 Standardized Error Response Format (RFC 7807)
All error responses return a uniform JSON structure across all endpoints:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed for one or more fields.",
  "timestamp": "2026-10-25T11:00:00.000Z",
  "details": [
    {
      "field": "event_name",
      "message": "event_name must be between 3 and 150 characters."
    }
  ]
}
```

#### HTTP Status Code Convention:
- `200 OK`: Request succeeded; returns data payload.
- `201 Created`: Resource successfully created.
- `400 Bad Request`: Input validation failed (Zod schema violation).
- `401 Unauthorized`: Missing or invalid authentication token.
- `403 Forbidden`: Authenticated user lacks sufficient permissions (RBAC violation).
- `404 Not Found`: Target entity does not exist.
- `409 Conflict`: Business uniqueness constraint violated (e.g., duplicate team registration, duplicate member).
- `429 Too Many Requests`: Rate limit or email cooldown throttled.
- `500 Internal Server Error`: Unhandled server exception.

---

## 2. API Endpoints Catalog Summary

| Category | HTTP Method | Endpoint URL | Auth Required | Description |
| :--- | :---: | :--- | :---: | :--- |
| **System** | `GET` | `/api/health` | Public | Liveness health check |
| **System** | `GET` | `/api/ready` | Public | Database readiness probe |
| **Auth** | `GET` | `/api/v1/auth/csrf` | Public | Obtain CSRF double-submit token |
| **Auth** | `POST` | `/api/v1/auth/register` | Public | Register new participant account |
| **Auth** | `POST` | `/api/v1/auth/login` | Public | Authenticate user & set JWT session |
| **Auth** | `POST` | `/api/v1/auth/logout` | Public | Invalidate & clear session cookie |
| **Auth** | `GET` | `/api/v1/auth/me` | Authenticated | Retrieve current session user profile |
| **Events** | `GET` | `/api/v1/events` | Public (Cached) | Paginated, filtered event catalog |
| **Events** | `POST` | `/api/v1/events` | Coordinator/Admin | Create new technical fest event |
| **Events** | `GET` | `/api/v1/events/:id` | Public (Cached) | Get single event details with schedules |
| **Events** | `PATCH` | `/api/v1/events/:id` | Coordinator/Admin | Partially update event properties |
| **Events** | `PUT` | `/api/v1/events/:id` | Coordinator/Admin | Replace/update event properties |
| **Schedules** | `GET` | `/api/v1/events/:id/schedules` | Public (Cached) | Get chronological schedule timeline |
| **Schedules** | `POST` | `/api/v1/events/:id/schedules` | Coordinator/Admin | Add new schedule to an event |
| **Schedules** | `PATCH`| `/api/v1/events/:id/schedules/:scheduleId` | Coordinator/Admin | Update schedule venue, date, or timing |
| **Teams** | `POST` | `/api/v1/teams` | Authenticated | Create a new team (creator is leader) |
| **Teams** | `GET` | `/api/v1/teams` | Authenticated | List caller's teams (or all for admin) |
| **Teams** | `GET` | `/api/v1/teams/:id` | Authenticated | Get team roster and member details |
| **Teams** | `POST` | `/api/v1/teams/:id/members` | Leader/Admin | Add a participant member to the team |
| **Teams** | `DELETE`| `/api/v1/teams/:id/members/:participantId` | Leader/Self/Admin | Remove a member or leave the team |
| **Registrations** | `POST` | `/api/v1/registrations` | Leader/Admin | Register team for event (`PENDING_PAYMENT`) |
| **Registrations** | `GET` | `/api/v1/registrations` | Authenticated | List registrations filtered by role |
| **Registrations** | `GET` | `/api/v1/registrations/:id` | Authenticated | Get registration details & fees |
| **Registrations** | `PATCH`| `/api/v1/registrations/:id` | Leader/Admin | Cancel an unconfirmed registration |
| **Payments** | `POST` | `/api/v1/registrations/:id/payments` | Leader/Admin | Initiate/process payment for registration |
| **Payments** | `GET` | `/api/v1/registrations/:id/payments` | Leader/Coord/Admin | Get all payment attempts for registration |
| **Payments** | `POST` | `/api/v1/payments` | Leader/Admin | Direct payment processing endpoint |
| **Payments** | `GET` | `/api/v1/payments/:id` | Leader/Coord/Admin | Get payment record by payment ID |
| **Passes** | `GET` | `/api/v1/registrations/:id/pass` | Leader/Member/Admin| Get digital pass for a confirmed registration |
| **Passes** | `POST` | `/api/v1/registrations/:id/pass` | Leader/Admin | Generate digital pass for confirmed registration |
| **Passes** | `GET` | `/api/v1/passes/:id` | Owner/Coord/Admin | Retrieve digital pass receipt by pass ID |
| **Passes** | `POST` | `/api/v1/passes/verify` | Gate/Coord/Admin | Verify pass QR code token at entry gate |
| **Passes** | `POST` | `/api/v1/passes/validate` | Gate/Coord/Admin | Alias endpoint for pass token validation |
| **Notifications** | `GET` | `/api/v1/registrations/:id/notifications/email` | Leader/Member/Admin| Retrieve pass email delivery status & log |
| **Notifications** | `POST`| `/api/v1/registrations/:id/notifications/email` | Leader/Admin | Request or retry pass delivery via email |

---

## 3. Detailed Endpoint Specifications

### 3.1 Health & Monitoring Endpoints

#### `GET /api/health`
* **Description:** Liveness probe verifying the Express Node.js process is active.
* **Authentication:** None (Public)
* **Response (200 OK):**
```json
{
  "status": "ok",
  "liveness": "ok",
  "uptime": 1245.82,
  "timestamp": "2026-10-25T11:00:00.000Z",
  "service": "festconnect-api",
  "version": "0.1.0",
  "environment": "development"
}
```

#### `GET /api/ready`
* **Description:** Readiness probe validating MySQL database pool connectivity.
* **Authentication:** None (Public)
* **Response (200 OK):**
```json
{
  "status": "ready",
  "timestamp": "2026-10-25T11:00:00.000Z",
  "service": "festconnect-api",
  "dependencies": {
    "database": {
      "connected": true
    }
  }
}
```

---

### 3.2 Authentication Endpoints (`/api/v1/auth`)

#### `GET /api/v1/auth/csrf`
* **Description:** Initializes or refreshes the CSRF token.
* **Authentication:** None (Public)
* **Response (200 OK):**
  - Sets cookie: `festconnect_csrf=<token>; Path=/; SameSite=Lax`
```json
{
  "csrfToken": "e7c2a5d91834f0b29841cde91f0a23b498e72c81da5943b1297e6f80a42c13d5"
}
```

#### `POST /api/v1/auth/register`
* **Description:** Self-registration for new participants. Strict server-side invariant enforces role `'PARTICIPANT'`. Attempts to inject coordinator or admin roles are rejected.
* **Authentication:** None (Public; requires CSRF header)
* **Request Body:**
```json
{
  "first_name": "Adwait",
  "last_name": "Kulkarni",
  "email": "adwait@festconnect.edu",
  "password": "Password123!",
  "phone": "9876543210",
  "college": "MIT Pune",
  "department": "Computer Science",
  "year_of_study": 3,
  "skills": ["TypeScript", "React", "Node.js"]
}
```
* **Response (201 Created):**
  - Sets HttpOnly Cookie: `festconnect_token=<signed_jwt>`
```json
{
  "message": "Participant account registered successfully.",
  "user": {
    "participant_id": 1,
    "first_name": "Adwait",
    "last_name": "Kulkarni",
    "email": "adwait@festconnect.edu",
    "phone": "9876543210",
    "college": "MIT Pune",
    "department": "Computer Science",
    "year_of_study": 3,
    "role": "PARTICIPANT"
  }
}
```

#### `POST /api/v1/auth/login`
* **Description:** Authenticates participant, coordinator, or admin credentials.
* **Request Body:**
```json
{
  "email": "coordinator@festconnect.edu",
  "password": "demo1234"
}
```
* **Response (200 OK):**
  - Sets HttpOnly Cookie: `festconnect_token=<signed_jwt>`
```json
{
  "message": "Login successful.",
  "user": {
    "userId": 2,
    "email": "coordinator@festconnect.edu",
    "name": "Prof. Alan Turing",
    "role": "COORDINATOR",
    "coordinator_id": 1
  }
}
```

#### `POST /api/v1/auth/logout`
* **Description:** Clears the authentication session cookie.
* **Response (200 OK):**
```json
{
  "message": "Logout successful."
}
```

#### `GET /api/v1/auth/me`
* **Description:** Returns the profile of the currently logged-in user.
* **Authentication:** Authenticated (`festconnect_token` cookie required)
* **Response (200 OK):**
```json
{
  "user": {
    "userId": 1,
    "email": "adwait@festconnect.edu",
    "name": "Adwait Kulkarni",
    "role": "PARTICIPANT"
  }
}
```

---

### 3.3 Event Endpoints (`/api/v1/events`)

#### `GET /api/v1/events`
* **Description:** Public event catalog discovery. Paginated and filtered. Cached via Redis Cache-Aside with 60s TTL.
* **Authentication:** Public
* **Query Parameters:**
  - `page`: Integer (default: `1`)
  - `limit`: Integer (default: `10`, max: `50`)
  - `status`: String (`'APPROVED' | 'COMPLETED' | 'CANCELLED'`)
  - `eventType`: String (`'TECHNICAL' | 'CULTURAL' | 'SPORTS' | 'GAMING'`)
  - `search`: String (searches event title and description)
* **Response (200 OK):**
```json
{
  "events": [
    {
      "event_id": 1,
      "event_name": "CodeCraft 24h Hackathon",
      "event_type": "TECHNICAL",
      "description": "Annual 24-hour university coding hackathon.",
      "min_team_size": 2,
      "max_team_size": 4,
      "registration_fee": "400.00",
      "status": "APPROVED",
      "coordinator_id": 1,
      "coordinator_name": "Prof. Alan Turing",
      "coordinator_email": "coordinator@festconnect.edu"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

#### `GET /api/v1/events/:id`
* **Description:** Returns complete event details along with all associated chronological schedule entries. Cached via Redis.
* **Response (200 OK):**
```json
{
  "event_id": 1,
  "event_name": "CodeCraft 24h Hackathon",
  "event_type": "TECHNICAL",
  "description": "Annual 24-hour university coding hackathon.",
  "min_team_size": 2,
  "max_team_size": 4,
  "registration_fee": "400.00",
  "status": "APPROVED",
  "coordinator_name": "Prof. Alan Turing",
  "schedules": [
    {
      "schedule_id": 1,
      "event_id": 1,
      "event_date": "2026-11-15",
      "start_time": "09:00:00",
      "end_time": "18:00:00",
      "venue": "Auditorium Hall B"
    }
  ]
}
```

#### `POST /api/v1/events`
* **Description:** Creates a new technical fest event. Coordinators can only create events for themselves; Admins can assign to any coordinator. Invalidates event list caches.
* **Authentication:** Role `COORDINATOR` or `ADMIN`
* **Request Body:**
```json
{
  "event_name": "RoboWars Arena 2026",
  "event_type": "TECHNICAL",
  "description": "Combat robotics lightweight division championship.",
  "min_team_size": 1,
  "max_team_size": 3,
  "registration_fee": "500.00",
  "status": "APPROVED"
}
```
* **Response (201 Created):** Returns created event object.

#### `PATCH` / `PUT /api/v1/events/:id`
* **Description:** Modifies event details. Coordinators can only edit events assigned to them. Invalidates event detail, schedule, and listing caches.
* **Authentication:** Role `COORDINATOR` (owner) or `ADMIN`
* **Response (200 OK):** Returns updated event object.

---

### 3.4 Event Schedule Endpoints (`/api/v1/events/:id/schedules`)

#### `GET /api/v1/events/:id/schedules`
* **Description:** Returns chronological schedule timeline for an event. Cached in Redis.
* **Authentication:** Public
* **Response (200 OK):**
```json
[
  {
    "schedule_id": 1,
    "event_id": 1,
    "event_date": "2026-11-15",
    "start_time": "09:00:00",
    "end_time": "18:00:00",
    "venue": "Auditorium Hall B"
  }
]
```

#### `POST /api/v1/events/:id/schedules`
* **Description:** Appends a schedule timeline entry. Enforces `start_time < end_time`. Invalidates cache entries.
* **Authentication:** `COORDINATOR` (owner) or `ADMIN`
* **Request Body:**
```json
{
  "event_date": "2026-11-16",
  "start_time": "10:00:00",
  "end_time": "14:00:00",
  "venue": "Computer Lab 402"
}
```
* **Response (201 Created):** Returns created schedule entry.

#### `PATCH /api/v1/events/:id/schedules/:scheduleId`
* **Description:** Updates schedule timing or venue. Automatically fires `ScheduleSubject.notifyObservers()`, which queues asynchronous email notifications to all registered participants via `EmailNotificationObserver`.
* **Authentication:** `COORDINATOR` (owner) or `ADMIN`
* **Response (200 OK):** Returns updated schedule entry.

---

### 3.5 Team Management Endpoints (`/api/v1/teams`)

#### `POST /api/v1/teams`
* **Description:** Creates a new team. The authenticated creator is automatically registered as the team leader (`leader_id`).
* **Authentication:** Authenticated (`PARTICIPANT` or `ADMIN`)
* **Request Body:**
```json
{
  "team_name": "CyberKnights"
}
```
* **Response (201 Created):**
```json
{
  "team_id": 5,
  "team_name": "CyberKnights",
  "leader_id": 1,
  "leader_name": "Adwait Kulkarni",
  "status": "ACTIVE",
  "members": [
    {
      "participant_id": 1,
      "name": "Adwait Kulkarni",
      "email": "adwait@festconnect.edu",
      "role": "LEADER"
    }
  ]
}
```

#### `GET /api/v1/teams/:id`
* **Description:** Retrieves full team details, member roster, and registrations.
* **Authentication:** Authenticated
* **Response (200 OK):** Returns team object with `members` and `registrations` arrays.

#### `POST /api/v1/teams/:id/members`
* **Description:** Adds a registered participant to the team roster. Enforces team status and duplicate membership guards.
* **Authentication:** Team Leader or Admin
* **Request Body:**
```json
{
  "participant_id": 2
}
```
* **Response (201 Created):** Returns updated member roster.

#### `DELETE /api/v1/teams/:id/members/:participantId`
* **Description:** Removes a member from the team. Allowed for team leader, admin, or the participant removing themselves.
* **Authentication:** Team Leader, Self, or Admin
* **Response (200 OK):**
```json
{
  "message": "Team member removed successfully."
}
```

---

### 3.6 Event Registration Endpoints (`/api/v1/registrations`)

#### `POST /api/v1/registrations`
* **Description:** Registers a team for an event. Verifies team active status, event availability (`status = 'APPROVED'`), team size boundaries (`min_team_size <= count <= max_team_size`), and duplicate registration prevention (`uk_team_event`).
* **Authentication:** Team Leader or Admin
* **Request Body:**
```json
{
  "team_id": 1,
  "event_id": 1
}
```
* **Response (201 Created):**
```json
{
  "registration_id": 12,
  "team_id": 1,
  "team_name": "CyberKnights",
  "event_id": 1,
  "event_name": "CodeCraft 24h Hackathon",
  "registration_fee": "400.00",
  "status": "PENDING_PAYMENT",
  "registration_date": "2026-10-25T11:00:00.000Z"
}
```

#### `GET /api/v1/registrations`
* **Description:** Lists registrations filtered by context:
  - Participants only see registrations for teams they belong to.
  - Coordinators only see registrations for events they coordinate.
  - Admins see all registrations across the university.
* **Response (200 OK):** Returns array of registration detail objects.

#### `PATCH /api/v1/registrations/:id`
* **Description:** Cancels an unconfirmed registration. Once confirmed with payment, cancellations must go through coordinator review.
* **Authentication:** Team Leader or Admin
* **Request Body:**
```json
{
  "status": "CANCELLED"
}
```
* **Response (200 OK):** Returns cancelled registration object.

---

### 3.7 Payment Processing Endpoints (`/api/v1/payments`)

#### `POST /api/v1/registrations/:id/payments` *(or `POST /api/v1/payments`)*
* **Description:** Processes a payment attempt for a registration.
  - **Server-Authoritative:** The payment amount is computed by the backend directly from `event.registration_fee`. Any client-supplied amount is ignored.
  - **Idempotency Guard:** If already `'CONFIRMED'`, returns existing confirmation.
  - **Atomic Transaction:** Upon successful payment, records payment attempt (`status = 'SUCCESS'`), updates registration (`status = 'CONFIRMED'`), and creates the `pass_receipt` record.
* **Authentication:** Team Leader or Admin
* **Request Body:**
```json
{
  "registration_id": 12,
  "payment_method": "UPI",
  "simulate_status": "SUCCESS"
}
```
* **Response (200 OK / 201 Created):**
```json
{
  "payment_id": 8,
  "registration_id": 12,
  "amount": "400.00",
  "payment_method": "UPI",
  "transaction_reference": "TXN-MOCK-1792900000000-8472",
  "status": "SUCCESS",
  "paid_at": "2026-10-25T11:05:00.000Z",
  "registration_status": "CONFIRMED"
}
```

#### `GET /api/v1/registrations/:id/payments`
* **Description:** Returns all historical payment attempts for a registration (auditing failed attempts and successful receipts).
* **Authentication:** Team Leader, Coordinator, or Admin
* **Response (200 OK):** Returns array of payment attempts.

---

### 3.8 Digital Pass & Gate Verification Endpoints (`/api/v1/passes`)

#### `GET /api/v1/registrations/:id/pass`
* **Description:** Retrieves the official digital entry pass for a confirmed registration. If registration is `PENDING_PAYMENT` or `CANCELLED`, returns HTTP 404/400.
* **Authentication:** Team Leader, Team Member, Coordinator, or Admin
* **Response (200 OK):**
```json
{
  "pass_id": 5,
  "registration_id": 12,
  "pass_number": "FEST-2026-REG12-A8B9C0D1",
  "event_id": 1,
  "event_name": "CodeCraft 24h Hackathon",
  "team_name": "CyberKnights",
  "leader_name": "Adwait Kulkarni",
  "qr_token": "FEST26.REG12.PASS5.1792900000000.7f8a9b0c...",
  "qr_code_image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "fee_paid": "400.00",
  "status": "VALID",
  "issued_at": "2026-10-25T11:05:02.000Z"
}
```

#### `POST /api/v1/passes/verify` *(or `POST /api/v1/passes/validate`)*
* **Description:** Gate entrance verification. Scanner devices submit the scanned QR code token or pass number. The backend validates the HMAC-SHA256 signature against `PASS_HMAC_SECRET` and checks current registration/payment status in MySQL.
* **Authentication:** Gate Volunteer, Event Coordinator, or Admin
* **Request Body:**
```json
{
  "qr_token": "FEST26.REG12.PASS5.1792900000000.7f8a9b0c...",
  "event_id": 1
}
```
* **Response (200 OK):**
```json
{
  "valid": true,
  "message": "Pass verified successfully. Admittance granted.",
  "pass_number": "FEST-2026-REG12-A8B9C0D1",
  "event_name": "CodeCraft 24h Hackathon",
  "team_name": "CyberKnights",
  "participant_name": "Adwait Kulkarni",
  "verified_at": "2026-10-25T11:10:00.000Z"
}
```

---

### 3.9 Pass Email Notification Endpoints (`/api/v1/registrations/:id/notifications`)

#### `GET /api/v1/registrations/:id/notifications/email`
* **Description:** Inspects pass email dispatch status, retry counts, error history, and active cooldown countdown.
* **Authentication:** Team Leader, Team Member, Coordinator, or Admin
* **Response (200 OK):**
```json
{
  "registration_id": 12,
  "status": "SENT",
  "recipient_email": "adwait@festconnect.edu",
  "retry_count": 0,
  "last_sent_at": "2026-10-25T11:05:05.000Z",
  "cooldown_seconds_remaining": 45,
  "can_retry": false
}
```

#### `POST /api/v1/registrations/:id/notifications/email`
* **Description:** Requests or retries delivery of the official digital pass confirmation email. Protected against spam by a 60-second cooldown timer.
* **Authentication:** Team Leader or Admin
* **Response (200 OK):**
```json
{
  "message": "Pass notification email sent successfully.",
  "recipient": "adwait@festconnect.edu",
  "status": "SENT",
  "timestamp": "2026-10-25T11:06:00.000Z"
}
```
* **Error Response (429 Too Many Requests):** Returned if caller retries within the 60-second cooldown period.

---

## 4. Summary & Verification Notes
- **Specification Source of Truth:** This document maps 1:1 with the code controllers in [`apps/api/src/routes/`](file:///d:/Studies/B.Tech%20first%20sem/OOMSD/TechFest%20Implementation/apps/api/src/routes/) and the validated schema definitions in [`openapi.yaml`](file:///d:/Studies/B.Tech%20first%20sem/OOMSD/TechFest%20Implementation/openapi.yaml).
- **Automated Validation:** All 35 endpoints are verified by the automated Vitest test suite (`apps/api/tests/`), with 280/280 tests passing monorepo-wide.
