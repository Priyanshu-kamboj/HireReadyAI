from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
from openai import AsyncOpenAI
import razorpay
import PyPDF2
import io
import json
import hmac
import hashlib

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')


def get_required_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value

# MongoDB connection 
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
JWT_SECRET = get_required_env('JWT_SECRET')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRATION = int(os.environ.get('JWT_EXPIRATION', 86400))

# Razorpay client
RAZORPAY_KEY_ID = os.getenv('RAZORPAY_KEY_ID', '')
RAZORPAY_KEY_SECRET = os.getenv('RAZORPAY_KEY_SECRET', '')
razorpay_client: Any = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY") or os.getenv("EMERGENT_LLM_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")
openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

# Create the main app without a prefix
app = FastAPI()
api_router = APIRouter(prefix="/api")

# ===== Models =====
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: str
    plan_type: str = "free"
    usage_count: int = 0
    credits: int = 0
    subscription_id: Optional[str] = None
    created_at: str

class ResumeAnalyzeResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    score: int
    feedback: dict
    created_at: str

class JDMatchRequest(BaseModel):
    resume_id: str
    job_description: str

class JDMatchResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    resume_id: str
    jd_match_score: int
    skill_gaps: List[str]
    missing_keywords: List[str]
    created_at: str

class InterviewQuestionsRequest(BaseModel):
    resume_id: str

class InterviewQuestionsResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    technical: List[str]
    hr: List[str]
    project_based: List[str]

class AdminStats(BaseModel):
    total_users: int
    free_users: int
    pro_users: int
    total_analyses: int
    total_revenue: float

# Payment Models
class PaymentPackageRequest(BaseModel):
    package_id: str
    origin_url: str

class PaymentPackage(BaseModel):
    id: str
    name: str
    price: float
    currency: str
    features: List[str]
    analysis_type: str

# Define fixed pricing packages (NEVER accept prices from frontend)
PAYMENT_PACKAGES = {
    "basic": PaymentPackage(
        id="basic",
        name="Basic Analysis",
        price=20.0,
        currency="inr",
        features=["ATS Score (0-100)", "Section-wise feedback", "Keyword suggestions"],
        analysis_type="basic"
    ),
    "detailed": PaymentPackage(
        id="detailed",
        name="Detailed AI + JD Matching",
        price=49.0,
        currency="inr",
        features=["Everything in Basic", "Job Description Matching", "Skill gap analysis", "Missing keywords"],
        analysis_type="detailed"
    ),
    "full": PaymentPackage(
        id="full",
        name="Full Pro Analysis",
        price=79.0,
        currency="inr",
        features=["Everything in Detailed", "Interview question generation", "Technical questions", "HR questions", "Project-based questions"],
        analysis_type="full"
    )
}

# ===== Utility Functions =====
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(seconds=JWT_EXPIRATION)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"email": email}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return User(**user)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    try:
        pdf_file = io.BytesIO(pdf_bytes)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text()
        return text
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error extracting PDF text: {str(e)}")

