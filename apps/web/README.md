# PlacementHub - The Operating System for Campus Careers

> Connecting colleges, students, recruiters & alumni in one unified, intelligent career operating system.  
> Powered by **TACIE** (ThinkBuild AI Career Intelligence Engine), **Neon PostgreSQL**, and **Cloudflare R2**.

---

## 🌟 Overview

**CareerOS** by [ThinkBuild](https://www.thinkbuild.in/) transforms India's fragmented campus placement process into a connected, high-craft platform. Built on the validated foundation of *Crack Off-Campus* (17,561+ registered students, ₹3.6L+ revenue generated), CareerOS unifies all campus stakeholders under:
- **One Login**
- **One Verified Career Identity**
- **One Intelligent AI Engine (TACIE)**
- **One Institutional Dashboard**

---

## 👥 The 7 Stakeholder Roles & Modules

1. **👨‍🎓 Student Workspace (`/student`)**
   - **Talent Passport™ (`/talent/[slug]`)**: Verified public profile featuring academic records, live project demos, and ATS-ready resumes.
   - **Resume Builder & ATS Optimizer**: Real-time ATS scoring (0-100), missing keyword detection, and action-verb improvements.
   - **Campus & Off-Campus Drives**: Automated eligibility checking against CGPA, backlogs, and branch criteria with 1-click apply.
   - **Hiring Pipeline**: Real-time status tracking from application through to offer letter issuance.
   - **TACIE AI Interview Coach**: Realistic mock interviews with STAR-method feedback and customized career roadmaps.
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

7. **⚙️ ThinkBuild Super Admin (`/super-admin`)**
   - **Multi-Tenant SaaS Overview**: Manage contracted colleges, tenant slugs, and subscription tiers.
   - **Global Off-Campus Sourcing Engine**: Broadcast validated job feeds from the *Crack Off-Campus* network.
   - **SaaS Economics**: Monitor subscription revenue across Starter (₹30K), Growth (₹90K), and Enterprise tiers.
   - **System Telemetry**: Real-time health monitoring of Neon PostgreSQL, Cloudflare R2, and TACIE AI requests.

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+ (tested on Node v26)
- npm / pnpm

### 2. Setup Environment
Copy `.env.example` to `.env`. Your Neon PostgreSQL credentials are pre-configured:
```bash
cp .env.example .env
```
Refer to [`env.md`](../../docs/env.md) for full instructions on setting up Cloudflare R2 and AI API keys.

### 3. Run Database Migrations & Seed Data

For an existing CareerOS/Neon database, apply the additive authentication and
student-profile migration. This deliberately preserves newer tables and nullable
legacy application rows that are not represented by the local Prisma schema:

```bash
npm run db:auth-profile
```

For a brand-new disposable development database only:

```bash
npm run db:push
npm run db:seed
```

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view CareerOS. Use the **Quick Role Switcher** in the top navigation bar to test all 7 stakeholder portals with one click!

---

## 🎨 Visual Identity & Styling
Designed with the crisp, modern aesthetic of **[thinkbuild.in](https://www.thinkbuild.in/)**:
- **Fonts**: `Sora` for headings, `Manrope` for body typography.
- **Palette**: Deep Midnight Navy (`#070B14`, `#0D1424`), Electric Cyan (`#0099cc`, `#00c2ff`), Emerald Green (`#10b981`), and Sapphire accents.
- **Craft**: High-density dashboards, polished status badges, subtle glassmorphism, and zero generic boilerplate feel.
