# MaintainIQ — PROJECT_SPEC.md

**Type:** Enterprise Asset Maintenance Management System (Hackathon Build)
**Track:** SMIT Final Hackathon — Advanced Full-Stack + GenAI
**Duration:** 8 Hours | Solo Developer
**Stack:** React 19 + Vite + Tailwind, Node.js/Express, MongoDB, Gemini API, Cloudinary

This is a single, complete spec. Feed this whole file to your coding agent (Antigravity) as context for every prompt. Update the "Progress" section at the bottom as you go — that's your recovery point if an agent session breaks.

---

## 1. Objective

Build a working end-to-end flow: Admin registers asset → QR generated → public scans/reports issue → AI triages issue → Admin assigns technician → technician performs maintenance → asset history updated → dashboard shows analytics. Core scope first, bonuses only after core is demo-stable.

---

## 2. Roles & Permissions

| Role | Can Do |
|---|---|
| **Admin** | Register/edit assets, view all issues, assign technicians, view dashboard/analytics, manage users |
| **Technician** | View assigned issues only, start inspection, add maintenance notes/parts/cost/evidence, resolve assigned issues |
| **Public (no auth)** | View public asset page (safe fields only), report issue, optionally check issue status by number |

Authorization must be enforced **server-side** (middleware), not just hidden in UI.

---

## 3. Folder Structure

```
backend/
  src/
    config/        (db.js, cloudinary.js, redis.js)
    models/         (User, Asset, Issue, MaintenanceLog, AssetHistory)
    controllers/
    routes/
    middleware/     (auth.js, rbac.js, rateLimiter.js, errorHandler.js, upload.js)
    services/       (ai.service.js, qr.service.js, email.service.js)
    utils/          (asyncHandler.js, apiResponse.js, apiError.js)
    app.js
    server.js
  .env
  Dockerfile

frontend/
  src/
    pages/          (Login, Dashboard, Assets, AssetDetail, PublicAsset, ReportIssue, Issues, IssueDetail)
    components/
    services/       (api.js — axios instance)
    store/          (zustand stores)
    hooks/
    utils/
  Dockerfile

docker-compose.yml
README.md
```

---

## 4. Database Schema

**User**
```
name, email (unique), password (hashed), role: enum[admin, technician], phone, createdAt
```

**Asset**
```
assetCode (unique, auto-generated e.g. AST-0001), name, category, location,
condition: enum[Good, Fair, Poor],
status: enum[Operational, Issue Reported, Under Inspection, Under Maintenance, Out of Service, Retired],
assignedTechnician (ref User, optional),
lastServiceDate, nextServiceDate,
qrCodeUrl, publicSlug (unique, used in public URL),
createdBy (ref User), createdAt, updatedAt
```

**Issue**
```
issueNumber (unique, auto e.g. ISS-0001),
asset (ref Asset),
title, description, category, priority: enum[Low, Medium, High, Critical],
status: enum[Reported, Assigned, Inspection Started, Maintenance In Progress, Waiting for Parts, Resolved, Closed, Reopened],
reporterName, reporterContact (optional, public submission),
assignedTechnician (ref User),
aiSuggestion: { title, category, priority, possibleCauses[], initialChecks[], recurringWarning, wasEdited: bool },
evidenceUrls[] (Cloudinary),
createdAt, updatedAt
```

**MaintenanceLog**
```
issue (ref Issue), asset (ref Asset), technician (ref User),
inspectionNotes, workPerformed, partsUsed[], cost (>= 0),
evidenceUrls[], finalCondition,
startedAt, completedAt
```

**AssetHistory** (append-only, never edit/delete)
```
asset (ref Asset), actor (ref User or "Public"), action (string),
relatedIssue (ref Issue, optional), timestamp, metadata (object)
```

---

## 5. API Endpoints (grouped)

**Auth**
```
POST /api/auth/register       (admin creates technician/admin accounts)
POST /api/auth/login
GET  /api/auth/me
```

**Assets** (admin only for write, auth required for read except public route)
```
POST   /api/assets
GET    /api/assets              (search, filter: status/category/location)
GET    /api/assets/:id
PATCH  /api/assets/:id
GET    /api/assets/:id/qr       (returns QR image/url)
GET    /api/assets/:id/history
```