async def analyze_resume_with_ai(resume_text: str) -> dict:
    try:
        if openai_client is None:
            raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured")
        
        prompt = f"""Analyze this resume and provide a comprehensive evaluation in JSON format:

Resume:
{resume_text[:4000]}

Provide your response in this exact JSON structure:
{{
  "score": <number 0-100>,
  "strengths": [<list of 3-5 key strengths>],
  "weaknesses": [<list of 3-5 areas to improve>],
  "keyword_suggestions": [<list of 5-10 important keywords to add>],
  "formatting_issues": [<list of formatting problems>],
  "section_feedback": {{
    "summary": "<feedback on summary/objective>",
    "experience": "<feedback on work experience>",
    "education": "<feedback on education>",
    "skills": "<feedback on skills section>"
  }}
}}"""
        
        response = await openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert ATS (Applicant Tracking System) resume analyzer. Provide detailed, actionable feedback."
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.2
        )
        content = response.choices[0].message.content if response.choices else None
        if not content:
            raise HTTPException(status_code=500, detail="Empty AI response")
        
        # Parse JSON from response
        response_text = content.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        result = json.loads(response_text)
        return result
    except Exception as e:
        logging.error(f"AI analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

async def match_jd_with_ai(resume_text: str, job_description: str) -> dict:
    try:
        if openai_client is None:
            raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured")
        
        prompt = f"""Compare this resume with the job description and provide a match analysis in JSON format:

Resume:
{resume_text[:2000]}

Job Description:
{job_description[:2000]}

Provide your response in this exact JSON structure:
{{
  "match_score": <number 0-100>,
  "skill_gaps": [<list of 5-10 skills mentioned in JD but missing in resume>],
  "missing_keywords": [<list of 5-10 important keywords from JD not in resume>],
  "strengths": [<list of 3-5 matching qualifications>]
}}"""
        
        response = await openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert at matching resumes with job descriptions."
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.2
        )
        content = response.choices[0].message.content if response.choices else None
        if not content:
            raise HTTPException(status_code=500, detail="Empty AI response")
        
        # Parse JSON from response
        response_text = content.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        result = json.loads(response_text)
        return result
    except Exception as e:
        logging.error(f"JD matching error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"JD matching failed: {str(e)}")

async def generate_interview_questions_with_ai(resume_text: str) -> dict:
    try:
        if openai_client is None:
            raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured")
        
        prompt = f"""Based on this resume, generate relevant interview questions in JSON format:

Resume:
{resume_text[:2000]}

Provide your response in this exact JSON structure:
{{
  "technical": [<list of 8-10 technical questions based on skills and experience>],
  "hr": [<list of 5-7 behavioral/HR questions>],
  "project_based": [<list of 5-7 questions about projects mentioned in resume>]
}}"""
        
        response = await openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert interviewer who creates targeted interview questions."
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.3
        )
        content = response.choices[0].message.content if response.choices else None
        if not content:
            raise HTTPException(status_code=500, detail="Empty AI response")
        
        # Parse JSON from response
        response_text = content.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        result = json.loads(response_text)
        return result
    except Exception as e:
        logging.error(f"Interview question generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Question generation failed: {str(e)}")

