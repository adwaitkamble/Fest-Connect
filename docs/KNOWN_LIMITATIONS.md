# FestConnect — Known Limitations & Technical Disclosures
**Project:** FestConnect — Centralized Technical Fest & Event Registration Management System  
**Course:** Object Oriented Modelling and System Design (BCER27PC02)  
**Academic Context:** FA2 Design to Deployment  

In accordance with strict academic integrity rules, this document transparently records all known limitations, environmental boundaries, and unperformed tests in the FestConnect system.

---

## 1. External Service Integrations

### A. Mock Payment Gateway
- **Status:** Implemented via `MockPaymentGatewayAdapter`.
- **Disclosure:** No real money is processed or charged. The system simulates `SUCCESS`, `FAILED`, and `PENDING` states for demonstration and testing.
- **Production Guard:** `PaymentFactory` strictly enforces that `PAYMENT_PROVIDER=mock` throws a fatal `SecurityError` if `NODE_ENV=production`.
- **Production Prerequisite:** Deploying to a live commercial event requires integrating an accredited payment gateway SDK (e.g., Razorpay, Stripe, or Paytm) with official merchant API keys and webhook verification.

### B. Email Notification Delivery
- **Status:** Default implementation uses zero-dependency `ConsoleEmailAdapter`.
- **Disclosure:** Dispatched pass notifications and schedule change alerts are formatted into clean ASCII email previews and printed directly to the server logs. Real SMTP transmission to external Gmail or institutional email addresses is not executed unless valid credentials (`GMAIL_USER`, `GMAIL_APP_PASSWORD`) are supplied in `.env`.
- **Production Prerequisite:** Production requires a dedicated transactional email service (e.g., SendGrid, Amazon SES, or Postmark) with verified SPF/DKIM DNS records.

---

## 2. Infrastructure & Scalability Boundaries

### A. Single-Node Docker Compose Deployment
- **Status:** Tested and verified on a single workstation node using Docker Compose.
- **Disclosure:** While the architecture is designed for horizontal scaling (stateless Express API, centralized Redis cache, and MySQL volume persistence), testing has been conducted as a single-host 4-container topology.
- **Production Prerequisite:** Deploying for 50,000+ multi-campus fest attendees would require container orchestration (Kubernetes or AWS ECS), an external managed database (AWS RDS MySQL with read replicas), an external managed cache (AWS ElastiCache Redis), and a global Content Delivery Network (CloudFront / Cloudflare).

### B. High-Volume Synthetic Load Testing
- **Status:** Load benchmarks evaluated through architectural modeling and unit/integration performance verification (297 automated tests).
- **Disclosure:** Synthetic stress testing exceeding 1,000 concurrent requests/second (e.g., using k6, Locust, or JMeter) was not executed on the local development environment to avoid saturating host resources.

---

## 3. FA1 Schema & Domain Entity Reconciliation

### A. Documented Additive Schema Extensions
The implementation preserves all FA1 entities and attributes from `ER Diagram.drawio` and `UMl_Project_final.drawio`. The following additive fields were introduced strictly to satisfy technical and security requirements:
- `participant.password_hash`: Secure bcrypt password hash for authentication (FA1 diagrams omitted authentication credentials).
- `participant.role`: Technical role enum (`PARTICIPANT`, `COORDINATOR`, `ADMIN`) to enforce authorization boundaries.
- `payment.success_registration_id`: Virtual generated column with unique constraint `uk_payment_success_registration` to prevent duplicate concurrent payments.
- `pass_receipt.qr_data_url` & `hmac_hash`: Server-authoritative HMAC-SHA256 signature fields to prevent ticket forgery.
- `email_notification` & `email_notification_attempt`: Tables added in migration `002_email_notifications.sql` to persist email delivery state and anti-spam cooldown audit trails.

---

## 4. Operational & Edge-Case Boundaries

### A. Event Coordinator Self-Assignment
- Coordinators can only create, update, or verify schedules for events they are explicitly assigned to. Coordinators cannot assign events to other coordinators; reassignment is an administrative privilege.

### B. Single Fest Lifecycle Scope
- The system is optimized for a single academic year fest edition. Multi-year historical archiving across a 10-year span would benefit from table partitioning on `academic_year`.
