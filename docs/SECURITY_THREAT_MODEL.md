# Strata — Security Threat Model

> Living document. Reviewed: 2026-02-25
> Methodology: STRIDE + asset-centric analysis

---

## 1. Assets (What Are We Protecting?)

| # | Asset | Classification | Storage |
|---|-------|---------------|---------|
| A1 | **JWT access tokens** | Secret | `localStorage` (browser) |
| A2 | **JWT refresh tokens** | Secret | `localStorage` (browser) + hashed in PostgreSQL |
| A3 | **JWT signing secret** | Critical secret | Env var `jwt_secret` (default: hardcoded dev value) |
| A4 | **User credentials** | Secret | bcrypt hashes in PostgreSQL `users` table |
| A5 | **Session cookie** (`dao_session`) | Sensitive | Browser cookie (not httpOnly) |
| A6 | **Data product financial data** | Confidential | PostgreSQL `data_products` table |
| A7 | **Decision/approval workflows** | Confidential | PostgreSQL `decisions` table |
| A8 | **Capital impact & ROI data** | Confidential | Derived from products + decisions |
| A9 | **Connector credentials** (future) | Critical secret | Not yet implemented — placeholder in Setup |
| A10 | **Encryption key** | Critical secret | Env var `encryption_key` (default: hardcoded dev value) |
| A11 | **RBAC role assignments** | Sensitive | PostgreSQL `users.role` column |
| A12 | **Audit logs** | Sensitive | PostgreSQL `audit_logs` table |

---

## 2. Threat Actors

| Actor | Motivation | Capability |
|-------|-----------|------------|
| **External attacker** | Data theft, financial espionage | XSS injection, credential stuffing, CSRF, phishing |
| **Malicious insider** | Privilege escalation, data exfiltration | Valid credentials, knowledge of RBAC gaps |
| **Compromised dependency** | Supply chain attack | Code execution via npm/PyPI package |
| **Automated scanner** | Vulnerability discovery | Port scanning, header analysis, known CVE exploitation |
| **Disgruntled employee** | Sabotage | Approved decisions, data deletion, role abuse |

---

## 3. Attack Surfaces

### 3.1 Frontend (Next.js 16 — `apps/web`)

| Surface | Entry Point | Exposure |
|---------|------------|----------|
| Browser `localStorage` | Any XSS vector | Access + refresh tokens readable by any JS |
| `document.cookie` | XSS / devtools | `dao_session=1` cookie is not httpOnly — readable and forgeable |
| Client-side routing | URL bar / deep links | No `middleware.ts` wired — all dashboard routes accessible without auth at edge |
| `next.config.ts` | HTTP headers | Zero security headers — no CSP, X-Frame-Options, HSTS |
| API rewrite proxy | `/api/:path*` | Proxies all requests to backend — no request validation at edge |
| Seed data fallback | `hooks.ts` line 78-83 | When API fails, silently serves mock data — masks real failures |

### 3.2 Backend (FastAPI — `apps/api`)

| Surface | Entry Point | Exposure |
|---------|------------|----------|
| CORS middleware | All origins when misconfigured | Default origins are localhost-only but `allow_methods=["*"]`, `allow_headers=["*"]` |
| Auth endpoints | `/api/v1/auth/*` | Rate-limited (5/min) but demo-login enabled by default |
| JWT validation | All protected endpoints | HS256 with hardcoded dev secret as default |
| Database queries | SQLAlchemy ORM | Parameterized queries — low SQL injection risk |
| Health endpoint | `/health` | Unauthenticated — returns DB connectivity status |
| Demo seeder | App startup lifespan | Runs seed data insertion on every boot when DEMO_MODE=true |

### 3.3 Infrastructure

