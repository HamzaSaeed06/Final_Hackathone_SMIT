# MaintainIQ — AGENT_PROMPTS.md

Copy-paste these prompts into Antigravity in order. Every prompt ends with an instruction to update the Progress Tracker in `PROJECT_SPEC.md` — always keep that file open/uploaded alongside these prompts.

**Rule:** If agent limit hits mid-task, don't panic. Open new agent, paste the "RECOVERY PROMPT" below first, then continue from whatever the Progress Tracker says is next.

---

## 🔁 RECOVERY PROMPT (use this whenever a new agent session starts)

```
You are continuing work on MaintainIQ, a MERN-stack asset maintenance platform.
Read PROJECT_SPEC.md fully before doing anything — it has the schema, API design,
business rules, and folder structure.

Then read the "Progress Tracker" section at the bottom of PROJECT_SPEC.md to see
what is already done, what is in progress, and what the next task is.

Also inspect the existing codebase (backend/ and frontend/ folders) to confirm
what's actually implemented — the tracker is a guide, the code is the source of truth.

Do not restructure or rewrite existing working code. Continue from where it left off.

Once you understand the state, tell me in 3-4 lines: what's done, what's next,
and then wait for my next instruction.
```

---

## Prompt 01 — Project Setup + Folder Structure

```
Read PROJECT_SPEC.md sections 3 (Folder Structure) and 4 (Database Schema).

Set up the full project:
1. Initialize backend/ (Node.js + Express) and frontend/ (React 19 + Vite + Tailwind)
   using the exact folder structure in section 3.
2. Install all dependencies listed in the Tech Stack (section: Tech Stack in the
   original hackathon context — mongoose, jwt, bcrypt, cloudinary, multer, helmet,
   cors, compression, morgan, express-rate-limit, socket.io, qrcode, dotenv on backend;
   react-router, axios, zustand, react-hook-form, react-hot-toast, lucide-react on frontend).
3. Create Mongoose models for User, Asset, Issue, MaintenanceLog, AssetHistory exactly
   as specified in section 4 — include validation (e.g. cost >= 0, unique indexes on
   assetCode/publicSlug/issueNumber/email).
4. Set up backend/.env.example with placeholders for MONGO_URI, JWT_SECRET,
   CLOUDINARY keys, GEMINI_API_KEY, REDIS_URL.
5. Set up basic Express app.js with helmet, cors, compression, morgan, error handler
   middleware, and a consistent API response format (section 11).
6. Connect to MongoDB (use env var, don't hardcode).

When done, update the Progress Tracker in PROJECT_SPEC.md:
- Current Hour: 1
- Completed: project setup, folder structure, models, base Express config
- Next Prompt for Agent: Prompt 02 — Auth + RBAC
```

---

## Prompt 02 — Auth + RBAC

```
Read PROJECT_SPEC.md section 2 (Roles) and section 5 (API Endpoints — Auth).

Implement:
1. POST /api/auth/register — admin-only route to create technician/admin accounts
   (require existing admin JWT to create new users, except allow one initial admin
   seed via a script).
2. POST /api/auth/login — bcrypt compare, return JWT.
3. GET /api/auth/me — return current user from token.
4. Middleware: auth.js (verify JWT), rbac.js (role-based route guard, e.g.
   requireRole('admin')).
5. Apply RBAC middleware to protect all admin-only and technician-only routes going
   forward — don't rely on frontend hiding buttons.
6. Seed script to create one default admin (email/password from .env) for demo login.

Test with Postman/curl that a technician token cannot hit admin-only routes (403).

Update Progress Tracker in PROJECT_SPEC.md:
- Current Hour: 2 (early)
- Completed: auth + RBAC working, seed admin created
- Next Prompt for Agent: Prompt 03 — Asset Module + QR
```

---

## Prompt 03 — Asset Module + QR Generation

