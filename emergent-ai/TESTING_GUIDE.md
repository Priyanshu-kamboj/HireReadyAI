# 🧪 Testing Guide for HireReady AI

## Quick Testing Checklist

### ✅ Backend API Testing

#### 1. Health Check
```bash
curl http://localhost:8000/docs
```
Expected: Swagger UI opens with all endpoints

#### 2. User Registration
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "testpass123"
  }'
```

Expected Response:
```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhb...",
  "user": {
    "id": "uuid-here",
    "name": "Test User",
    "email": "test@example.com",
    "plan_type": "free",
    "usage_count": 0,
    "credits": 0
  }
}
```

#### 3. User Login
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123"
  }'
```

#### 4. Get Payment Packages
```bash
curl http://localhost:8000/api/payment/packages
```

Expected Response:
```json
{
  "packages": [
    {
      "id": "basic",
      "name": "Basic Analysis",
      "price": 20.0,
      "currency": "inr",
      "features": [...],
      "analysis_type": "basic"
    },
    ...
  ],
  "razorpay_key_id": "rzp_test_..."
}
```

#### 5. Admin Stats (Without Auth)
```bash
curl http://localhost:8000/api/admin/stats
```

Expected Response:
```json
{
  "total_users": 1,
  "free_users": 1,
  "pro_users": 0,
  "total_analyses": 0,
  "total_revenue": 0.0
}
```

#### 6. Test Rate Limiting
```bash
# Run this 15 times quickly
for i in {1..15}; do
  curl http://localhost:8000/api/admin/stats
  echo " - Request $i"
done
```

Expected: After 10-30 requests (depending on endpoint), you should get:
```json
{"detail": "Rate limit exceeded"}
```

---

### ✅ Frontend Testing

#### Manual Testing Steps:

1. **Landing Page**
   - [ ] Open http://localhost:3000
   - [ ] Verify hero section loads
   - [ ] Click "Get Started" → should navigate to login
   - [ ] Click "View Pricing" → should navigate to pricing

2. **Registration**
   - [ ] Navigate to /login (or /register)
   - [ ] Fill in: Name, Email, Password
   - [ ] Click "Create Account"
   - [ ] Verify redirect to dashboard
   - [ ] Check localStorage for token

3. **Pricing Page**
   - [ ] Navigate to /pricing
   - [ ] Verify 3 packages displayed (₹20, ₹49, ₹79)
   - [ ] Click "Purchase" on ₹20 plan
   - [ ] Razorpay checkout should open

4. **Test Payment (Razorpay Test Mode)**
   - Use these test card details:
     - **Card Number:** 4111 1111 1111 1111
     - **Expiry:** Any future date (e.g., 12/25)
     - **CVV:** Any 3 digits (e.g., 123)
     - **Name:** Test User
   - Click "Pay"
   - Should redirect to dashboard
   - Verify credit increased by 1

5. **Resume Upload & Analysis**
   - [ ] Navigate to /analyze
   - [ ] Upload a sample PDF resume (< 2MB)
   - [ ] Click "Analyze Resume"
   - [ ] Wait 2-3 seconds
   - [ ] Verify results page shows:
     - Score (0-100)
     - Strengths
     - Weaknesses
     - Keyword suggestions
     - Section feedback

6. **JD Matching (Requires ₹49 or ₹79 plan)**
   - [ ] First purchase ₹49 plan
   - [ ] Upload resume
   - [ ] Navigate to /jd-match
   - [ ] Enter job description
   - [ ] Submit
   - [ ] Verify:
     - Match score
     - Skill gaps
     - Missing keywords

7. **Interview Questions (Requires ₹79 plan)**
   - [ ] Purchase ₹79 plan
   - [ ] Upload resume
   - [ ] Navigate to /interview
   - [ ] View generated questions:
     - Technical questions
     - HR questions
     - Project-based questions

8. **Dashboard**
   - [ ] Navigate to /dashboard
   - [ ] Verify credit count correct
   - [ ] Check analysis history displays
   - [ ] Test navigation links

9. **Logout & Re-login**
   - [ ] Click logout
   - [ ] Verify redirect to landing page
   - [ ] Login again
   - [ ] Verify user data persists

---

### ✅ File Upload Testing

#### Test Valid PDF
```bash
# Create a test PDF or use existing resume
curl -X POST http://localhost:8000/api/resume/analyze \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "file=@/path/to/resume.pdf"
```

#### Test File Size Limit (Should Fail)
```bash
# Create a 3MB test file
dd if=/dev/zero of=large.pdf bs=1M count=3

# Try to upload (should fail with 2MB limit error)
curl -X POST http://localhost:8000/api/resume/analyze \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "file=@large.pdf"
```

Expected Error:
```json
{
  "detail": "File size exceeds 2MB limit. Your file is 3.00MB"
}
```

#### Test Non-PDF File (Should Fail)
```bash
curl -X POST http://localhost:8000/api/resume/analyze \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "file=@document.docx"
```