| Surface | Entry Point | Exposure |
|---------|------------|----------|
| Docker Compose | Port 5433 exposed | PostgreSQL directly accessible on host network |
| Environment variables | `.env` / docker-compose.yml | Hardcoded dev secrets in compose file |
| CI pipeline | GitHub Actions | Test secrets hardcoded in workflow YAML |
| Web Dockerfile | `npm run dev` | Runs development server in container (not production build) |

---

## 4. STRIDE Threat Analysis

### 4.1 Spoofing (Identity)

| ID | Threat | Severity | Current State | Mitigation |
|----|--------|----------|---------------|------------|
| S1 | **Forge `dao_session` cookie** — cookie value is `"1"`, set via `document.cookie`, not httpOnly | 🔴 High | Exploitable | Move to server-set httpOnly cookie with signed value |
| S2 | **Steal JWT from localStorage** — any XSS payload can read `dao_token` and `dao_refresh_token` | 🔴 High | Exploitable via XSS | Move tokens to httpOnly cookies; add CSP to block inline scripts |
| S3 | **Credential stuffing on `/auth/login`** | 🟡 Medium | Rate-limited to 5/min per IP | Add account lockout after N failures; CAPTCHA on threshold |
| S4 | **Demo-login abuse** — `/auth/demo-login` accepts any of 15 roles with no credentials | 🟠 High | Active when DEMO_MODE=true | Disable in production; add env guard that blocks demo endpoints |
| S5 | **JWT secret brute-force** — HS256 with known default `"dev-secret-change-in-production"` | 🔴 Critical | Runtime check prevents production use of default | Enforce minimum 256-bit random secret; consider RS256 key pair |

### 4.2 Tampering (Data Integrity)

| ID | Threat | Severity | Current State | Mitigation |
|----|--------|----------|---------------|------------|
| T1 | **Silent mock data injection** — when API is enabled but fails, seed data replaces real data | 🔴 High | Active in `useData` hook | Remove seed fallback when `isAPIEnabled`; show error state instead |
| T2 | **CSRF on mutations** — no CSRF token on POST/PATCH/DELETE | 🟠 High | Unmitigated | Implement CSRF tokens; SameSite=Strict helps but is insufficient |
| T3 | **Modify decision approvals** — decisions endpoint allows PATCH without multi-party verification | 🟡 Medium | RBAC-gated (`decisions:approve`) | Add approval workflow with countersign requirement |
| T4 | **Tamper with financial calculations** — client-side formatting functions can mask backend data | 🟢 Low | Format functions are display-only | Ensure all financial logic is server-side; client is read-only |
| T5 | **Non-deterministic seed data** — `Math.random()` in seed produces different data on each load | 🟡 Medium | Active | Use seeded PRNG for consistent demo data |

### 4.3 Repudiation (Auditability)

| ID | Threat | Severity | Current State | Mitigation |
|----|--------|----------|---------------|------------|
| R1 | **No request IDs** — API calls have no correlation ID for tracing | 🟠 High | Unmitigated | Add `X-Request-ID` header in apiFetch; propagate to backend |
| R2 | **No structured logging** — frontend uses `console.error` only; backend has basic logging | 🟡 Medium | Minimal | Add structured JSON logging with correlation IDs |
| R3 | **Audit log gaps** — only login events logged; mutations not tracked | 🟠 High | Partial | Extend audit logging to all write operations |
| R4 | **No log integrity protection** — logs stored in DB alongside application data | 🟡 Medium | No separation | Ship logs to external service (e.g., CloudWatch, Datadog) |

### 4.4 Information Disclosure

