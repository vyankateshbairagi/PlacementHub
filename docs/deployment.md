# 🚀 PlacementHub - Production Deployment Guide

This guide walks you through deploying **PlacementHub** using modern cloud PaaS:
- **`apps/web`** (Next.js 14 Full-Stack Portal) &rarr; **[Vercel](https://vercel.com)**
- **`services/assessment`** (Express Microservice) &rarr; **[Render](https://render.com)** or **[Railway](https://railway.app)**
- **`services/ai`** (FastAPI Microservice) &rarr; **[Render](https://render.com)** or **[Railway](https://railway.app)**
- **Database** &rarr; **[Neon Serverless PostgreSQL](https://console.neon.tech)** *(Already cloud-ready)*
- **Storage** &rarr; **[Cloudflare R2](https://dash.cloudflare.com)** *(Optional)*

---

## 📋 Architecture Overview

```
                      ┌────────────────────────────────┐
                      │      Vercel (apps/web)         │
                      │  Next.js 14 App Router + Auth   │
                      │  https://your-app.vercel.app   │
                      └───────┬───────────────┬────────┘
                              │               │
            ┌─────────────────┴─┐           ┌─┴────────────────┐
            │                   │           │                  │
            ▼                   ▼           ▼                  ▼
    ┌──────────────┐    ┌──────────────┐  ┌────────────────┐ ┌────────────────┐
    │ Neon Postgres│    │Cloudflare R2 │  │ Render/Railway │ │ Render/Railway │
    │ Serverless DB│    │ Object Store │  │ Assessment Svc │ │   AI Service   │
    │  (Port 5432) │    │  (Resumes)   │  │   (Port 5001)  │ │   (Port 8000)  │
    └──────────────┘    └──────────────┘  └────────────────┘ └────────────────┘
```

---

## Step 1: Push Database Schema to Neon

Before deploying the frontend or microservices, verify your Neon database has the latest schema and seed records:

```powershell
cd apps/web

# 1. Push schema tables to Neon
npx prisma db push

# 2. Seed default institutional & demo accounts
npm run db:seed
```

---

## Step 2: Deploy Main Web Portal (`apps/web`) to Vercel

### 2.1 Import Repository
1. Log in to [Vercel](https://vercel.com) and click **"Add New..."** &rarr; **"Project"**.
2. Select your repository: `vyankateshbairagi/PlacementHub`.

### 2.2 Configure Monorepo Settings *(Crucial Step)*
- **Framework Preset**: `Next.js`
- **Root Directory**: Click **Edit** and choose `apps/web`.
- **Build Command**: `prisma generate && next build` *(automatically picked up from `package.json`)*
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### 2.3 Set Environment Variables
Add the following in the **Environment Variables** panel:

| Variable Name | Value / Description | Required? |
| :--- | :--- | :--- |
| `DATABASE_URL` | Neon direct connection string (`postgresql://...?sslmode=require`) | **Yes** |
| `DATABASE_URL_POOLED` | Neon pooled connection string (`postgresql://...pooler...?sslmode=require`) | **Yes** |
| `NEXTAUTH_SECRET` | 32+ character random secret (generated via `crypto.randomBytes(32)`) | **Yes** |
| `NEXT_PUBLIC_APP_URL` | Your production URL, e.g. `https://placementhub.vercel.app` | **Yes** |
| `NODE_ENV` | `production` | **Yes** |
| `GEMINI_API_KEY` | Google AI Studio API key | Recommended |
| `RESEND_API_KEY` | Resend API key for transactional emails | Optional |
| `EMAIL_FROM` | `PlacementHub <notifications@yourdomain.com>` | Optional |
| `R2_ACCOUNT_ID` | Cloudflare R2 Account ID | Optional |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 Access Key | Optional |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 Secret Access Key | Optional |
| `R2_BUCKET_NAME` | Cloudflare R2 Bucket Name | Optional |
| `R2_PUBLIC_URL` | Cloudflare R2 Public URL | Optional |
| `AI_SERVICE_URL` | `http://localhost:8000` *(update once AI service is deployed in Step 4)* | Optional |
| `ASSESSMENT_SERVICE_URL` | `http://localhost:5001` *(update once Assessment service is deployed in Step 3)* | Optional |

4. Click **Deploy**. Your frontend and API routes will be live within 2–3 minutes at `https://<your-project>.vercel.app`.

---

## Step 3: Deploy Assessment Microservice to Render / Railway

### Option A: Render.com (Free Tier)
1. In [Render Dashboard](https://dashboard.render.com), click **"New +"** &rarr; **"Web Service"**.
2. Connect your GitHub repo `vyankateshbairagi/PlacementHub`.
3. Configure the service:
   - **Name**: `placementhub-assessment`
   - **Region**: Choose closest to your Neon DB (e.g. Frankfurt / Oregon / Singapore).
   - **Root Directory**: `services/assessment`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. In **Environment Variables**:
   - `DATABASE_URL`: *(Your Neon direct connection)*
   - `DATABASE_URL_POOLED`: *(Your Neon pooled connection)*
   - `NODE_ENV`: `production`
   - `ALLOWED_ORIGINS`: `https://<your-project>.vercel.app`
5. Click **Create Web Service**. Note down the live URL (e.g. `https://placementhub-assessment.onrender.com`).

---

## Step 4: Deploy AI Microservice to Render / Railway

### Option A: Render.com (Free Tier)
1. In [Render Dashboard](https://dashboard.render.com), click **"New +"** &rarr; **"Web Service"**.
2. Connect your GitHub repo `vyankateshbairagi/PlacementHub`.
3. Configure the service:
   - **Name**: `placementhub-ai`
   - **Root Directory**: `services/ai`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. In **Environment Variables**:
   - `DATABASE_URL`: `postgresql+asyncpg://<user>:<password>@<neon-host>/<db>?ssl=require`
   - `APP_NAME`: `PlacementHub AI Microservice`
   - `OLLAMA_HOST`: `http://localhost:11434` *(or omit if using Gemini fallback)*
5. Click **Create Web Service**. Note down the live URL (e.g. `https://placementhub-ai.onrender.com`).

---

## Step 5: Connect Microservices to Vercel

Once both microservices are running:
1. Go back to your [Vercel Project Dashboard](https://vercel.com) &rarr; **Settings** &rarr; **Environment Variables**.
2. Update:
   - `ASSESSMENT_SERVICE_URL` &rarr; `https://placementhub-assessment.onrender.com`
   - `AI_SERVICE_URL` &rarr; `https://placementhub-ai.onrender.com`
3. Click **Deployments** &rarr; Select the latest deployment &rarr; Click **Redeploy** to pick up the updated environment variables.

---

## Step 6: Post-Deployment Health Verification

PlacementHub includes an automated Playwright production verification script. Run it against your live URL:

```powershell
cd apps/web

# Test all portals & login endpoints on your live domain:
$env:PROD_URL="https://<your-project>.vercel.app"
node scripts/verify_production.js
```

This verifies that:
- All 7 role consoles (`/student`, `/tpo`, `/recruiter`, `/faculty`, `/alumni`, `/institute`, `/super-admin`) render HTTP 200.
- Production screenshots are saved to `apps/web/public/prod_screenshots/`.
- Live API authentication returns valid session tokens.
