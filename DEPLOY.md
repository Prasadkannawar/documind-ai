# DocuMind AI — Deployment Guide

Complete step-by-step guide to deploy on Supabase + Render + Vercel (all free tiers).

---

## Step 1 — Supabase (Database + Vector Store)

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Choose a name: `documind-ai`, pick a region close to you, set a password
3. Wait ~2 minutes for project to provision
4. Go to **SQL Editor** → paste the entire contents of `supabase/schema.sql` → click **Run**
5. Go to **Project Settings → API**:
   - Copy **Project URL** → this is your `SUPABASE_URL`
   - Copy **service_role** secret key → this is your `SUPABASE_SERVICE_KEY`
   - ⚠️ Use `service_role`, NOT `anon` — it has write access needed for inserts

---

## Step 2 — Backend on Render

1. Go to [render.com](https://render.com) → **New → Web Service**
2. Connect your GitHub account and select **`Prasadkannawar/documind-ai`** repo
3. Set **Root Directory** to `backend`
4. Fill in these settings:

   | Field | Value |
   |---|---|
   | Name | `documind-backend` |
   | Runtime | `Python 3` |
   | Build Command | `pip install -r requirements.txt` |
   | Start Command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
   | Instance Type | `Free` |

5. Click **Advanced → Add Environment Variables** and add:

   | Key | Value |
   |---|---|
   | `SUPABASE_URL` | (from Step 1) |
   | `SUPABASE_SERVICE_KEY` | (from Step 1) |
   | `FRONTEND_URL` | `https://your-app.vercel.app` (fill after Step 3) |

6. Click **Create Web Service** → wait ~5-10 min for first deploy
7. Copy your backend URL: `https://documind-backend-xxxx.onrender.com`
8. Test: visit `https://documind-backend-xxxx.onrender.com/health`

   Expected:
   ```json
   {"status":"healthy","version":"2.0.0","supabase_connected":true,"total_documents":0}
   ```

> **Note on cold starts:** Render free tier sleeps after 15 min inactivity. First request after sleep takes ~30s while models reload. Paid plan ($7/mo) avoids this.

---

## Step 3 — Frontend on Vercel

### Option A — Vercel CLI (fastest)

```bash
cd frontend
npm install -g vercel
vercel login
vercel --prod
```

When prompted:
- **Link to existing project?** → No, create new
- **Project name:** `documind-ai`
- **Root directory:** `./` (you're already in frontend/)
- **Override build settings?** → No

Then add the environment variable in Vercel dashboard:

1. Go to your Vercel project → **Settings → Environment Variables**
2. Add:
   - Name: `NEXT_PUBLIC_API_URL`
   - Value: `https://documind-backend-xxxx.onrender.com`
   - Environment: Production + Preview + Development
3. Click **Redeploy** in Deployments tab

### Option B — Vercel Dashboard (no CLI)

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import `Prasadkannawar/documind-ai` from GitHub
3. Set **Root Directory** to `frontend`
4. Add Environment Variable: `NEXT_PUBLIC_API_URL` = your Render backend URL
5. Click **Deploy**

---

## Step 4 — Connect Everything

1. Back in Render dashboard, update `FRONTEND_URL` to your Vercel URL
2. Click **Manual Deploy → Deploy latest commit** in Render

Test the full flow:
1. Open your Vercel URL
2. Click **Dashboard** → Upload a PDF
3. Click **Ask Questions** → type a question
4. See the XAI panel populate with token attribution + grounding score

---

## Custom Domain (Optional)

### Vercel
- Settings → Domains → Add `documind.yourdomain.com`

### Render
- Settings → Custom Domains → Add `api.documind.yourdomain.com`

---

## Local Development

```bash
# 1. Clone
git clone https://github.com/Prasadkannawar/documind-ai.git
cd documind-ai

# 2. Backend
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # add SUPABASE_URL and SUPABASE_SERVICE_KEY
uvicorn app.main:app --reload --port 8000

# 3. Frontend (new terminal)
cd frontend
npm install
cp .env.example .env.local       # set NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

Open http://localhost:3000

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | Yes | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service_role key |
| `FRONTEND_URL` | Yes | Your Vercel URL (for CORS) |
| `EMBEDDING_MODEL` | No | Default: `BAAI/bge-small-en-v1.5` |
| `QA_MODEL` | No | Default: `deepset/tinyroberta-squad2` |
| `CHUNK_SIZE` | No | Default: `400` |
| `TOP_K_RESULTS` | No | Default: `5` |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | Your Render backend URL |
