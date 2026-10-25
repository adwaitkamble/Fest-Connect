# Nginx Infrastructure Configuration

This directory contains Nginx configuration templates for reverse proxying and static frontend hosting.

- `nginx.conf.example`: Reference configuration for production/container hosting where Nginx serves the React static build and reverse-proxies `/api/` traffic to the Express API backend.
- Full local containerization will be configured in **Phase 10 (Docker Compose & Integration Verification)**.
