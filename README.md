# Candidate Hiring Pipeline System

Full-stack hiring app with JWT auth and role-based access for **recruiters** and **interviewers**.

- **Backend:** Node.js, Express, MongoDB + Mongoose, Zod, JWT, bcrypt, Multer, Swagger UI
- **Frontend:** React 18 (Vite), Tailwind CSS, Zustand, React Router
- **DevOps:** Docker + docker-compose, GitHub Actions CI, automated tests, Postman collection

## Quick start

### Docker (recommended)

```bash
cp .env.example .env        # then edit it: set JWT_SECRET (openssl rand -hex 32) and your own RECRUITER_INVITE_CODE
docker compose up --build
docker compose exec backend npm run seed -- --demo     # optional demo data (public demo passwords!)
```

| What | URL |
| --- | --- |
| App | http://localhost:8080 |
| API | http://localhost:5000/api |
| Swagger docs | http://localhost:5000/api/docs |

### Local development (Node 18+ and MongoDB)

```bash
cd backend  && npm install && npm run seed && npm run dev    # http://localhost:5000
cd frontend && npm install && npm run dev                    # http://localhost:5173
```

### Demo accounts (after seeding, password `Password123`)

| Role | Email |
| --- | --- |
| Recruiter | recruiter@demo.com, recruiter2@demo.com |
| Interviewer | interviewer@demo.com, interviewer2@demo.com |

Recruiters sign up with the invite code from your `.env` (`RECRUITER_INVITE_CODE`). In local development (`backend/.env`) it defaults to `JOIN-RECRUITERS`.

### Real email verification

New signups **must prove they control the email mailbox before they can log in**. HireFlow sends a 6-digit verification code through SMTP and stores only a hash of the code. A random/fake address cannot complete signup because it cannot receive the code.