**Public** (no auth)
```
GET  /api/public/assets/:slug          (safe fields only)
POST /api/public/assets/:slug/issues   (report issue)
GET  /api/public/issues/:issueNumber   (status check, optional)
```

**Issues** (auth required)
```
GET    /api/issues                    (filter: status/priority/technician/asset)
GET    /api/issues/:id
PATCH  /api/issues/:id/assign         (admin)
PATCH  /api/issues/:id/status         (validated transitions only)
POST   /api/issues/:id/ai-triage      (calls Gemini, returns structured suggestion — doesn't save yet)
```

**Maintenance**
```
POST /api/issues/:id/maintenance-log   (technician, only if assigned to them)
```

**Dashboard**
```
GET /api/dashboard/stats     (counts by status, priority, category, avg resolution time)
```

---

## 6. Business Rules — Status State Machines

**Asset status** (event → new status)
```
New issue submitted        → Issue Reported
Technician starts inspection → Under Inspection
Repair work begins         → Under Maintenance
Maintenance completed      → Operational
Critical safety issue      → Out of Service
Asset permanently removed  → Retired
```

**Issue status** — only forward-valid transitions allowed, enforce in backend:
```
Reported → Assigned → Inspection Started → Maintenance In Progress → Waiting for Parts → Resolved → Closed
Resolved → Reopened (allowed)
Closed → cannot edit unless Reopened first
```

**Hard rules:**
- Technician can only update issues assigned to them.
- Issue cannot move to Resolved without at least one maintenance note.
- Maintenance cost cannot be negative (schema-level validation).
- Next service date cannot be before maintenance completion date.
- Duplicate asset codes rejected (unique index + friendly error).
- Every meaningful action (create, assign, status change, resolve) writes to AssetHistory.
- Critical priority issues must be visually flagged in UI (not just data).

---

## 7. QR Flow

- On asset creation, generate `publicSlug` (random/short, not guessable sequential ID) and QR code encoding `https://yourapp.com/public/asset/:slug` — nothing else (no private data).
- Store QR image (Cloudinary or generate on-the-fly with `qrcode` npm package, cache URL).
- Asset detail screen: QR preview, download button, copy-link button, "Open Public Page" button.
- Editing asset name/location must NOT change the slug — QR keeps working.
- Invalid slug → clean "Asset not found" page, not a crash.
- Retired asset → public page still loads but clearly shows "Retired" banner.

---

## 8. AI Issue Triage

**Flow:** Public/user submits raw complaint text → frontend calls `/api/issues/:id/ai-triage` (or a pre-save triage endpoint) → backend sends asset context + complaint to Gemini with a strict prompt → returns structured JSON → user reviews/edits in UI → confirms → saved.

**Prompt rules (system-level):**
- Always request strict JSON output only, matching this schema:
```json
{
  "title": "string",
  "category": "string",
  "priority": "Low|Medium|High|Critical",
  "possibleCauses": ["string"],
  "initialChecks": ["string"],
  "recurringWarning": "string or null"
}
```
- Include asset type, condition, location, and recent history in the prompt context.
- Never let AI give unsafe electrical/mechanical/fire instructions — prompt must explicitly instruct: "if issue involves electrical, gas, fire, or structural safety risk, initialChecks must recommend stopping use and calling a qualified technician, not DIY steps."
- Validate JSON before saving (try/catch parse); if invalid or AI times out → show fallback: let user fill fields manually, don't block submission.
- Store `wasEdited: true/false` on the issue — track if user changed AI's suggestion.
- API key stays in backend `.env`, never sent to frontend.

**Error handling states to build:** loading, timeout (~10s), retry button, "AI unavailable — continue manually" fallback.

---

## 9. Maintenance & Evidence

- Technician uploads evidence (images) via Multer → Cloudinary, store returned URLs on MaintenanceLog/Issue.
- Maintenance log requires: inspectionNotes, workPerformed, cost, finalCondition minimum.
- On completion, backend updates Asset (status, lastServiceDate) and writes AssetHistory entry.

