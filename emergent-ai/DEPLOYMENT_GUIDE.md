# 🚀 HireReady AI - Deployment Guide

## 📋 Prerequisites

- Python 3.9+
- Node.js 16+
- Supabase Account (FREE)
- OpenAI API Key
- Razorpay Account

---

## 🔧 Backend Setup

### 1. Install Dependencies

```bash
cd app/backend
pip install -r requirements.txt
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required Environment Variables:
- `OPENAI_API_KEY` - Get from [OpenAI Platform](https://platform.openai.com/api-keys)
- `RAZORPAY_KEY_ID` - Get from [Razorpay Dashboard](https://dashboard.razorpay.com/app/keys)
- `RAZORPAY_KEY_SECRET` - From same location
- `JWT_SECRET` - Generate a strong random string
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_KEY` - Your Supabase anon/public key

### 3. Setup Supabase Database

**Create Supabase Project:**
- Sign up at [Supabase](https://supabase.com)
- Create a new project (FREE tier available)
- Run the SQL schema from `app/backend/supabase_schema.sql` in SQL Editor
- Get your project URL and anon key from Settings → API

### 4. Run Backend Server

```bash
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at: `http://localhost:8000`

API Documentation: `http://localhost:8000/docs`

---

## 🎨 Frontend Setup

### 1. Install Dependencies

```bash
cd app/frontend
npm install
```

### 2. Environment Configuration

Create `.env` file:

```bash
REACT_APP_BACKEND_URL=http://localhost:8000
```

### 3. Run Frontend

```bash
npm start
```

Frontend will open at: `http://localhost:3000`

---

## 📦 Production Deployment

### Backend Deployment (Render/Railway)

#### Option 1: Render

1. Create account at [Render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Build Command:** `pip install -r app/backend/requirements.txt`
   - **Start Command:** `cd app/backend && uvicorn server:app --host 0.0.0.0 --port $PORT`
   - **Environment:** Python 3
5. Add Environment Variables (all from .env)
6. Deploy!

#### Option 2: Railway

1. Create account at [Railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Configure:
   - **Root Directory:** `app/backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn server:app --host 0.0.0.0 --port $PORT`
4. Add Environment Variables
5. Deploy!

### Frontend Deployment (Vercel)

1. Create account at [Vercel.com](https://vercel.com)
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset:** Create React App
   - **Root Directory:** `app/frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `build`
5. Add Environment Variable:
   - `REACT_APP_BACKEND_URL` = Your backend URL (e.g., https://your-app.onrender.com)
6. Deploy!

---

## 💾 Database Setup (Supabase)

1. Go to [Supabase](https://supabase.com)
2. Create a new project (FREE tier available)
3. Wait for project initialization (~2 minutes)
4. Go to SQL Editor
5. Copy and paste contents from `app/backend/supabase_schema.sql`
6. Click "Run" to create all tables and indexes
7. Go to Settings → API to get:
   - **Project URL** (SUPABASE_URL)
   - **anon/public key** (SUPABASE_KEY)
8. Add these to your backend environment variables

---

## 🔐 Security Checklist

### Before Production:

- [ ] Change JWT_SECRET to a strong random value
- [ ] Use production Razorpay keys (not test keys)
- [ ] Set CORS_ORIGINS to your frontend URL only
- [ ] Enable Row Level Security (RLS) in Supabase (already configured in schema)
- [ ] Use HTTPS for all endpoints
- [ ] Set up rate limiting (already configured)
- [ ] Monitor OpenAI API usage
- [ ] Set up error logging (Sentry recommended)

---

## 💰 Cost Optimization

### Current Model Usage:

| Plan | Price | OpenAI Model | Avg Cost per Analysis | Your Profit |
|------|-------|--------------|----------------------|-------------|
| Basic (₹20) | $0.27 | gpt-3.5-turbo | ~$0.02 (₹1.50) | **₹18.50** (93%) |
| Detailed (₹49) | $0.65 | gpt-4o-mini | ~$0.05 (₹4.00) | **₹45.00** (92%) |
| Full (₹79) | $1.05 | gpt-4o | ~$0.15 (₹12.00) | **₹67.00** (85%) |

### Tips:
- Monitor usage at [OpenAI Usage Dashboard](https://platform.openai.com/usage)
- Set spending limits in OpenAI account
- Cache common resume analyses (future enhancement)
- Use shorter prompts when possible

---

## 🔍 Monitoring

### Backend Health Check:
```bash
curl http://localhost:8000/api/health
```

### Check Admin Stats:
```bash
curl http://localhost:8000/api/admin/stats
```

### View Logs:
- **Local:** Check terminal output
- **Production:** Use platform's logging (Render Logs, Railway Logs)

---

## 🐛 Troubleshooting

### "No module named 'openai'"
```bash
pip install openai
```

### "slowapi not found"
```bash
pip install slowapi
```

### Supabase Connection Failed
- Check if SUPABASE_URL and SUPABASE_KEY are set correctly
- Verify project is active in Supabase dashboard
- Check if tables are created (run supabase_schema.sql)
- Verify RLS policies are enabled

### CORS Errors
- Update `CORS_ORIGINS` in backend .env
- Include your frontend URL

### Rate Limit Exceeded
- Current limits:
  - Resume analysis: 10/minute
  - JD matching: 5/minute
  - Interview questions: 3/minute
  - Admin endpoints: 30/minute

---

## 📞 Support

For issues or questions:
- Check API documentation at `/docs`
- Review error logs
- Test endpoints with Postman/Thunder Client

---

## 🎯 Next Steps (Post-Launch)

1. Set up email notifications (SendGrid/Mailgun)
2. Add analytics (Google Analytics)
3. Implement caching (Redis)
4. Add user feedback system
5. Create mobile app (React Native)
6. A/B testing for pricing
7. Referral program
8. Bulk upload feature

---

## 📄 License

Proprietary - All rights reserved
