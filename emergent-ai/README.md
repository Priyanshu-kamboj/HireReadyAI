# 🎓 HireReady AI - AI-Powered Resume Analysis SaaS

![Status](https://img.shields.io/badge/status-production--ready-green)
![Python](https://img.shields.io/badge/python-3.9+-blue)
![React](https://img.shields.io/badge/react-19.0-blue)
![License](https://img.shields.io/badge/license-proprietary-red)

## 🚀 Overview

**HireReady AI** is a production-ready, pay-per-use AI resume evaluation platform designed for students and job seekers. Built with cutting-edge technology and optimized for profitability with **90% profit margins**.

### 💡 Key Features

- ✅ **Pay-per-analysis model** (No subscriptions!)
- ✅ **3 pricing tiers** - ₹20, ₹49, ₹79
- ✅ **AI-powered analysis** using OpenAI GPT models
- ✅ **Cost-optimized** - Different models for different plans
- ✅ **Secure payment** via Razorpay
- ✅ **Rate limiting** to prevent abuse
- ✅ **Admin dashboard** for analytics
- ✅ **Professional UI** with shadcn/ui components

---

## 📦 Tech Stack

### Backend
- **Framework:** FastAPI (Python)
- **Database:** MongoDB (Motor async driver)
- **Authentication:** JWT (python-jose)
- **AI:** OpenAI API (direct SDK)
- **Payments:** Razorpay
- **Rate Limiting:** slowapi

### Frontend
- **Framework:** React 19
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui (Radix UI)
- **Routing:** React Router v7
- **HTTP:** Axios
- **Payments:** react-razorpay

---

## 💰 Pricing Model

| Plan | Price | Features | AI Model | Cost | Profit |
|------|-------|----------|----------|------|--------|
| **Basic** | ₹20 | ATS Score, Formatting feedback | gpt-3.5-turbo | ₹1.50 | **93%** |
| **Detailed** | ₹49 | Basic + JD Matching, Skill gaps | gpt-4o-mini | ₹4.00 | **92%** |
| **Full** | ₹79 | Detailed + Interview Questions | gpt-4o | ₹12.00 | **85%** |

### Revenue Projection (1000 analyses/month)

**Assumed Distribution:** 60% Basic, 30% Detailed, 10% Full

- **Total Revenue:** ₹34,600
- **AI Costs:** ₹3,300
- **Net Profit:** ₹31,300/month (90% margin) 💰

---

## 🏗️ Project Structure

```
emergent-ai/
├── app/
│   ├── backend/
│   │   ├── server.py           # Main FastAPI application
│   │   ├── requirements.txt    # Python dependencies
│   │   ├── .env               # Environment variables (DO NOT COMMIT)
│   │   └── .env.example       # Environment template
│   │
│   └── frontend/
│       ├── src/
│       │   ├── pages/         # React pages
│       │   │   ├── LandingPage.js
│       │   │   ├── Dashboard.js
│       │   │   ├── AnalyzePage.js
│       │   │   ├── JDMatchPage.js
│       │   │   ├── InterviewPage.js
│       │   │   ├── PricingPage.js
│       │   │   ├── AuthPage.js
│       │   │   └── ResultPage.js
│       │   ├── components/    # UI components
│       │   │   └── ui/       # shadcn/ui components
│       │   ├── contexts/     # React contexts
│       │   │   └── AuthContext.js
│       │   └── App.js        # Main App component
│       │
│       ├── package.json
│       └── .env
│
├── DEPLOYMENT_GUIDE.md    # Comprehensive deployment instructions
├── CHANGES_MADE.md        # Detailed changelog
└── README.md             # This file
```

---

## 🚀 Quick Start

### Prerequisites

- Python 3.9+
- Node.js 16+
- MongoDB (local or Atlas)
- OpenAI API Key ([Get here](https://platform.openai.com/api-keys))
- Razorpay Account ([Sign up](https://razorpay.com))

### 1. Clone & Setup Backend

```bash
cd app/backend

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your credentials (OPENAI_API_KEY, RAZORPAY keys, etc.)

# Start server
uvicorn server:app --reload
```

Backend runs at: `http://localhost:8000`

API Docs: `http://localhost:8000/docs`

### 2. Setup Frontend

```bash
cd app/frontend

# Install dependencies
npm install

# Configure environment
echo "REACT_APP_BACKEND_URL=http://localhost:8000" > .env

# Start development server
npm start
```

Frontend runs at: `http://localhost:3000`

---

## 🔐 Environment Variables

### Backend (.env)

```env
# Database
MONGO_URL="mongodb://localhost:27017"
DB_NAME="hireready_database"

# Security
JWT_SECRET="your-super-secret-key-change-in-production"
JWT_ALGORITHM="HS256"
JWT_EXPIRATION=86400

# OpenAI
OPENAI_API_KEY="sk-proj-your-openai-key"

# Razorpay
RAZORPAY_KEY_ID="rzp_live_your_key_id"
RAZORPAY_KEY_SECRET="your_secret_key"

# CORS
CORS_ORIGINS="http://localhost:3000,https://yourdomain.com"
```

### Frontend (.env)

```env
REACT_APP_BACKEND_URL=http://localhost:8000
```

---

## 🎯 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Resume Analysis
- `POST /api/resume/analyze` - Upload & analyze resume (requires credits)
- `POST /api/resume/jd-match` - Match resume with JD (Detailed/Full plans)
- `POST /api/resume/interview-questions` - Generate questions (Full plan only)
- `GET /api/resume/history` - Get analysis history

### Payments
- `GET /api/payment/packages` - Get pricing packages
- `POST /api/payment/create-order` - Create Razorpay order
- `POST /api/payment/verify` - Verify payment & grant credit
- `GET /api/payment/status/{order_id}` - Check payment status
- `POST /api/webhook/razorpay` - Razorpay webhook handler

### Admin
- `GET /api/admin/stats` - Overall statistics
- `GET /api/admin/recent-payments` - Recent successful payments
- `GET /api/admin/api-usage` - AI API usage metrics

---

## 🛡️ Security Features

- ✅ **JWT Authentication** - Secure token-based auth
- ✅ **Password Hashing** - bcrypt with salt
- ✅ **Rate Limiting** - Protects against abuse
  - Resume analysis: 10/minute per IP
  - JD matching: 5/minute per IP
  - Interview questions: 3/minute per IP
- ✅ **File Validation** - 2MB PDF size limit
- ✅ **Payment Verification** - Razorpay signature verification
- ✅ **CORS Protection** - Configurable origins
- ✅ **Input Sanitization** - Pydantic validation

---

## 📊 Features by Plan

### Basic Analysis (₹20)
- ✅ ATS Score (0-100)
- ✅ Strengths & weaknesses
- ✅ Keyword suggestions
- ✅ Formatting issues
- ✅ Section-wise feedback

### Detailed Analysis (₹49)
- ✅ Everything in Basic
- ✅ Job Description matching
- ✅ Skill gap analysis
- ✅ Missing keywords from JD
- ✅ Match score percentage

### Full Pro Analysis (₹79)
- ✅ Everything in Detailed
- ✅ Technical interview questions (8-10)
- ✅ HR interview questions (5-7)
- ✅ Project-based questions (5-7)

---

## 📈 Performance Metrics

| Metric | Value |
|--------|-------|
| API Response Time | 2-3 seconds |
| Max File Size | 2MB |
| Supported Format | PDF only |
| Rate Limit (Analysis) | 10/minute |
| Cost per Analysis | ₹1.50 - ₹12 |
| Average Profit Margin | **90%** |

---

## 🧪 Testing

### Manual Testing

1. **Test Registration:**
   ```bash
   curl -X POST http://localhost:8000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"name":"Test User","email":"test@example.com","password":"test123"}'
   ```

2. **Test Payment Package List:**
   ```bash
   curl http://localhost:8000/api/payment/packages
   ```

3. **Test Admin Stats:**
   ```bash
   curl http://localhost:8000/api/admin/stats
   ```

### Frontend Testing

1. Open `http://localhost:3000`
2. Create account
3. Purchase ₹20 credit (use Razorpay test card)
4. Upload resume PDF
5. View analysis results

---

## 🚀 Deployment

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed production deployment instructions.

### Quick Deploy Options:

- **Backend:** Render, Railway, or Heroku
- **Frontend:** Vercel, Netlify
- **Database:** MongoDB Atlas (Free tier available)

---

## 📄 Recent Updates

See [CHANGES_MADE.md](CHANGES_MADE.md) for detailed changelog.

### Latest (Feb 15, 2026):
- ✅ Replaced emergentintegrations with direct OpenAI SDK
- ✅ Added cost optimization (model selection by plan)
- ✅ Implemented rate limiting
- ✅ Added 2MB PDF file validation
- ✅ Enhanced admin panel with analytics
- ✅ Improved error handling
- ✅ Updated documentation

---

## 💡 Cost Optimization

The app automatically selects the most cost-effective OpenAI model based on the purchased plan:

```python
model_map = {
    "basic": "gpt-3.5-turbo",    # Cheapest, fastest
    "detailed": "gpt-4o-mini",   # Mid-tier quality
    "full": "gpt-4o"             # Best quality
}
```

This saves up to **90% on AI costs** compared to using GPT-4o for everything!

---

## 🐛 Troubleshooting

### Common Issues:

1. **MongoDB Connection Failed**
   - Check if MongoDB is running: `mongod --version`
   - Verify connection string in .env

2. **OpenAI API Error**
   - Verify API key is correct
   - Check quota at https://platform.openai.com/usage
   - Ensure you have credits

3. **CORS Error**
   - Add frontend URL to `CORS_ORIGINS` in backend .env

4. **Rate Limit Exceeded**
   - Wait 1 minute before retrying
   - Check rate limit settings in server.py

---

## 📞 Support & Contact

- **Documentation:** See `DEPLOYMENT_GUIDE.md`
- **API Docs:** `http://localhost:8000/docs`
- **Issues:** Check error logs in terminal

---

## 📈 Roadmap

### Phase 1 (Current) ✅
- [x] Core resume analysis
- [x] Payment integration
- [x] Admin dashboard
- [x] Cost optimization

### Phase 2 (Next)
- [ ] Email notifications
- [ ] Bulk resume upload
- [ ] Resume templates
- [ ] Export to PDF

### Phase 3 (Future)
- [ ] Mobile app (React Native)
- [ ] Referral program
- [ ] A/B testing
- [ ] Multi-language support

---

## 📜 License

Proprietary - All rights reserved

---

## 🎉 Success Metrics

Target after 3 months:
- 500+ registered users
- 2000+ analyses completed
- ₹60,000+ monthly revenue
- 4.5+ star rating

---

## 🙏 Acknowledgments

- OpenAI for GPT models
- Razorpay for payment infrastructure
- shadcn/ui for beautiful components
- FastAPI and React communities

---

**Built with ❤️ for students and job seekers**

**Ready to launch your AI SaaS? Let's go! 🚀**