---

## 10. Dashboard, Search, Filters

- Cards: total assets, open issues, critical issues, resolved this week, avg resolution time.
- Filters: status, category, location, priority, technician — combinable query params.
- Search: asset name/code, issue title/number.
- Keep it functional, not decorative — judge checklist explicitly penalizes "decorative charts."

---

## 11. Security

- `helmet`, `cors` (whitelist origins), `compression`, `morgan` for logging.
- JWT in httpOnly cookie or Authorization header (pick one, be consistent).
- Bcrypt for passwords (12 rounds).
- Rate limiting: public issue-report endpoint, auth endpoints, AI-triage endpoint — separate limiters, stricter on AI (e.g. 5/min) and public report (e.g. 10/min per IP).
- Input validation on every write route (Joi/express-validator/Zod).
- Consistent API response shape:
```json
{ "success": true, "data": {...}, "message": "" }
{ "success": false, "error": { "message": "", "code": "" } }
```

---

## 12. Bonus Implementation Notes (priority order — see hour plan)

1. **Rate Limiting (1 pt)** — `express-rate-limit`, apply to auth/public/AI routes.
2. **Redis (3 pt)** — Use `rate-limit-redis` as the store for the limiter above. This single implementation earns both bonuses — genuinely justified use, not decorative.
3. **Docker (3 pt)** — Dockerfile for backend + frontend, one `docker-compose.yml` connecting both + Mongo (or Atlas via env var). Keep it simple: multi-stage build not required for a hackathon, just working containers.
4. **Email (2 pt)** — Nodemailer + a free SMTP (Gmail app password or Resend/Mailtrap). Trigger on: issue assigned to technician, issue resolved (notify reporter if email given).
5. **GitHub Actions (4 pt)** — One workflow: install deps, run lint/build on push. Doesn't need to deploy, just needs to run and pass.
6. **AWS Deploy (5 pt)** — Only after Render/Vercel backup is live. Simplest path: backend on Elastic Beanstalk or EC2, frontend on S3+CloudFront, or just EC2 for both behind Nginx if faster for you. Since you're comfortable, budget max 60 min — if it's dragging past that, keep the Render/Vercel deploy as your submitted link and don't risk demo stability.

---

## 13. Build Order (Hour-by-Hour)

| Hr | Focus |
|---|---|
| 1 | Repo setup, Atlas, Cloudinary, Gemini key, folder structure, auth + RBAC |
| 2 | Asset CRUD + unique code + QR generation |
| 3 | Public asset page + issue reporting form |
| 4 | AI Issue Triage integration (Gemini, structured, editable) |
| 5 | Assignment + status workflow + Cloudinary evidence upload |
| 6 | Asset history + dashboard + search/filters + frontend polish |
| 7 | Bonuses: rate limit + Redis, Docker, Email |
| 8 | Deploy (Render/Vercel → AWS attempt), GitHub Actions, README + API docs, demo run |

---

## 14. Deployment & Submission Checklist

- [ ] Backend deployed (Render as safety net minimum)
- [ ] Frontend deployed (Vercel)
- [ ] MongoDB Atlas connected (whitelisted IPs: 0.0.0.0/0 for demo)
- [ ] Demo credentials in README (admin + technician login)
- [ ] README: setup steps, tech stack, features, architecture diagram/description
- [ ] API docs or Postman collection exported
- [ ] Clean incremental git commits (not one final commit)
- [ ] Full flow tested live: register asset → scan QR → report issue → AI triage → assign → maintain → resolve → history updates → dashboard reflects it

---

## 15. Progress Tracker (update as you go)

**Current Hour:** 7 (mid)
**Completed:** auth + RBAC, asset CRUD + QR, public asset page, issue reporting, AI triage, assignment flow, status state machine, maintenance logging, Cloudinary uploads, asset status sync, asset activity history timeline, dashboard KPI metrics telemetry, global search + filter deep wiring, frontend polish, Redis-backed rate limiting on public/auth/AI routes, Docker setup working via docker-compose
**In Progress:** —
**Blocked/Issue:** —
**Next Prompt for Agent:** Prompt 11 — Bonus: Email