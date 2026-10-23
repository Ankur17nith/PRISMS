# PRISMS

Thesis submission and approval portal for NITH. A student uploads a thesis, it moves through a chain of reviewers, and only the chairman can download it.

## The workflow

1. **Student** uploads the thesis.
2. It goes automatically to the student's **supervisor** (faculty).
3. The supervisor approves, which forwards it to the **HOD**, the **DDPC convener**, or both.
4. The HOD or DDPC approves, which forwards it to the **Chairman**.
5. The **Chairman** is the only role that can download the file. Everyone else in the chain can view it but not download it.

In this system, `APPROVE` means "forward to the next stage". A `REJECT` sends it back.

## Tech stack

- Node.js, Express 5, TypeScript (run with `tsx`)
- PostgreSQL with Prisma 6
- Auth: argon2 password hashing, JWT access tokens, rotating refresh tokens in httpOnly cookies
- zod (validation), helmet, cors, express-rate-limit, nodemailer

## Repository layout

```
PRISMS/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # database schema
│   │   ├── migrations/
│   │   └── seed.ts            # dev seed (CSE department + sample accounts)
│   ├── src/
│   │   ├── app.ts
│   │   ├── server.ts
│   │   ├── config/env.ts      # validated environment variables
│   │   ├── lib/               # prisma, audit, errors, mailer
│   │   ├── middleware/        # auth (requireAuth, requireRole), validate, errorHandler
│   │   ├── modules/auth/      # routes, service, schemas, tokens
│   │   └── generated/prisma/  # generated client (gitignored)
│   └── prisma.config.ts
├── frontend/
├── docs/
└── compose.yaml               # optional Postgres via Docker
```

## Getting started

### 1. Prerequisites

- Node.js 20 or newer
- PostgreSQL (local install, or Docker using `compose.yaml`)

### 2. Database

**Option A: local Postgres (Fedora)**

```bash
sudo dnf install postgresql-server postgresql-contrib
sudo postgresql-setup --initdb
sudo systemctl enable --now postgresql
sudo -u postgres psql
```

```sql
CREATE USER prisms_app WITH PASSWORD 'choose_a_dev_password';
CREATE DATABASE prisms OWNER prisms_app;
ALTER USER prisms_app CREATEDB;
```

`CREATEDB` is needed because `prisma migrate dev` uses a temporary shadow database.

In `/var/lib/pgsql/data/pg_hba.conf`, change `ident` to `scram-sha-256` on the `127.0.0.1/32` and `::1/128` lines, then `sudo systemctl restart postgresql`.

**Option B: Docker**

```bash
export POSTGRES_PASSWORD=choose_a_dev_password
docker compose up -d
```

This uses port **5433**, so use `localhost:5433` in the connection string below.

### 3. Environment

Create `backend/.env`:

```
DATABASE_URL="postgresql://prisms_app:choose_a_dev_password@localhost:5432/prisms"
FRONTEND_URL="http://localhost:3000"

# Generate: node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
JWT_ACCESS_SECRET=
ACCESS_TOKEN_TTL_MINUTES=15
REFRESH_TOKEN_TTL_DAYS=7

# Leave empty while testing with sample emails. Later: nith.ac.in
ALLOWED_EMAIL_DOMAIN=

# Leave SMTP_HOST empty to print emails to the server console.
# For a test inbox (e.g. Mailtrap sandbox) fill these in:
SMTP_HOST=
SMTP_PORT=2525
SMTP_USER=
SMTP_PASS=
MAIL_FROM="PRISMS <no-reply@prisms.local>"

# Optional: password for seeded dev accounts (default: ChangeMe-Dev-123)
# SEED_PASSWORD=
```

`JWT_ACCESS_SECRET` is required and must be at least 32 characters. `.env` must never be committed.

### 4. Install, migrate, seed, run

Run everything from `backend/`:

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run seed
npm run dev
```

The API listens on `http://localhost:4000`.

Useful extras:

```bash
npx prisma format
npx prisma validate
npx prisma studio       # browse the database
npx tsc --noEmit        # type-check (tsx does not type-check)
```

> Run `npx prisma ...` from `backend/`, not from the repo root. Otherwise `npx` may download a different Prisma version than the project uses.

## Sample accounts (development only)

`npm run seed` creates the CSE department, six roles, three workflow stages and these accounts. It refuses to run when `NODE_ENV=production`, and it is safe to re-run.

All use the password `ChangeMe-Dev-123` (or `SEED_PASSWORD`).

| Email | Role | Notes |
|---|---|---|
| `student1@example.test` | STUDENT | supervised by `supervisor1` |
| `student2@example.test` | STUDENT | supervised by `supervisor2` |
| `supervisor1@example.test` | SUPERVISOR (CSE) | |
| `supervisor2@example.test` | SUPERVISOR (CSE) | |
| `hod.cse@example.test` | HOD (CSE) | |
| `ddpc.cse@example.test` | DDPC (CSE) | |
| `chairman@example.test` | CHAIRMAN | institute-wide |
| `admin@example.test` | ADMIN | institute-wide |

Workflow stages, in order: **Supervisor review**, **HOD / DDPC review** (either one, or both), **Chairman review**.

## Authentication

Base path: `/auth`

