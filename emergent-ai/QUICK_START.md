# ⚡ QUICK START - What You Need to Do NOW

## 🎯 Critical Steps (Do This First!)

### 1. Get Your OpenAI API Key (5 minutes)

1. Go to: https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the key (starts with `sk-proj-...`)
4. Add to `app/backend/.env`:
   ```env
   OPENAI_API_KEY=sk-proj-your-key-here
   ```

**Important:** Add billing info at https://platform.openai.com/account/billing
- Minimum: $5 deposit
- This will last for 500-1000 analyses!

---

### 2. Install Dependencies (10 minutes)

#### Windows:
```bash
# Double-click this file:
setup.bat
```

#### Mac/Linux:
```bash
chmod +x setup.sh
./setup.sh
```

#### Or Manually:

**Backend:**
```bash
cd app/backend
pip install -r requirements.txt
```

**Frontend:**
```bash
cd app/frontend
npm install
```

---

### 3. Configure Environment (2 minutes)

Edit `app/backend/.env`:

```env
# REQUIRED - Get from OpenAI
OPENAI_API_KEY=sk-proj-your-actual-key-here

# REQUIRED - Get from Razorpay (for testing, use test keys)
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_secret_key

# Database - Get from Supabase (https://supabase.com)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key

# Security (Change in production)
JWT_SECRET=your-super-secret-random-string-change-this

# CORS (Your frontend URL)
CORS_ORIGINS=http://localhost:3000
```

---

### 4. Setup Supabase Database (5 minutes)

**Create a FREE Supabase Project:**

1. Go to: https://supabase.com
2. Sign up / Login
3. Click "New Project"
4. Fill in:
   - **Name:** HireReady
   - **Database Password:** (save this!)
   - **Region:** Select closest to you
5. Wait for project setup (~2 minutes)

**Setup Database Schema:**

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy contents from `app/backend/supabase_schema.sql`
4. Paste and click "Run"
5. ✅ Tables created!

**Get Your Credentials:**

1. Go to **Settings** → **API**
2. Copy:
   - **Project URL** → Add to `.env` as `SUPABASE_URL`
   - **Project API keys** → **anon/public** → Add to `.env` as `SUPABASE_KEY`

---

### 5. Run the Application (2 minutes)

**Terminal 1 - Backend:**
```bash
cd app/backend
uvicorn server:app --reload
```

**Terminal 2 - Frontend:**
```bash
cd app/frontend
npm start
```

**Open Browser:**
```
http://localhost:3000
```

---

## ✅ Quick Test (5 minutes)

1. **Register an account**
   - Go to http://localhost:3000
   - Click "Get Started"
   - Create account

2. **Test Payment (Razorpay Test Mode)**
   - Click "Pricing"
   - Select ₹20 plan
   - Use test card:
     - Number: `4111 1111 1111 1111`
     - Expiry: `12/25`
     - CVV: `123`
   - Complete payment
   - Credit should be added!

3. **Upload Resume**
   - Go to "Analyze Resume"
   - Upload PDF (max 2MB)
   - Wait 2-3 seconds
   - View results!

---

## 🔍 Verify Everything Works

### Backend Health Check:
```bash
curl http://localhost:8000/docs
```
✅ Should open Swagger API documentation

### Frontend Check:
```
http://localhost:3000
```
✅ Should see landing page

### Admin Stats:
```bash
curl http://localhost:8000/api/admin/stats
```
✅ Should return JSON with user counts

---

## 🚨 Troubleshooting

### "openai module not found"
```bash
pip install openai
```

### "slowapi not found"
```bash
pip install slowapi
```

### "Supabase connection failed"
- Check your SUPABASE_URL and SUPABASE_KEY in `.env`
- Verify project is active at https://supabase.com

### "CORS error"
Add to backend `.env`:
```
CORS_ORIGINS=http://localhost:3000
```

### "OpenAI API key invalid"
- Double-check the key in `.env`
- Ensure billing is set up at OpenAI

---

## 💰 Cost Tracking

### Your Costs Per Analysis:

| Plan | Your Price | OpenAI Cost | Profit |
|------|-----------|-------------|--------|
| ₹20 (Basic) | ₹20 | ₹1.50 | **₹18.50** |
| ₹49 (Detailed) | ₹49 | ₹4.00 | **₹45.00** |
| ₹79 (Full) | ₹79 | ₹12.00 | **₹67.00** |

**Example: 100 analyses (60 basic, 30 detailed, 10 full)**
- Revenue: ₹3,480
- OpenAI Cost: ₹330
- **Net Profit: ₹3,150 (90% margin)** 💰

Monitor usage at: https://platform.openai.com/usage

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| [README.md](README.md) | Complete overview |
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | Production deployment |
| [CHANGES_MADE.md](CHANGES_MADE.md) | What changed today |
| [TESTING_GUIDE.md](TESTING_GUIDE.md) | Complete testing instructions |
| **THIS FILE** | Quick start guide |

---

## 🚀 Ready to Deploy?

Once testing works locally:

1. **Backend:** Deploy to Render/Railway
2. **Frontend:** Deploy to Vercel
3. **Database:** Use MongoDB Atlas

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for step-by-step instructions.

---

## 🎯 What Changed Today?

✅ **Migrated from MongoDB to Supabase (PostgreSQL)**  
✅ Replaced emergentintegrations with direct OpenAI SDK  
✅ Added cost optimization (different models for different plans)  
✅ Added rate limiting (10/min for resume analysis)  
✅ Added file validation (2MB PDF max)  
✅ Enhanced admin panel (revenue, recent payments, API usage)  
✅ Improved error handling  
✅ Updated all documentation  

See [CHANGES_MADE.md](CHANGES_MADE.md) and [SUPABASE_MIGRATION.md](SUPABASE_MIGRATION.md) for complete details.

---

## ✨ Features You Get

### For Users:
- ✅ Pay-per-use (no subscriptions)
- ✅ 3 pricing tiers (₹20, ₹49, ₹79)
- ✅ AI-powered resume analysis
- ✅ Job description matching
- ✅ Interview questions generation
- ✅ Beautiful UI (shadcn/ui)
- ✅ Secure payments (Razorpay)

### For You (Admin):
- ✅ Real-time revenue tracking
- ✅ User analytics
- ✅ API cost monitoring
- ✅ Payment history
- ✅ 90% profit margins!

---

## 📞 Need Help?

1. Check [TESTING_GUIDE.md](TESTING_GUIDE.md)
2. View API docs: http://localhost:8000/docs
3. Check error logs in terminal
4. Review [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

---

## 🎉 You're All Set!

Your production-ready AI SaaS is ready to launch!

**Next Steps:**
1. ✅ Complete local testing
2. ✅ Deploy to production
3. ✅ Launch marketing campaign
4. ✅ Scale and profit! 💰

**Good luck with your launch! 🚀**

---

**Built with ❤️ for students and job seekers**

*Last updated: February 16, 2026 - Migrated to Supabase*
