# PlacementHub Web Application (`apps/web`)

> **The Frontend & Full-Stack Core of PlacementHub**  
> Built with **Next.js 14 (App Router)**, **React 18**, **Tailwind CSS**, **Prisma ORM**, **NextAuth.js**, and **Neon PostgreSQL**.

---

## 🌟 Overview

The `apps/web` package powers the core web interface and primary API routes for **PlacementHub**. It connects all campus stakeholders into a unified, high-craft platform:
- **One Institutional Login**
- **One Verified Digital Identity (Talent Passport™)**
- **Intelligent Career & Placement Workflows**
- **Unified Administrative & Telemetry Dashboards**

---

## 👥 The 7 Stakeholder Roles & Portals

1. **👨‍🎓 Student Workspace (`/student`)**
   - **Talent Passport™ (`/talent/[slug]`)**: Verified public profile featuring academic credentials, live project demos, and ATS-ready resumes.
   - **Resume Studio & ATS Optimizer**: Real-time ATS scoring (0–100), missing keyword detection, and action-verb improvements.
   - **Campus & Off-Campus Drives**: Automated eligibility checking against CGPA, backlogs, and department criteria with 1-click apply.
   - **Hiring Pipeline**: Real-time status tracking from application through to offer letter issuance.
   - **AI Mock Interview Coach**: STAR-method feedback, rubric scoring, and customized career roadmaps.
   - **Engineering Coding Arena**: In-browser DSA practice with automated test case execution and runtime profiling.
   - **Alumni Mentorship**: Book 1:1 sessions with verified alumni mentors working at top companies.

2. **🏫 TPO / Placement Cell Console (`/tpo`)**
   - **Placement Drive Management**: Create and manage on-campus, off-campus, and pooled drives.
   - **Automated Eligibility Engine**: Instant cohort filtering by CGPA cutoff and backlog limits without manual spreadsheets.
   - **Accreditation & NIRF Engine**: One-click generation of NAAC (Criterion 5.2.1), NBA, and NIRF-ready placement reports.
   - **Hiring Stage Progression**: Advance students from Screening to Online Assessment, Interviews, and Offers.
   - **Broadcast Alerts**: Send instant notifications and alerts to eligible students.

3. **🏢 Recruiter Hiring Suite (`/recruiter`)**
   - **Cross-College Candidate Discovery**: Filter talent by skills, CGPA, graduation batch, and coding assessment scores.
   - **Kanban ATS Pipeline**: Visual drag-and-drop / stage advancement across Applied, Shortlisted, Interview, and Offered.
   - **Interview Scheduler**: Book rounds with Google Meet integration and structured scorecard rubrics.
   - **Offer Management**: Issue formal offer letters and track student acceptances.

4. **👨‍🏫 Faculty Mentor Hub (`/faculty`)**
   - **Department Cohort Monitor**: Track student career readiness and identify at-risk / unplaced students.
   - **Resource Repository**: Upload and distribute placement handbooks, interview kits, and core CS notes.
   - **Academic Advisories**: Issue department-level career guidance notices.

5. **👨‍💼 Alumni Career Network (`/alumni`)**
   - **1:1 Mentorship Hub**: Create available video slots for mock interviews and resume reviews.
   - **Internal Referral Portal**: Post verified company job openings and internal employee referrals for juniors.
   - **Interview Archive**: Share real interview experiences, questions, and preparation tips.

6. **🏛️ Institute Admin Center (`/institute`)**
   - **College Governance**: Manage campus profile, NAAC/NIRF standings, and departmental intake.
   - **Placement Policy Rules**: Configure Dream Company rules (e.g. Dream offer threshold ≥ ₹12.0 LPA).
   - **Stakeholder Directory**: Manage accounts for students, faculty, TPOs, and recruiters.

7. **⚙️ Super Admin Operations (`/super-admin`)**
   - **Multi-Tenant SaaS Overview**: Manage onboarded colleges, tenant slugs, and subscription tiers.
   - **Global Off-Campus Sourcing Engine**: Broadcast validated job feeds.
   - **SaaS Economics**: Monitor subscription revenue and institutional usage.
   - **System Telemetry**: Real-time health monitoring of Neon PostgreSQL, Cloudflare R2, and AI requests.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: `v18.0.0` or higher
- **PostgreSQL**: Neon Serverless PostgreSQL instance

### 2. Environment Setup
```bash
cp .env.example .env
```
Ensure `DATABASE_URL`, `NEXTAUTH_SECRET`, and `GEMINI_API_KEY` are configured in `.env`. Refer to [`docs/env.md`](../../docs/env.md).

### 3. Database Migration & Seed
```bash
# Push schema to database
npx prisma db push

# Seed rich demo data
npm run db:seed
```

### 4. Run Development Server
```bash
npm run dev
```

Navigate to [http://localhost:3000](http://localhost:3000) (or `http://localhost:3001`).

---

## 🎨 Design System & Aesthetic

- **Headings Font**: `Sora` (via `next/font/google`)
- **Body Font**: `Manrope` / `Inter`
- **Color Palette**: Deep Midnight Navy (`#070B14`, `#0D1424`), Electric Cyan (`#0099cc`, `#00c2ff`), Emerald Green (`#10b981`), and Sapphire accents.
- **Craft**: High-density dashboards, polished status badges, subtle glassmorphism, responsive mobile layouts, and dark mode support.

---

## 👨‍💻 Developer & Contact

**Vyankatesh Bairagi**
- 📱 **Mobile**: [+91 9075097235](tel:+919075097235)
- 📧 **Email**: [vyankateshbairagi.dev@gmail.com](mailto:vyankateshbairagi.dev@gmail.com)
- 🐙 **GitHub**: [@vyankateshbairagi](https://github.com/vyankateshbairagi)