| Method | Route | Purpose |
|---|---|---|
| POST | `/auth/signup` | Create a pending account and send a verification email |
| POST | `/auth/verify-email` | Verify the email, activate the account |
| POST | `/auth/resend-verification` | Send a new verification link |
| POST | `/auth/login` | Log in, sets the `access_token` and `refresh_token` cookies |
| POST | `/auth/refresh` | Rotate the refresh token, issue a new access token |
| POST | `/auth/logout` | Revoke the current session |
| POST | `/auth/logout-all` | Revoke all of the user's sessions (requires login) |
| POST | `/auth/forgot-password` | Send a password reset link |
| POST | `/auth/reset-password` | Set a new password, revokes all sessions |
| GET | `/auth/me` | Current user, profile and active roles (requires login) |

### Try it

With no SMTP configured, emails are printed in the server terminal (look for `[mail:console]` and the `Token:` line).

```bash
# sign up, then copy the token from the server console
curl -i -X POST localhost:4000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"me@example.test","password":"a-long-test-password","fullName":"Me"}'

curl -i -X POST localhost:4000/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token":"PASTE_TOKEN"}'

# log in (seeded accounts need no signup), saving cookies
curl -i -c cookies.txt -X POST localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student1@example.test","password":"ChangeMe-Dev-123"}'

curl -b cookies.txt localhost:4000/auth/me
curl -i -b cookies.txt -c cookies.txt -X POST localhost:4000/auth/refresh
curl -i -b cookies.txt -X POST localhost:4000/auth/logout
```

Do not commit `cookies.txt`.

### Security design

- **Passwords:** hashed with argon2id, minimum 10 characters.
- **Access token:** short-lived JWT (15 minutes) in an `httpOnly`, `SameSite=Strict` cookie. `Authorization: Bearer` is also accepted for API testing.
- **Refresh token:** random opaque value, stored only as a SHA-256 hash in the `sessions` table. It rotates on every use. If an old token is replayed, the whole session family is revoked.
- **Lockout:** 5 failed logins lock the account for 15 minutes.
- **Anti-enumeration:** signup, forgot-password and resend-verification always return the same response, and unknown emails cost the same time as wrong passwords.
- **Rate limiting** on every sensitive route.
- **Email verification and password reset** use single-use hashed tokens with expiry.
- **Password reset** revokes all sessions and invalidates earlier access tokens.
- **Audit log:** logins, failures, resets and permission denials are written to `audit_events`.

## Authorization

Authentication proves who someone is. What they may do comes from the database:

| Question | Where the answer lives |
|---|---|
| Is this a student? | A `Student` row exists for the user |
| Is this faculty? | A `Faculty` row exists for the user |
| Who supervises a student? | An active `StudentSupervisorAssignment` (no end date) |
| Is this user an HOD, DDPC, chairman or admin? | An active `UserRole` row (`validFrom` / `validUntil`) |

Middleware in `src/middleware/auth.ts`:

```ts
router.get("/something", requireAuth, requireRole("CHAIRMAN"), handler);
```

Role codes are uppercase: `STUDENT`, `SUPERVISOR`, `HOD`, `DDPC`, `CHAIRMAN`, `ADMIN`.

Permissions are enforced on the backend on every request, never in the frontend.

## Database overview

Main groups of tables (see `backend/prisma/schema.prisma`):

- **People and org:** `users`, `departments`, `students`, `faculty`
- **Roles:** `roles`, `user_roles`
- **Supervision:** `student_supervisor_assignments` (with history)
- **Thesis:** `theses`, `thesis_submissions` (versioned), `thesis_files` (metadata, checksum, scan status)
- **Workflow:** `workflow_stage_definitions`, `workflow_stage_roles`, `submission_stages`, `review_assignments`, `reviews`, `review_comments`
- **Auth:** `sessions`, `user_tokens`
- **Audit:** `audit_events`

## Project status

**Done**
- Database schema and migrations
- Full authentication flow (signup, verification, login, refresh rotation, logout, password reset, lockout)
- Role-based middleware
- Dev seed data for the CSE department

**Next**
- Thesis routes: upload, forward (approve), reject and resubmit, view, chairman-only download
- File storage in private storage with checksum and scan status
- Claim-only account activation using the institute's email lists (instead of open signup)
- Import script for students, faculty and supervisor assignments
- Tests for the permission rules

## Known limitations and to-dos

- Signup is currently open. Before real use, set `ALLOWED_EMAIL_DOMAIN` or switch to claim-only accounts, and let admins grant HOD / DDPC / chairman roles only.
- Partial unique indexes still need a raw-SQL migration: one active supervisor per student, one primary file per submission. A `CHECK` should tie department roles to a department.
- Two refresh calls at the same moment look like token reuse and log the user out, so a frontend should serialize refreshes.
- After `logout-all`, an already-issued access token stays valid until it expires (up to 15 minutes), except after a password reset.
- No authenticated change-password endpoint and no MFA yet.
- Seeded accounts have a known password and must never exist in production.

## Notes for contributors

- Use `.js` extensions in relative imports (`from "./lib/prisma.js"`), matching the existing code.
- `src/generated/` is created by `npx prisma generate` and is not committed.
- Never commit `.env` or `cookies.txt`.