# ===== Auth Routes =====
@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = str(uuid.uuid4())
    hashed_pw = hash_password(user_data.password)
    user_doc = {
        "id": user_id,
        "name": user_data.name,
        "email": user_data.email,
        "password": hashed_pw,
        "plan_type": "free",
        "usage_count": 0,
        "credits": 0,
        "subscription_id": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    # Create token
    token = create_access_token({"sub": user_data.email})
    
    return {
        "token": token,
        "user": {
            "id": user_id,
            "name": user_data.name,
            "email": user_data.email,
            "plan_type": "free",
            "usage_count": 0,
            "credits": 0
        }
    }

@api_router.post("/auth/login")
async def login(user_data: UserLogin):
    # Find user
    user = await db.users.find_one({"email": user_data.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    if not verify_password(user_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create token
    token = create_access_token({"sub": user_data.email})
    
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "plan_type": user["plan_type"],
            "usage_count": user["usage_count"],
            "credits": user.get("credits", 0)
        }
    }

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# ===== Resume Routes =====
@api_router.post("/resume/analyze", response_model=ResumeAnalyzeResponse)
async def analyze_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    # Check if user has credits
    if current_user.credits <= 0:
        raise HTTPException(
            status_code=403,
            detail="No credits available. Please purchase credits to continue."
        )
    
    # Validate PDF
    if not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # Extract text
    pdf_bytes = await file.read()
    resume_text = extract_text_from_pdf(pdf_bytes)
    
    if not resume_text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from PDF")
    
    # Analyze with AI
    analysis = await analyze_resume_with_ai(resume_text)
    
    # Save to database
    resume_id = str(uuid.uuid4())
    resume_doc = {
        "id": resume_id,
        "user_id": current_user.id,
        "score": analysis["score"],
        "feedback": analysis,
        "resume_text": resume_text,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.resumes.insert_one(resume_doc)
    
    # Deduct 1 credit from user
    await db.users.update_one(
        {"id": current_user.id},
        {
            "$inc": {
                "credits": -1,
                "usage_count": 1
            }
        }
    )

    
    return ResumeAnalyzeResponse(
        id=resume_id,
        user_id=current_user.id,
        score=analysis["score"],
        feedback=analysis,
        created_at=resume_doc["created_at"]
    )

@api_router.post("/resume/jd-match", response_model=JDMatchResponse)
async def match_jd(
    request: JDMatchRequest,
    current_user: User = Depends(get_current_user)
):
    # Get resume
    resume = await db.resumes.find_one({"id": request.resume_id, "user_id": current_user.id}, {"_id": 0})
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    # Match with AI
    match_result = await match_jd_with_ai(resume["resume_text"], request.job_description)
    
    # Save match result
    match_id = str(uuid.uuid4())
    match_doc = {
        "id": match_id,
        "user_id": current_user.id,
        "resume_id": request.resume_id,
        "jd_match_score": match_result["match_score"],
        "skill_gaps": match_result["skill_gaps"],
        "missing_keywords": match_result["missing_keywords"],
        "job_description": request.job_description,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.jd_matches.insert_one(match_doc)
    
    return JDMatchResponse(
        id=match_id,
        user_id=current_user.id,
        resume_id=request.resume_id,
        jd_match_score=match_result["match_score"],
        skill_gaps=match_result["skill_gaps"],
        missing_keywords=match_result["missing_keywords"],
        created_at=match_doc["created_at"]
    )

@api_router.post("/resume/interview-questions", response_model=InterviewQuestionsResponse)
async def generate_interview_questions(
    request: InterviewQuestionsRequest,
    current_user: User = Depends(get_current_user)
):
    # Get resume
    resume = await db.resumes.find_one({"id": request.resume_id, "user_id": current_user.id}, {"_id": 0})
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    # Generate questions with AI
    questions = await generate_interview_questions_with_ai(resume["resume_text"])
    
    return InterviewQuestionsResponse(**questions)

@api_router.get("/resume/history")
async def get_resume_history(current_user: User = Depends(get_current_user)):
    resumes = await db.resumes.find(
        {"user_id": current_user.id},
        {"_id": 0, "resume_text": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {"resumes": resumes}

# ===== Payment Routes (Razorpay) =====
@api_router.get("/payment/packages")
async def get_payment_packages():
    """Get all available payment packages"""
    return {
        "packages": list(PAYMENT_PACKAGES.values()),
        "razorpay_key_id": RAZORPAY_KEY_ID  # Frontend needs this
    }

@api_router.post("/payment/create-order")
async def create_razorpay_order(
    package_request: PaymentPackageRequest,
    current_user: User = Depends(get_current_user)
):
    """Create Razorpay order for selected package"""
    # Validate package exists
    if package_request.package_id not in PAYMENT_PACKAGES:
        raise HTTPException(status_code=400, detail="Invalid package ID")
    
    # Get package details from server-side definition (NEVER from frontend)
    package = PAYMENT_PACKAGES[package_request.package_id]
    
    try:
        # Create Razorpay order (amount must be in paise - multiply by 100)
        razorpay_order = razorpay_client.order.create({
            "amount": int(package.price * 100),  # Convert to paise
            "currency": package.currency.upper(),
            "payment_capture": 1,  # Auto capture
            "notes": {
                "user_id": current_user.id,
                "user_email": current_user.email,
                "package_id": package.id,
                "package_name": package.name,
                "analysis_type": package.analysis_type
            }
        })
        
        # Create payment transaction record
        payment_id = str(uuid.uuid4())
        payment_doc = {
            "id": payment_id,
            "user_id": current_user.id,
            "user_email": current_user.email,
            "razorpay_order_id": razorpay_order["id"],
            "package_id": package.id,
            "package_name": package.name,
            "amount": package.price,
            "currency": package.currency,
            "payment_status": "created",
            "status": "initiated",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.payment_transactions.insert_one(payment_doc)
        
        return {
            "order_id": razorpay_order["id"],
            "amount": razorpay_order["amount"],
            "currency": razorpay_order["currency"],
            "payment_id": payment_id,
            "key_id": RAZORPAY_KEY_ID
        }
    except Exception as e:
        logging.error(f"Error creating Razorpay order: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create order: {str(e)}")

@api_router.post("/payment/verify")
async def verify_razorpay_payment(
    payment_data: Dict,
    current_user: User = Depends(get_current_user)
):
    """Verify Razorpay payment signature"""
    try:
        razorpay_order_id = payment_data.get("razorpay_order_id")
        razorpay_payment_id = payment_data.get("razorpay_payment_id")
        razorpay_signature = payment_data.get("razorpay_signature")
        
        if not all([razorpay_order_id, razorpay_payment_id, razorpay_signature]):
            raise HTTPException(status_code=400, detail="Missing payment data")
        
        # Verify signature
        generated_signature = hmac.new(
            RAZORPAY_KEY_SECRET.encode(),
            f"{razorpay_order_id}|{razorpay_payment_id}".encode(),
            hashlib.sha256
        ).hexdigest()
        
        if generated_signature != razorpay_signature:
            raise HTTPException(status_code=400, detail="Invalid payment signature")
        
        # Find and update payment transaction
        payment = await db.payment_transactions.find_one({
            "razorpay_order_id": razorpay_order_id,
            "user_id": current_user.id
        })
        
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        # Update payment status
        await db.payment_transactions.update_one(
            {"razorpay_order_id": razorpay_order_id},
            {
                "$set": {
                    "razorpay_payment_id": razorpay_payment_id,
                    "razorpay_signature": razorpay_signature,
                    "payment_status": "paid",
                    "status": "complete",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Grant credit to user
        await db.users.update_one(
            {"id": current_user.id},
            {"$inc": {"credits": 1}}
        )
        
        return {
            "status": "success",
            "message": "Payment verified successfully",
            "payment_id": payment["id"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Payment verification error: {str(e)}")
        raise HTTPException(status_code=500, detail="Payment verification failed")

@api_router.get("/payment/status/{order_id}")
async def get_payment_status(
    order_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get payment status for a Razorpay order"""
    # Check payment in database
    existing_payment = await db.payment_transactions.find_one(
        {"razorpay_order_id": order_id, "user_id": current_user.id},
        {"_id": 0}
    )
    
    if not existing_payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    return {
        "status": existing_payment.get("status"),
        "payment_status": existing_payment.get("payment_status"),
        "package_id": existing_payment.get("package_id"),
        "amount": existing_payment.get("amount")
    }

@api_router.post("/webhook/razorpay")
async def razorpay_webhook(request: Request):
    """Handle Razorpay webhook events"""
    try:
        body_bytes = await request.body()
        signature = request.headers.get("X-Razorpay-Signature", "")
        
        # Verify webhook signature
        try:
            razorpay_client.utility.verify_webhook_signature(
                body_bytes.decode(),
                signature,
                RAZORPAY_KEY_SECRET
            )
        except:
            raise HTTPException(status_code=400, detail="Invalid webhook signature")
        
        # Parse webhook data
        webhook_data = json.loads(body_bytes)
        event = webhook_data.get("event")
        payload = webhook_data.get("payload", {}).get("payment", {}).get("entity", {})
        
        if event == "payment.captured":
            order_id = payload.get("order_id")
            payment_id = payload.get("id")
            
            # Update payment in database
            payment = await db.payment_transactions.find_one({"razorpay_order_id": order_id})
            
            if payment and payment.get("payment_status") != "paid":
                await db.payment_transactions.update_one(
                    {"razorpay_order_id": order_id},
                    {
                        "$set": {
                            "razorpay_payment_id": payment_id,
                            "payment_status": "paid",
                            "status": "complete",
                            "webhook_event": event,
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }
                    }
                )
                
                # Grant credit to user
                user_id = payment.get("user_id")
                if user_id:
                    await db.users.update_one(
                        {"id": user_id},
                        {"$inc": {"credits": 1}}
                    )
        
        return {"status": "success"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Webhook error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ===== Admin Routes =====
@api_router.get("/admin/stats", response_model=AdminStats)
async def get_admin_stats():
    total_users = await db.users.count_documents({})
    free_users = await db.users.count_documents({"plan_type": "free"})
    pro_users = await db.users.count_documents({"plan_type": "pro"})
    total_analyses = await db.resumes.count_documents({})
    
    # Calculate revenue
    payments = await db.payments.find({"status": "success"}).to_list(1000)
    total_revenue = sum(p.get("amount", 0) for p in payments)
    
    return AdminStats(
        total_users=total_users,
        free_users=free_users,
        pro_users=pro_users,
        total_analyses=total_analyses,
        total_revenue=total_revenue
    )

cors_origins_env = os.getenv("CORS_ORIGINS", "")
if cors_origins_env.strip():
    cors_origins = [origin.strip().rstrip("/") for origin in cors_origins_env.split(",") if origin.strip()]
else:
    cors_origins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://hire-ready-ai-lime.vercel.app"
    ]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the router in the main app after middleware setup
app.include_router(api_router)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()