```
Read PROJECT_SPEC.md sections 4 (Asset schema), 5 (Asset APIs), 7 (QR Flow).

Implement:
1. POST /api/assets (admin only) — auto-generate assetCode (AST-0001 style, sequential
   or timestamp-based, must be unique) and a random non-sequential publicSlug.
2. On creation, generate a QR code encoding ONLY the public URL
   (https://<frontend-domain>/public/asset/:slug) using the `qrcode` npm package.
   Store the QR image (upload to Cloudinary, save URL on the asset doc).
3. GET /api/assets — support query params for search (name/code) and filters
   (status, category, location).
4. GET /api/assets/:id, PATCH /api/assets/:id (editing name/location must NOT change
   publicSlug or break the QR).
5. GET /api/assets/:id/qr — returns QR image URL + downloadable link.
6. Frontend: Asset list page (table/cards, search+filter bar), Asset create/edit form,
   Asset detail page showing QR preview, download button, copy-link button,
   "Open Public Page" button.
7. Duplicate assetCode attempts must return a clean 400 error, not a raw Mongo error.

Update Progress Tracker in PROJECT_SPEC.md:
- Current Hour: 2 (end)
- Completed: asset CRUD, QR generation, asset list/detail UI
- Next Prompt for Agent: Prompt 04 — Public Asset Page + Issue Reporting
```

---

## Prompt 04 — Public Asset Page + Issue Reporting

```
Read PROJECT_SPEC.md sections 5 (Public APIs), 6 (Business Rules), section on
"Public Asset Access" requirements: only safe fields exposed, no private data.

Implement:
1. GET /api/public/assets/:slug — no auth. Return ONLY: name, assetCode, category,
   location, condition, status, lastServiceDate, nextServiceDate, and a short safe
   recent-activity summary. Never return internal notes, costs, technician identity,
   or private attachments.
2. Invalid slug → return a clean structured "not found" response (404 with clear
   message), frontend shows a proper not-found page, not a crash.
3. If asset status is Retired, public page must clearly show a "Retired" banner but
   still load.
4. POST /api/public/assets/:slug/issues — public issue submission form: title
   (or raw complaint text), description, reporterName, reporterContact (optional),
   priority (optional, can be AI-assisted later), optional evidence upload (Cloudinary
   via Multer). Auto-generate unique issueNumber (ISS-0001 style). Update asset status
   to "Issue Reported". Write an AssetHistory entry (actor = "Public").
5. Apply rate limiting to both public routes (see section 11) — you can stub the
   limiter now with in-memory store, Redis version comes in Prompt 09.
6. Frontend: mobile-friendly public asset page (this is what gets scanned via QR),
   Report Issue form with validation.

Update Progress Tracker in PROJECT_SPEC.md:
- Current Hour: 3
- Completed: public asset page, public issue reporting, rate limiter stub
- Next Prompt for Agent: Prompt 05 — AI Issue Triage
```

---

## Prompt 05 — AI Issue Triage

```
Read PROJECT_SPEC.md section 8 (AI Issue Triage) very carefully — the JSON schema,
safety rules, and error handling states are non-negotiable requirements from the
hackathon brief.

Implement:
1. Backend service ai.service.js that calls Gemini API with a system prompt requiring
   STRICT JSON output matching the schema in section 8. Include asset context
   (type, condition, location, recent history) and the user's raw complaint text in
   the prompt.
2. Explicitly instruct the model in the prompt: if the complaint involves electrical,
   gas, fire, or structural safety risk, initialChecks must recommend stopping use
   and calling a qualified technician — never give DIY repair steps for hazards.
3. POST /api/issues/:id/ai-triage (or a pre-save version called with raw text before
   the issue is created) — calls the service, validates the JSON response (try/catch
   parse, verify required fields exist), returns structured suggestion. Do NOT auto-save
   to DB — this is a preview step.
4. Timeout handling: if Gemini doesn't respond in ~10s, return a clear error the
   frontend can show, with a "Continue Manually" fallback (user fills fields by hand).
5. Frontend: after user types a raw complaint, show "Analyze with AI" button → loading
   state → editable form pre-filled with AI's title/category/priority/possibleCauses/
   initialChecks → user can edit any field → confirm & submit. Track wasEdited: true/false
   by diffing final values against AI's original suggestion.
6. Never expose GEMINI_API_KEY to frontend — all calls go through backend.

Update Progress Tracker in PROJECT_SPEC.md:
- Current Hour: 4
- Completed: AI triage integrated, structured output, editable UI, safety prompt rules,
  timeout/fallback handling
- Next Prompt for Agent: Prompt 06 — Assignment + Maintenance Workflow
```

---

## Prompt 06 — Assignment + Maintenance Workflow + Evidence

