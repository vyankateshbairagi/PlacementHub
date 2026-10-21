# PlacementHub - Complete Environment Setup Guide (`env.md`)

This guide explains how to configure and completely replace all credentials across all three services in PlacementHub:
1. **`apps/web`** (Main Next.js Frontend & Backend API)
2. **`services/assessment`** (Coding Assessment & Learning Service)
3. **`services/ai`** (FastAPI AI Microservice)

---

## 1. PostgreSQL Database (Neon) - Required

PlacementHub uses **Neon Serverless PostgreSQL** for scalable multi-tenant student & institutional data.

### How to get your own credentials:
1. Sign up or log in at [https://console.neon.tech/](https://console.neon.tech/).
2. Click **Create Project** (e.g. named `placementhub-db`).
3. Under **Dashboard > Connection Details**:
   - Select **Direct connection**: Copy string into `DATABASE_URL`.
   - Select **Pooled connection** (with PgBouncer enabled): Copy string into `DATABASE_URL_POOLED`.
4. Ensure both include `?sslmode=require`.

### Where to update in the project:
- **`apps/web/.env`**:
  ```env
  DATABASE_URL="postgresql://<user>:<password>@<ep-id>.aws.neon.tech/<dbname>?sslmode=require"
  DATABASE_URL_POOLED="postgresql://<user>:<password>@<ep-id>-pooler.aws.neon.tech/<dbname>?sslmode=require"
  ```
- **`services/assessment/.env`**:
  ```env
  DATABASE_URL="postgresql://<user>:<password>@<ep-id>.aws.neon.tech/<dbname>?sslmode=require"
  DATABASE_URL_POOLED="postgresql://<user>:<password>@<ep-id>-pooler.aws.neon.tech/<dbname>?sslmode=require"
  ```
- **`services/ai/.env`**:
  *(Note: SQLAlchemy Async requires `postgresql+asyncpg://` prefix)*
  ```env
  DATABASE_URL=postgresql+asyncpg://<user>:<password>@<ep-id>.aws.neon.tech/<dbname>?ssl=require
  ```

---

## 2. Application Auth & Session Secret (`NEXTAUTH_SECRET`) - Required

Used for signing encrypted JWT session tokens and securing the `careeros_session` cookie.

### How to generate a new key:
Run this command in PowerShell or Terminal:
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
Copy the generated 44-character string and set it in `apps/web/.env`:
```env
NEXTAUTH_SECRET="<YOUR_GENERATED_SECRET>"
```

---

## 3. Public Web URL (`NEXT_PUBLIC_APP_URL`) - Required

Used to generate signup invitation links, password reset links, and email verification redirects.
```env
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```
*(In production, change to your Vercel/custom domain, e.g. `https://placementhub.vercel.app`)*

---

## 4. TACIE AI Engine (Google Gemini / OpenAI) - Optional

Used for:
- ATS Resume scoring & missing keyword detection
- AI Mock interview evaluation & STAR-method feedback
- Career roadmaps & fake job scam detection

> **Note:** If left empty, PlacementHub automatically switches to a built-in heuristic intelligence engine so the app continues to function smoothly.

### How to get a free Google Gemini API Key:
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Click **Create API Key**.
3. Set in `apps/web/.env`:
   ```env
   GEMINI_API_KEY="AIzaSy..."
   ```

---

## 5. Cloudflare R2 Document Storage - Optional

Used for storing student PDF resumes, corporate offer letters, and study materials in zero-egress cloud storage.

> **Note:** If left empty, PlacementHub falls back to local document storage for testing.

### How to get credentials:
1. Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **R2 Storage** -> **Create Bucket** (e.g. `placementhub-documents`).
3. Click **Manage R2 API Tokens** -> **Create API Token** (Object Read & Write permissions).
4. Set in `apps/web/.env`:
   ```env
   R2_ACCOUNT_ID="your_account_id"
   R2_ACCESS_KEY_ID="your_access_key_id"
   R2_SECRET_ACCESS_KEY="your_secret_access_key"
   R2_BUCKET_NAME="placementhub-documents"
   R2_PUBLIC_URL="https://pub-xxxxxx.r2.dev"
   ```

---

## 6. Email Service (Resend) - Optional

Used by TPO officers and recruiters to send drive notifications and invitations.

> **Note:** In local development (`NODE_ENV=development`), emails are automatically logged to the terminal if no key is supplied.

### How to get credentials:
1. Sign up at [https://resend.com](https://resend.com).
2. Go to **API Keys** -> **Create API Key**.
3. Set in `apps/web/.env`:
   ```env
   RESEND_API_KEY="re_..."
   EMAIL_FROM="PlacementHub <notifications@resend.dev>"
   ```

---

## 7. Microservices Interconnection URLs

Configure how the services communicate with each other:

- In `apps/web/.env`:
  ```env
  AI_SERVICE_URL="http://localhost:8000"
  ASSESSMENT_SERVICE_URL="http://localhost:5001"
  ```

---

## Complete Variables Quick Reference

| Variable | Location | What it does | Required? | Where to get it |
| :--- | :--- | :--- | :--- | :--- |
| `DATABASE_URL` | `apps/web`, `services/assessment` | Direct PostgreSQL connection | **Yes** | [Neon Console](https://console.neon.tech) |
| `DATABASE_URL_POOLED` | `apps/web`, `services/assessment` | Pooled PostgreSQL connection | **Yes** | [Neon Console](https://console.neon.tech) |
| `DATABASE_URL` | `services/ai` | Async PostgreSQL connection | **Yes** | [Neon Console](https://console.neon.tech) (prefix `postgresql+asyncpg://`) |
| `NEXTAUTH_SECRET` | `apps/web` | JWT cookie encryption key | **Yes** | Generate via `node -e "crypto..."` |
| `NEXT_PUBLIC_APP_URL` | `apps/web` | App base URL | **Yes** | `http://localhost:3000` |
| `GEMINI_API_KEY` | `apps/web` | AI resume & mock interviews | Recommended | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `RESEND_API_KEY` | `apps/web` | Live email notifications | Optional | [Resend](https://resend.com) |
| `R2_*` | `apps/web` | Resume & doc uploads | Optional | [Cloudflare R2](https://dash.cloudflare.com) |
| `AI_SERVICE_URL` | `apps/web` | AI microservice endpoint | Default (`:8000`) | Local / host URL |
| `ASSESSMENT_SERVICE_URL` | `apps/web` | Code test microservice | Default (`:5001`) | Local / host URL |