Configure these backend variables before allowing public signup:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-Google-App-Password
MAIL_FROM=HireFlow <your-email@gmail.com>
EMAIL_VERIFICATION_EXPIRES_MINUTES=15
```

For Gmail, use a Google **App Password** rather than your normal Gmail password. For Render/public deployment, add the same values as backend environment variables. Demo seed accounts are marked verified so they continue to work without an email round-trip.

## How accounts work

1. **First visit: Sign up.** Registration creates an unverified account and sends a real 6-digit verification code.
2. Enter the code on **Verify email**. Only then is login allowed.
3. From then on you just **log in**. You can resend a code if it expires.

- Already-registered emails cannot sign up again ("This email is already registered. Please log in instead.").
- Logging in with an unregistered email says "No account found... Please sign up first" with a link to signup. A wrong password says "Incorrect password."
- Both password fields show/hide, signup has a confirm field and a live strength meter.
- **Recruiter signups need the invite code**, interviewers sign up freely.
- **Forgot password:** sends a 30-minute single-use reset link (hashed token in the DB). Password reset uses real SMTP email. When `SHOW_RESET_LINK=true` the link is additionally shown on screen for private demos; keep it **off** on public deployments.

## Pipeline rules

`Applied > Screening > Technical Interview > HR Interview > Offered > Hired`

- Candidates move **one step at a time**. Skipping a stage or moving backwards is rejected by the server (422) and not offered in the UI.
- **Rejected** is allowed from any active stage and needs a reason (skills gap, salary mismatch, culture fit, withdrew, position filled, other) plus an optional note.
- **Hired and Rejected are final** and locked.
- Interviews and feedback are **not required** to advance. Feedback is always optional.
- The stage can only be changed through `PATCH /candidates/:id/stage`. Editing a candidate cannot change it.

## Features

| Area | What's included |
| --- | --- |
| Candidates | CRUD, search, filters, sort (incl. rating), pagination, notes, stage history with days spent per stage, **CSV export**, **resume upload** (PDF/DOC/DOCX, 5 MB) with authenticated download |
| Pipeline board | Drag and drop between valid columns only (valid targets highlight), stage menu on each card for touch screens, optimistic update with rollback |
| Interviews | Scheduling with double-booking protection, list and **month calendar** views, **Add to calendar (.ics)**, cancel / reschedule |
| Feedback | Optional. One per interview. Rating 1-5 plus hire recommendation. Feeds a **candidate score** (average rating, hire / no-hire votes) visible to recruiters |
| Dashboard | Animated counters, hiring funnel with step conversion, outcome donut, interviews-this-week strip, **average days per stage**, **candidates waiting over 7 days**, **rejection reasons**, recruiter activity summary |
| Productivity | **Ctrl/Cmd + K** quick search for candidates, dark mode, responsive layout |
| Visual polish | Animated page entrances, avatar initials, loading skeletons, illustrated empty states, a pipeline progress stepper on every candidate, confetti when someone is hired, first-run onboarding checklist, dark mode, friendly 404 page and crash screen |
| Platform | Mock email service + outbox, activity log, Zod validation with inline field errors, rate limiting, central error handling |

## Role permissions

| Capability | Recruiter | Interviewer |
| --- | :-: | :-: |
| View candidates | all | only those assigned (have an interview with them) |
| Candidate scores and rejection reasons | yes | no (stripped by the API) |
| Add / edit / delete candidates, change stage, upload resume, export CSV | yes | no |
| Add notes | yes | yes (assigned candidates) |
| Schedule / edit / cancel / delete interviews | yes | no |
| Submit / edit feedback | no | yes (own interviews only) |
| Activity log, email outbox, pipeline board | yes | no |

Permissions are enforced **on the server**; the UI only hides what a role cannot use.

## Email authenticity checks

Before HireFlow sends a verification code during signup, the backend performs these checks:

1. Valid email syntax.
2. Blocks a built-in list of common disposable/temporary mailbox domains.
3. In production, checks the domain DNS for MX records (with an A/AAAA fallback).
4. If the domain cannot be resolved/reached, signup is rejected.
5. A real verification code is still required before the account can log in.

These checks can reject obviously fake or disposable addresses, but DNS cannot prove that a particular mailbox exists or that the user owns it. Mailbox verification remains the final ownership check.

## Security and public sharing

Read this before giving anyone a link (ngrok, a cloud host, a shared network).

- **The app refuses to start in production** with a weak `JWT_SECRET` (needs 32+ random characters) or the documented default invite code, and `docker compose` refuses to run until your `.env` sets them. A known secret would let anyone forge a login.
- **Keep `SHOW_RESET_LINK=false`** on anything reachable from the internet. When true, the forgot-password page reveals the reset link to whoever types an email.
- **Demo data uses public passwords.** In production `npm run seed` refuses to run without `--demo`. Do not seed a database that strangers can reach, or change those passwords first.
- **Choose a private recruiter invite code.** It is the only thing stopping strangers from creating recruiter accounts.
- Logs expire automatically: the email outbox and activity log keep 90 days. Resumes live on disk in a Docker volume.
- Use HTTPS in front of the app (ngrok, Cloudflare and most hosts provide it) because logins carry a JWT.

## Testing

```bash
cd backend
npm run test:unit    # pipeline rules + CSV safety, no database needed
npm test             # unit + integration (in-memory MongoDB, downloads a binary on first run)
```

Integration tests cover signup/login flows, invite code, password reset, role permissions, assignment scoping, the stage rules, optional feedback and the score, and CSV access. GitHub Actions (`.github/workflows/ci.yml`) runs the backend tests and a frontend build on every push.

## API docs

- Swagger UI: `/api/docs` (use **Authorize** with the token from `/auth/login`). Raw spec: `/api/docs.json`.
- **Postman:** import `docs/postman_collection.json`. Run **POST /auth/login** first: its test script stores the JWT. Regenerate with `npm run postman` in `backend/`.

List endpoints return `{ data, meta: { total, page, limit, pages } }`. Errors return `{ message, errors?: [{ field, message }] }`.

## Project structure

```
backend/src      config, models, validators, middleware, controllers, routes, services, seed.js
backend/test     unit/ and integration/
backend/scripts  postman.js
frontend/src     pages, components, store (Zustand), lib
docs/            postman_collection.json
.github/         CI workflow
```

## Design notes and trade-offs

- **"Assigned candidate"** = has an interview with that interviewer. Scheduling grants access.
- **Scores** are denormalised onto the candidate (recomputed whenever feedback changes) so lists can be sorted by rating cheaply.
- **Stage analytics** are computed from each candidate's stage history in application code. Fine for thousands of candidates; move to an aggregation pipeline beyond that.
- **Error messages reveal whether an email is registered** (needed for the clear signup/login flow). Rate limiting reduces abuse; use generic messages if that matters to you.
- **JWT in localStorage** for simplicity. Use an httpOnly cookie for stricter security.
- **Resumes are stored on local disk** (a Docker volume). Use S3 or similar for multiple servers.
- **Mock email** sits behind one `sendMail()` function. Swap in Nodemailer/SES/SendGrid. Reset links are never written to the outbox.

## Deployment

See **Security and public sharing** above. To share a local copy temporarily, tunnel port 8080 (for example `ngrok http 8080`).

## Verification status

- Checked: every backend and frontend file parses, the TypeScript compiler finds no undefined names or broken relative imports, all relative imports and named exports resolve, the OpenAPI spec loads, the Postman collection generates, and the 11 unit tests pass.
- **Not yet run** (no network or MongoDB in the build environment): `npm install`, the frontend build, the integration tests, and live use of the UI. Run `npm test` and click through once. If something misbehaves, the console output will name the file.


## Login hardening (latest changes)

- Verification codes are checked as exactly 6 digits, locked after 5 wrong attempts, and limited to one email per 60 seconds per account.
- Login returns the same "Invalid email or password" for unknown emails and wrong passwords.
- Signing up over an unverified account replaces its password, so nobody can pre-register someone else's email.
- Sessions issued before a password change are rejected; tokens last 1 day by default (`JWT_EXPIRES_IN`).
- Production refuses to start with `SHOW_RESET_LINK=true`.
- Demo-account buttons show only in development (or with `VITE_SHOW_DEMO=true`).