| ID | Threat | Severity | Current State | Mitigation |
|----|--------|----------|---------------|------------|
| I1 | **XSS token exfiltration** — localStorage tokens readable by injected scripts | 🔴 High | See S2 | httpOnly cookies + CSP |
| I2 | **Error messages leak internals** — APIError returns raw backend `detail` to client | 🟡 Medium | Active | Sanitize error messages; hide stack traces in production |
| I3 | **Health endpoint exposes DB status** — `/health` returns database connectivity details | 🟢 Low | Active | Return only "ok"/"error" without DB details |
| I4 | **No X-Content-Type-Options** — browser may MIME-sniff responses | 🟡 Medium | Unmitigated | Add `X-Content-Type-Options: nosniff` header |
| I5 | **Docker Compose exposes PostgreSQL** — port 5433 on host for dev, but pattern may persist | 🟡 Medium | Dev-only | Bind to 127.0.0.1 only; remove port mapping in production |
| I6 | **Package versions in response** — no hiding of server framework identification | 🟢 Low | FastAPI default | Add `Server` header override |

### 4.5 Denial of Service

| ID | Threat | Severity | Current State | Mitigation |
|----|--------|----------|---------------|------------|
| D1 | **No request timeouts on frontend** — `fetch()` without `AbortController` hangs indefinitely | 🟠 High | Active | Add 30s timeout via AbortController in apiFetch |
| D2 | **N+1 data fetching** — `useCapitalModel` fires 10 independent API calls simultaneously | 🟡 Medium | Active | Batch into single compound API endpoint |
| D3 | **No pagination limits** — some endpoints return all records | 🟡 Medium | Varies by endpoint | Enforce max page size (100) on all list endpoints |
| D4 | **Rate limiting only on auth** — non-auth endpoints have no rate limits | 🟡 Medium | Active | Add tiered rate limiting to all API routes |
| D5 | **No circuit breaker** — API failures cascade through all 10+ hooks on a page | 🟡 Medium | Active | Add circuit breaker pattern; fail fast after N consecutive errors |

### 4.6 Elevation of Privilege

| ID | Threat | Severity | Current State | Mitigation |
|----|--------|----------|---------------|------------|
| E1 | **Frontend-only permission gates** — `hasPermission()` runs client-side only | 🟠 High | Backend also enforces via `require_permission()` | Verify backend enforcement on all mutation endpoints |
| E2 | **Role embedded in JWT** — role change requires token refresh/re-login | 🟡 Medium | 15-min access token window | Add role version claim; revalidate on sensitive operations |
| E3 | **No per-org tenant isolation** — `org_id` in JWT but no row-level security | 🟠 High | Depends on query filtering | Add RLS or mandatory `org_id` filter on all queries |
| E4 | **Admin role has full access** — `admin` role bypasses all permission checks | 🟡 Medium | By design | Require MFA for admin sessions; audit admin actions separately |

---

## 5. Connector / Ingestion Threats (Future)

The Setup page has placeholder buttons for "Add Connector", "Sync Now", etc. When connector ingestion is implemented, the following threats apply:

| ID | Threat | Severity | Mitigation |
|----|--------|----------|------------|
| C1 | **SSRF via connector URL** — user-supplied webhook/API URLs could target internal services | 🔴 High | Validate URLs against allowlist; block RFC 1918 ranges; use isolated network |
| C2 | **Credential storage** — connector API keys stored in DB | 🔴 High | Encrypt at rest with `encryption_key`; never return full keys to frontend |
| C3 | **Data exfiltration via connector** — malicious connector pushes data to external endpoint | 🟠 High | Network policy to restrict egress; audit all connector traffic |
| C4 | **Injection via ingested data** — connector payload contains XSS or SQL injection | 🟠 High | Sanitize all ingested data; validate schemas; use parameterized inserts |
| C5 | **Supply chain compromise** — third-party connector SDK contains malware | 🟡 Medium | Pin SDK versions; use lockfiles; enable npm audit / pip audit in CI |
| C6 | **Sync runaway** — malicious or buggy connector floods system with data | 🟡 Medium | Rate-limit ingest; set max record count per sync; monitor sync duration |

---

## 6. Mitigation Roadmap

### Phase 1 — Quick Wins (1-2 days)