Expected Error:
```json
{
  "detail": "Only PDF files are allowed"
}
```

---

### ✅ Payment Flow Testing

#### Complete Payment Flow:

1. **Create Order**
```bash
curl -X POST http://localhost:8000/api/payment/create-order \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "package_id": "basic",
    "origin_url": "http://localhost:3000"
  }'
```

2. **Verify Payment** (After Razorpay success)
```bash
curl -X POST http://localhost:8000/api/payment/verify \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "razorpay_order_id": "order_xxx",
    "razorpay_payment_id": "pay_xxx",
    "razorpay_signature": "signature_xxx"
  }'
```

3. **Check Payment Status**
```bash
curl -X GET "http://localhost:8000/api/payment/status/order_xxx" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### ✅ Admin Panel Testing

#### 1. View Statistics
```bash
curl http://localhost:8000/api/admin/stats
```

#### 2. Recent Payments
```bash
curl http://localhost:8000/api/admin/recent-payments?limit=10
```

#### 3. API Usage
```bash
curl http://localhost:8000/api/admin/api-usage
```

Expected Response:
```json
{
  "total_analyses": 15,
  "today_analyses": 5,
  "by_type": {
    "basic": 10,
    "detailed": 3,
    "full": 2
  }
}
```

---

### ✅ Error Handling Testing

#### 1. Test Without Credits
```bash
# Login, don't purchase credits, try to analyze
curl -X POST http://localhost:8000/api/resume/analyze \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@resume.pdf"
```

Expected:
```json
{
  "detail": "No credits available. Please purchase credits to continue."
}
```

#### 2. Test JD Match Without Detailed Plan
```bash
# Upload with basic plan, try JD match
curl -X POST http://localhost:8000/api/resume/jd-match \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resume_id": "resume-uuid",
    "job_description": "Looking for Python developer..."
  }'
```

Expected:
```json
{
  "detail": "JD matching requires Detailed (₹49) or Full (₹79) plan"
}
```

#### 3. Test Interview Questions Without Full Plan
```bash
curl -X POST http://localhost:8000/api/resume/interview-questions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"resume_id": "resume-uuid"}'
```

Expected:
```json
{
  "detail": "Interview questions generation requires Full plan (₹79)"
}
```

---

### ✅ OpenAI Integration Testing

#### Verify Model Selection:

1. **Basic Plan** → Should use `gpt-3.5-turbo`
2. **Detailed Plan** → Should use `gpt-4o-mini`
3. **Full Plan** → Should use `gpt-4o`

Check backend logs after each analysis:
```
INFO: Using model: gpt-3.5-turbo for analysis_type: basic
INFO: Using model: gpt-4o-mini for analysis_type: detailed
INFO: Using model: gpt-4o for analysis_type: full
```

---

### ✅ Database Testing

#### Check MongoDB Collections:

```javascript
// Connect to MongoDB
use hireready_database

// Check users
db.users.find().pretty()

// Check payment transactions
db.payment_transactions.find().pretty()

// Check resumes
db.resumes.find({}, {resume_text: 0}).pretty()

// Check JD matches
db.jd_matches.find().pretty()
```

---

## 🎯 Success Criteria

All tests should pass:

- [x] User can register and login
- [x] Payment packages load correctly
- [x] Razorpay checkout works
- [x] Credits are granted after payment
- [x] Resume upload validates file size (2MB max)
- [x] Resume upload validates file type (PDF only)
- [x] AI analysis returns structured JSON
- [x] Different models used for different plans
- [x] Rate limiting works (10/min for analysis)
- [x] JD matching requires detailed/full plan
- [x] Interview questions require full plan
- [x] Admin stats show correct data
- [x] Error messages are clear and helpful

---

## 🐛 Common Issues & Fixes

### Issue: "Module 'openai' not found"
**Fix:**
```bash
pip install openai
```

### Issue: "slowapi not found"
**Fix:**
```bash
pip install slowapi
```

### Issue: MongoDB connection failed
**Fix:**
- Start MongoDB: `mongod`
- Or use MongoDB Atlas connection string

### Issue: CORS error in browser
**Fix:**
Add frontend URL to `CORS_ORIGINS` in backend .env:
```
CORS_ORIGINS="http://localhost:3000"
```

### Issue: OpenAI API "Rate limit exceeded"
**Fix:**
- Check usage at https://platform.openai.com/usage
- Add credits to your OpenAI account
- Use test mode with mock responses

---

## 📊 Performance Testing

### Load Testing (Optional)

Install Apache Bench:
```bash
# Ubuntu/Mac
sudo apt install apache2-utils

# Test 100 requests, 10 concurrent
ab -n 100 -c 10 http://localhost:8000/api/admin/stats
```

Expected:
- Rate limiter should kick in
- Server should handle gracefully

---

**Happy Testing! 🎉**
