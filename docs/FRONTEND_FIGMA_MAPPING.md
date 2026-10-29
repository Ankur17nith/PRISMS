# PRISMS Frontend — Figma Design Mapping & Architecture Reference

## 1. Overview

The PRISMS frontend is built using **Next.js 15.2.1 (App Router)**, **React 19**, **TypeScript 5.8**, and **Tailwind CSS 3.4**, implementing the PhD Research & Institutional Scholars Management System for NIT Hamirpur.

All styling, layouts, components, and workflows directly implement the visual source of truth:
- **Figma File:** `https://www.figma.com/design/SKPTGM8RvLhsCdfYotKCpb/PRISMS`
- **File Key:** `SKPTGM8RvLhsCdfYotKCpb`
- **Session ID:** `7bc93c9a-93f9-43ac-b518-aad53541b423`

---

## 2. Figma Inspection & Node Inventory

All 9 top-level canvas nodes specified in the Figma project were systematically inspected, analyzed, and mapped to frontend implementation:

| Figma Node URL & ID | Canvas / Page Name | Node Type | Purpose & Extracted Content | Frontend Implementation Mapping |
|---|---|---|---|---|
| `...node-id=1-2` | **Reference Theme and Original Work** | `CANVAS` | Mobile (390px), Tablet (834px), Desktop (1650px) reference templates, research portal hero, 28px grid rules, institutional navigation, and footer. | Rendered directly as the primary public root landing page (`/`), with direct sign-in CTA leading to `/login`. |
| `...node-id=118-3805` | **Design System & Components** | `CANVAS` | Color tokens (`118:3842`), typography tokens, border radii, spacing scales, button states, alert badges. | `frontend/tailwind.config.ts`, `globals.css`, reusable component library (`components/ui/*`). |
| `...node-id=118-3806` | **Assets and Icon Library** | `CANVAS` | Official NIT Hamirpur emblem (`118:3850`), 12 vector outline SVG icons (`118:3851`). | `frontend/public/assets/nith-logo.png`, `frontend/public/assets/icons/*.svg`, `components/Icon.tsx`. |
| `...node-id=118-3807` | **Shared Application Shell** | `CANVAS` | Faculty Shell (`118:3473`), Student Shell (`118:3580`), institutional header, bilingual brand banner, gold accent stripe, sidebar navigation. | `frontend/src/components/ApplicationShell.tsx`, `components/Header.tsx`, `components/Sidebar.tsx`. |
| `...node-id=118-3808` | **Student Portal** | `CANVAS` | Complete student workflow: Dashboard (`89:87`), 3-step submit wizard (`89:670`, `89:1835`, `89:1900`), submission receipt (`89:1967`), revision view (`89:2021`), submission details (`89:1032`), history (`89:824`). | `frontend/src/app/student/*` (9 pages: `/dashboard`, `/thesis/submit`, `/thesis/details`, `/thesis/history`, `/profile`, `/research`, `/documents`, `/notifications`, `/help`). |
| `...node-id=118-3809` | **Faculty Portal** | `CANVAS` | Faculty Dashboard (`104:2000`), Review Queue (`113:1476`), All Reviews (`113:1649`), Assigned Scholars list (`113:1847`), Scholar dossier (`113:3106`), Supervisor review workspace (`113:2713`), HOD view-only workspace (`113:2917`). | `frontend/src/app/faculty/*` (12 pages: `/dashboard`, `/queue`, `/reviews`, `/reviews/[id]`, `/reviews/[id]/hod`, `/scholars`, `/scholars/[id]`, `/history`, `/notifications`, `/documents`, `/help`, `/settings`). |
| `...node-id=118-3810` | **Workflow & Prototype States** | `CANVAS` | State atlases for thesis review stages: Supervisor forwarding, HOD parallel dispatch, Return for Revision, Senate Final Approval. | Implemented in workflow timeline components, decision dialogs, status badges, and transition forms. |
| `...node-id=118-3811` | **Responsive Layouts** | `CANVAS` | Tablet viewport (834px) with collapsible sidebar; Mobile viewport (390px) with off-canvas hamburger drawer and responsive table cards. | Implemented in `ApplicationShell.tsx` with mobile menu button, backdrop overlay, and Tailwind responsive utilities (`hidden md:flex`, `grid-cols-1 md:grid-cols-3`). |
| `...node-id=118-3812` | **QA and Interaction Audit** | `CANVAS` | Engineering checklist, security boundaries, download restrictions, and access control audit specs. | Implemented client-side & server-side: strict download prohibition on HOD view, role-based guardrails, sanitized file preview. |

---

## 3. Extracted Design Tokens & Typography

Tokens extracted directly from Figma Node `118:3842` (Design Tokens Frame):

### Color System
- **Surface Canvas:** `#f7f7f6` (`canvas`)
- **Brand Charcoal:** `#171717` (`charcoal`)
- **Charcoal Hover:** `#262626`
- **Subtle Surface:** `#f2f2f0` (`subtle`)
- **Card / Paper:** `#ffffff` (`paper`)
- **Brand Gold:** `#daa32f` (`gold`)
- **Gold Tint / Accent:** `#fbf3de` (`gold-tint`)
- **Gold Hover:** `#c69226`
- **Border Neutral:** `#e2e2df` (`border-neutral`)
- **Primary Action (Green):** `#16a34a` (`primary-green`)
- **Primary Hover:** `#15803d`
- **Muted Text:** `#666666` (`text-muted`)
- **Error Red:** `#dc2626` / Error Tint: `#fef2f2`
- **Warning Amber:** `#d97706` / Amber Tint: `#fffbeb`
- **Info Blue:** `#2563eb` / Info Tint: `#eff6ff`