| # | Action | Threats Addressed | Effort |
|---|--------|-------------------|--------|
| 1 | Add security headers in `next.config.ts` | I4, S2 (partial) | 30 min |
| 2 | Wire `middleware.ts` to export `proxy` function | S1, E1 | 15 min |
| 3 | Add request timeouts (30s `AbortController`) in `apiFetch` | D1 | 15 min |
| 4 | Remove seed fallback when `isAPIEnabled` | T1 | 15 min |
| 5 | Add env validation (Zod schema) | S5 | 30 min |
| 6 | Add `X-Request-ID` header in apiFetch | R1 | 15 min |
| 7 | Disable demo-login in production | S4 | 15 min |
| 8 | Bind Docker Compose PostgreSQL to 127.0.0.1 | I5 | 5 min |

### Phase 2 — Hardening (1-2 weeks)

| # | Action | Threats Addressed | Effort |
|---|--------|-------------------|--------|
| 9 | Move tokens to httpOnly cookies | S1, S2, I1 | 2 days |
| 10 | Implement CSRF token flow | T2 | 1 day |
| 11 | Add CSP header with nonce-based script policy | S2, I1 | 1 day |
| 12 | Tighten CORS to specific production origins | All cross-origin threats | 30 min |
| 13 | Add structured logging with request IDs | R1, R2 | 1 day |
| 14 | Extend audit logging to all mutations | R3 | 1 day |
| 15 | Enforce RS256 JWT signing (key pair) | S5 | 1 day |
| 16 | Add per-org RLS enforcement | E3 | 2 days |

### Phase 3 — Defense in Depth (1-2 months)

| # | Action | Threats Addressed | Effort |
|---|--------|-------------------|--------|
| 17 | Add npm audit + pip audit to CI | C5 | 2 hours |
| 18 | Add SAST scanner (Semgrep/CodeQL) to CI | All code-level | 1 day |
| 19 | Implement circuit breaker for API calls | D5 | 2 days |
| 20 | Add E2E security tests (auth flow, permission bypass) | E1, E2, S1 | 3 days |
| 21 | Implement connector SSRF protection (when connectors ship) | C1 | 2 days |
| 22 | Add MFA for admin/CFO roles | E4, S3 | 5 days |
| 23 | External penetration test | All | External engagement |

---

## 7. Residual Risk

Even after all mitigations, the following risks remain:

| Risk | Why It Persists | Acceptance Criteria |
|------|----------------|-------------------|
| **Zero-day in Next.js / FastAPI** | Framework vulnerabilities are outside our control | Keep dependencies updated; subscribe to security advisories |
| **Insider with admin credentials** | Full-access roles are necessary for system operation | Audit admin actions; implement break-glass procedures |
| **Client-side manipulation** | Any SPA can be modified via devtools | All authorization and validation must be server-side; client is untrusted |
| **Social engineering** | Users may be phished for credentials | Security awareness training; consider SSO with MFA |
| **Supply chain attacks** | npm/PyPI dependencies are extensive | Lockfiles, audit tools, minimal dependency set |

---

## 8. Current Security Posture Summary

```
Authentication:   ███░░░░░░░  3/10  — JWT works but tokens in localStorage, forgeable session cookie
Authorization:    ██████░░░░  6/10  — RBAC implemented with 15 roles, 35 permissions; backend enforces
Transport:        ████░░░░░░  4/10  — No HSTS, no CSP, no security headers; CORS too permissive
Data Protection:  █████░░░░░  5/10  — bcrypt passwords, hashed refresh tokens; no encryption at rest
Monitoring:       ██░░░░░░░░  2/10  — Login audit only; no request IDs, no structured logging
Supply Chain:     ███░░░░░░░  3/10  — Lockfiles present; no audit scanning in CI
Infrastructure:   ████░░░░░░  4/10  — Docker Compose dev-only; no production hardening
```

**Overall Security Maturity: 3.9 / 10** — Functional authentication and authorization layer, but missing critical infrastructure hardening, transport security, and operational monitoring. Phase 1 quick wins would raise this to ~5.5/10.