```
Read PROJECT_SPEC.md section 6 (Status State Machines) and section 9
(Maintenance & Evidence) — the transition rules are strict, enforce them server-side.

Implement:
1. PATCH /api/issues/:id/assign (admin only) — assign a technician, issue status →
   Assigned, write AssetHistory entry.
2. PATCH /api/issues/:id/status — validate transitions against the state machine in
   section 6 (e.g. cannot jump Reported → Resolved directly). Technician can only
   update issues assigned to them (check req.user.id against issue.assignedTechnician).
   Closed issues cannot be edited unless first Reopened.
3. POST /api/issues/:id/maintenance-log (technician, only if assigned) — requires
   inspectionNotes, workPerformed, cost (validate >= 0), finalCondition minimum.
   Support evidence upload via Multer → Cloudinary, store URLs.
4. Issue cannot move to "Resolved" status without at least one maintenance log existing
   — enforce this check in the status-update controller.
5. On maintenance completion, update the linked Asset: status → Operational (unless
   flagged critical → Out of Service), lastServiceDate = now, validate
   nextServiceDate is not before completion date.
6. Every status change and maintenance action writes an AssetHistory entry
   (actor, action, relatedIssue, timestamp).
7. Frontend: Issues list (filterable by status/priority/technician/asset), Issue detail
   page with assign dropdown (admin), status update controls (technician, only shows
   valid next states), maintenance log form with evidence upload. Critical priority
   issues must be visually distinct (e.g. red badge/border) in both list and detail views.

Update Progress Tracker in PROJECT_SPEC.md:
- Current Hour: 5
- Completed: assignment flow, status state machine enforced, maintenance logging,
  Cloudinary evidence, asset status sync
- Next Prompt for Agent: Prompt 07 — Asset History + Dashboard
```

---

## Prompt 07 — Asset History + Dashboard + Search/Filters

```
Read PROJECT_SPEC.md sections 4 (AssetHistory schema), 5 (Asset APIs), 10 (Dashboard).

Implement:
1. GET /api/assets/:id/history — return chronological AssetHistory entries for an
   asset (date, actor, action, relatedIssue). No update/delete endpoints exist for
   this collection — it must be append-only, enforce this by simply never building
   edit/delete routes for it.
2. GET /api/dashboard/stats (auth required) — return: total assets, open issues count,
   critical issues count, resolved-this-week count, average resolution time
   (calculate from Issue createdAt → resolvedAt).
3. Frontend: Dashboard page with summary cards (not decorative charts — actual useful
   numbers per section 10), Asset detail page shows a history timeline component,
   global search bar for assets/issues, filter controls wired to the query params
   already built in earlier prompts.
4. Make sure loading and empty states are handled everywhere (no blank screens).

Update Progress Tracker in PROJECT_SPEC.md:
- Current Hour: 6
- Completed: asset history timeline, dashboard stats, search/filters wired end-to-end
- Next Prompt for Agent: Prompt 08 — Frontend Polish + Responsive
```

---

## Prompt 08 — Frontend Polish + Responsive Pass

```
Do a full pass over the frontend built so far:
1. Ensure every page is responsive (mobile-first especially for the public asset page
   and issue reporting form — that's what gets scanned on a phone during the demo).
2. Consistent toast notifications (react-hot-toast) for all success/error actions.
3. Consistent loading skeletons/spinners, no broken states.
4. Role-based navigation — technician shouldn't see admin-only nav items (still backed
   by server-side RBAC from Prompt 02, this is just UX cleanliness).
5. Fix any console errors/warnings.

Update Progress Tracker in PROJECT_SPEC.md:
- Current Hour: 6 (end)
- Completed: frontend polish, responsive pass done
- Next Prompt for Agent: Prompt 09 — Bonus: Rate Limiting + Redis
```

---

## Prompt 09 — Bonus: Rate Limiting + Redis

```
Read PROJECT_SPEC.md section 11 (Security) and section 12 (Bonus Notes #1-2).

Implement:
1. Set up Redis (local docker or a free-tier hosted Redis like Upstash — use env var
   REDIS_URL).
2. Replace the in-memory rate limiter stub from Prompt 04 with `rate-limit-redis` as
   the store.
3. Apply limiters with different thresholds:
   - Public issue-report endpoint: ~10 requests/min per IP
   - Auth endpoints (login/register): ~5 requests/min per IP
   - AI-triage endpoint: ~5 requests/min per IP
4. Confirm rate limiting actually triggers (test by hammering an endpoint) and returns
   a clean 429 response with a friendly message, not a raw error.

This single implementation covers both the Rate Limiting bonus AND the Redis bonus —
Redis here is genuinely used as the rate-limit store, which is a justified use per the
brief (not decorative).

Update Progress Tracker in PROJECT_SPEC.md:
- Current Hour: 7 (early)
- Completed: Redis-backed rate limiting on public/auth/AI routes
- Next Prompt for Agent: Prompt 10 — Bonus: Docker
```