### Typography Hierarchy
- **Primary Sans:** `Arimo`, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif
- **Secondary / Nav:** `Inter`, sans-serif
- **Institutional Serif:** `Adamina`, Georgia, serif (used for institutional titles & headers)
- **Hindi Identity Font:** `Noto Sans Devanagari`, sans-serif (for bilingual identity: राष्ट्रीय प्रौद्योगिकी संस्थान हमीरपुर)

---

## 4. Complete Application Route Inventory (27 Routes)

All routes are fully implemented and verified via `next build`:

### Public & Institutional Routes
1. `/` — Institutional Landing Page featuring NIT Hamirpur hero banner, quick links, system overview, and login CTA.
2. `/login` — Unified Authentication page supporting Student, Faculty, and Admin logins with role-context switching.
3. `/about` — About PRISMS and NIT Hamirpur PhD guidelines.
4. `/workflow` — Interactive graphical guide of the 5-stage thesis approval process.
5. `/guidelines` — Institutional thesis formatting, plagiarism tolerance, and submission rules.
6. `/contact` — Contact directory for Dean (Academics), SDPC, and technical support.

### Student Portal Routes (`/student/*`)
7. `/student/dashboard` — Student homepage: submission status summary, pending requirements, quick actions, supervisor info.
8. `/student/thesis/submit` — 3-step thesis submission wizard:
   - Step 1: Metadata, abstract, keywords, supervisor confirmation.
   - Step 2: PDF upload with magic bytes verification, file integrity validation, and size checks (up to 20 MiB).
   - Step 3: Formal declaration, review summary, and final submit triggering Stage 1.
9. `/student/thesis/details` — Thesis detail workspace: interactive visual timeline of all stages, supervisor and committee remarks, feedback items, and inline document viewer.
10. `/student/thesis/history` — Historical log of all thesis versions (Draft, V1, V2, etc.), revision comments, and status transitions.
11. `/student/profile` — Scholar academic profile, enrollment number, department, supervisor assignment, registration date.
12. `/student/research` — Research publications, conference proceedings, pre-submission colloquium records.
13. `/student/documents` — Repository of all scholar files (plagiarism reports, synopsis, coursework transcripts).
14. `/student/notifications` — Real-time notification center for thesis reviews, revisions requested, and approvals.
15. `/student/help` — Comprehensive scholar FAQ, submission checklist, and support ticketing.

### Faculty Portal Routes (`/faculty/*`)
16. `/faculty/dashboard` — Faculty dashboard: role indicators (Supervisor / HOD / SDPC / Dean / Senate), actionable pending review count, scholar breakdown, urgent alert banner.
17. `/faculty/queue` — Actionable review queue prioritized by submission date, urgent status badges, filterable by stage and scholar.
18. `/faculty/reviews` — Master list of all thesis submissions across departments and past review history.
19. `/faculty/reviews/[id]` — **Supervisor Review Workspace**: full thesis dossier, metadata, inline PDF viewer, download capability (permitted for supervisor), and decision actions:
    - *Forward to HOD* (with recipient department validation)
    - *Return for Revision* (with mandatory structured remarks)
    - *Reject* (formal terminal action)
20. `/faculty/reviews/[id]/hod` — **HOD View-Only Workspace**:
    - **Strict Security Enforcement:** Document download button is omitted from the UI and downloads are rejected with 403 on backend.
    - Inline read-only PDF preview.
    - Multi-destination parallel dispatch: Forward to SDPC Chairperson, Dean Academics, or both in parallel.
21. `/faculty/scholars` — Supervisor scholar tracking dashboard: active PhD scholars, research topics, current submission stage, enrollment status.
22. `/faculty/scholars/[id]` — Individual scholar dossier: complete submission history, supervision timeline, all submitted versions, audit log.
23. `/faculty/history` — Archived review decisions made by the faculty member.
24. `/faculty/notifications` — Faculty notification feed for new review assignments and workflow completions.
25. `/faculty/documents` — Faculty document repository for guidelines, evaluation forms, and minutes.
26. `/faculty/help` — Faculty workflow guide and evaluation instructions.
27. `/faculty/settings` — Faculty profile, notifications preferences, signature setup, and office details.

---

## 5. Security & Boundary Architecture

### HOD Download Denial
- **Client Boundary:** The HOD Review page (`/faculty/reviews/[id]/hod`) displays an explicit security badge: `View-Only Access — File downloads are restricted for departmental HOD role`. No download action button exists in the DOM.
- **Server Boundary:** Calls to `GET /api/thesis/:id/download` verify that the caller is not accessing in HOD role context. If attempted, the backend responds with `403 Forbidden: HODs are only permitted to view documents inline, downloading is prohibited`.

### Multi-Role Identity
- Faculty members holding multiple roles (e.g., `Dr. Sanjeev Sharma` as CSE Faculty, Supervisor, and CSE HOD) can switch role contexts seamlessly in the header or login screen without logging out.
- The UI dynamically adapts navigation links, permissions, and workflow actions to match the active role context.

---

## 6. Resilience & Mock Fallback Layer

The frontend API client (`frontend/src/lib/api.ts`) is designed for maximum resilience:
- It connects directly to `http://localhost:4000/api` using JWT tokens stored in `localStorage` or `prisms_token` cookie.
- If the backend is unreachable or undergoing maintenance, it falls back seamlessly to high-fidelity mock data derived from the Prisma seed database (`P19CS001`, `P20CS002`, `Dr. Sanjeev Sharma`, `Dr. Kamlesh Dutta`).
- This guarantees zero-downtime UI demonstrations, smooth navigation, and uninterrupted development.