---

## Prompt 10 — Bonus: Docker

```
Read PROJECT_SPEC.md section 12 (Bonus Notes #3).

Implement:
1. Dockerfile for backend/ (Node base image, install deps, expose port, run server).
2. Dockerfile for frontend/ (build step with Vite, serve via nginx or a lightweight
   static server).
3. docker-compose.yml at project root connecting backend, frontend, and Redis
   (Mongo can stay as Atlas via env var, no need to containerize the DB).
4. Confirm `docker-compose up` actually builds and runs both services successfully
   and they can talk to each other.

Update Progress Tracker in PROJECT_SPEC.md:
- Current Hour: 7 (mid)
- Completed: Docker setup working via docker-compose
- Next Prompt for Agent: Prompt 11 — Bonus: Email
```

---

## Prompt 11 — Bonus: Email Notifications

```
Read PROJECT_SPEC.md section 12 (Bonus Notes #4).

Implement:
1. email.service.js using Nodemailer with a free SMTP provider (Gmail app password,
   or Resend/Mailtrap — whichever is fastest to set up with the credentials available).
2. Trigger email on: (a) issue assigned to a technician — notify technician's email,
   (b) issue marked Resolved — notify reporter's email if one was provided during
   public issue submission.
3. Keep templates simple plain-text or minimal HTML — functional, not fancy.
4. Wrap email sending in try/catch so a failed email never blocks the core action
   (assignment/resolution should succeed even if email fails — log the failure).

Update Progress Tracker in PROJECT_SPEC.md:
- Current Hour: 7 (late)
- Completed: email notifications on assignment + resolution
- Next Prompt for Agent: Prompt 12 — Bonus: GitHub Actions CI
```

---

## Prompt 12 — Bonus: GitHub Actions CI

```
Read PROJECT_SPEC.md section 12 (Bonus Notes #5).

Implement:
1. .github/workflows/ci.yml — on push to main: checkout, setup Node, install deps
   for both backend and frontend, run lint (if configured) and run `npm run build`
   for frontend to confirm it compiles.
2. Keep it simple — the goal is a green checkmark on GitHub showing an automated
   pipeline exists and passes, not a full deployment pipeline.

Update Progress Tracker in PROJECT_SPEC.md:
- Current Hour: 7 (end)
- Completed: GitHub Actions CI workflow passing
- Next Prompt for Agent: Prompt 13 — Deployment
```

---

## Prompt 13 — Deployment

```
Read PROJECT_SPEC.md section 12 (Bonus Notes #6) and section 14 (Deployment Checklist).

Step 1 — Safety net first:
1. Deploy backend to Render (or Railway), frontend to Vercel. Confirm the full live
   flow works end-to-end on these URLs (this becomes the guaranteed submission link
   even if AWS attempt below runs long).

Step 2 — AWS bonus attempt (time-boxed, max ~60 minutes):
2. Deploy backend to AWS (EC2 or Elastic Beanstalk — pick whichever you're faster
   with) and frontend to S3+CloudFront, or both on a single EC2 behind Nginx if that's
   quicker.
3. If AWS setup is not fully working within the time budget, stop and keep the
   Render/Vercel links as the official submission — do not risk demo stability for
   the AWS bonus.

Update Progress Tracker in PROJECT_SPEC.md:
- Current Hour: 8 (early)
- Completed: deployed (note which platform ended up being used)
- Next Prompt for Agent: Prompt 14 — README + Final Checklist
```

---

## Prompt 14 — README + API Docs + Final Checklist

```
Read PROJECT_SPEC.md section 14 (Deployment & Submission Checklist).

Generate:
1. README.md covering: project overview, tech stack, architecture summary, setup
   instructions (local run), demo credentials (admin + technician), deployed links,
   feature list, and which bonuses were implemented and how.
2. Export a Postman collection or write a concise API_DOCS.md listing all endpoints
   from PROJECT_SPEC.md section 5, with example request/response bodies.
3. Do a final live run-through of the full flow: register asset → scan/open QR →
   report issue → AI triage → assign → maintenance → resolve → history updates →
   dashboard reflects it. Fix anything broken.
4. Confirm git history has incremental meaningful commits, not one giant commit.

Update Progress Tracker in PROJECT_SPEC.md:
- Current Hour: 8 (end)
- Completed: README, API docs, final flow verified, submission-ready
- Next Prompt for Agent: DONE — ready for submission
```