from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any, cast
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
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from postgrest.types import CountMethod
import requests

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Helper to require mandatory environment variables (fixes Optional[str] type warnings)
def require_env(name: str) -> str:
    value = os.environ.get(name)
    if value is None or value.strip() == "":
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value

# Supabase connection 
SUPABASE_URL: str = require_env('SUPABASE_URL')
SUPABASE_KEY: str = require_env('SUPABASE_KEY')

# For local dev, disable SSL verification if needed (set DISABLE_SSL_VERIFY=true in .env)
import httpx
from supabase.lib.client_options import ClientOptions

disable_ssl = os.environ.get('DISABLE_SSL_VERIFY', '').lower() == 'true'
if disable_ssl:
    http_client = httpx.Client(verify=False)
    client_options = ClientOptions(
        postgrest_client_timeout=10,
        storage_client_timeout=10,
    )
    # Note: supabase-py doesn't directly support passing httpx client, 
    # so we'll handle SSL errors gracefully in requests
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY, options=client_options)
else:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
JWT_SECRET: str = require_env('JWT_SECRET')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRATION = int(os.environ.get('JWT_EXPIRATION', 86400))

# Razorpay client
RAZORPAY_KEY_ID: str = os.environ.get('RAZORPAY_KEY_ID', '')
RAZORPAY_KEY_SECRET: str = os.environ.get('RAZORPAY_KEY_SECRET', '')
razorpay_client = cast(Any, razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)))

# OpenAI client
def _has_configured_openai_key(api_key: str) -> bool:
    if not api_key:
        return False

    key_lower = api_key.lower()
    placeholder_markers = [
        "your-openai-api-key-here",
        "your-key-here",
        "replace-with",
        "example",
        "test-key",
    ]
    if any(marker in key_lower for marker in placeholder_markers):
        return False

    return api_key.startswith("sk-")


OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '').strip()
OPENAI_ENABLED = _has_configured_openai_key(OPENAI_API_KEY)
openai_client: Optional[AsyncOpenAI] = AsyncOpenAI(api_key=OPENAI_API_KEY) if OPENAI_ENABLED else None


def _mock_resume_analysis(resume_text: str) -> dict:
    words = resume_text.split()
    word_count = len(words)
    resume_lower = resume_text.lower()
    skills_pool = [
        "python", "java", "javascript", "react", "node", "sql", "aws", "azure",
        "docker", "kubernetes", "fastapi", "django", "git", "mongodb", "postgresql"
    ]
    found_skills = [skill for skill in skills_pool if skill in resume_lower]

    score = 55
    if word_count > 350:
        score += 8
    if word_count > 600:
        score += 7
    score += min(len(found_skills) * 2, 20)
    score = max(35, min(score, 92))

    strengths = [
        "Resume contains measurable technical keywords",
        "Experience appears relevant to modern software roles",
        "Overall structure is readable for ATS parsing"
    ]
    weaknesses = [
        "Add more quantified achievements (numbers/impact)",
        "Improve project bullets with clear outcomes",
        "Tailor summary to target role and tech stack"
    ]

    return {
        "score": score,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "keyword_suggestions": [
            "system design", "rest api", "ci/cd", "testing", "microservices", "cloud deployment"
        ],
        "formatting_issues": [
            "Ensure consistent date format across sections",
            "Prefer bullet points over long paragraphs"
        ],
        "section_feedback": {
            "summary": "Keep it role-specific and include years of experience.",
            "experience": "Start each bullet with action verbs and add business impact.",
            "education": "Include relevant coursework/certifications if fresher.",
            "skills": f"Highlight strongest skills first. Detected: {', '.join(found_skills[:8]) if found_skills else 'add more specific technical skills'}."
        },
        "meta": {
            "source": "mock",
            "reason": "OPENAI_API_KEY not configured"
        }
    }


def _mock_jd_match(resume_text: str, job_description: str) -> dict:
    resume_tokens = set(token.strip('.,()[]{}:;!?').lower() for token in resume_text.split() if len(token) > 2)
    jd_tokens = set(token.strip('.,()[]{}:;!?').lower() for token in job_description.split() if len(token) > 2)

    common = resume_tokens.intersection(jd_tokens)
    missing = jd_tokens.difference(resume_tokens)

    jd_size = max(len(jd_tokens), 1)
    match_score = int(min(95, max(25, (len(common) / jd_size) * 100)))

    missing_keywords = sorted([word for word in missing if word.isalpha()])[:10]
    skill_gaps = missing_keywords[:8]

    return {
        "match_score": match_score,
        "skill_gaps": skill_gaps or ["system design", "testing", "cloud"],
        "missing_keywords": missing_keywords or ["communication", "ownership", "optimization"],
        "strengths": [
            "Profile overlaps with several JD keywords",
            "Baseline technical alignment is visible",
            "Can improve match with role-specific terms"
        ],
        "meta": {
            "source": "mock",
            "reason": "OPENAI_API_KEY not configured"
        }
    }


def _mock_interview_questions(target_companies: Optional[List[str]] = None) -> dict:
    def get_company_mock_questions(company: str) -> List[str]:
        normalized = company.strip().lower()

        if "google" in normalized:
            return [
                "How would you design a globally scalable URL shortener like goo.gl?",
                "Explain a time you used data to drive a product or engineering decision.",
                "How would you reduce p95 latency for a high-traffic search API?",
                "Describe one complex algorithmic trade-off you made in a production system.",
            ]

        if "microsoft" in normalized:
            return [
                "How would you design a reliable collaboration feature similar to Teams presence sync?",
                "Describe a situation where you worked cross-functionally to unblock delivery.",
                "How would you improve observability for a cloud service deployed on Azure?",
                "Tell me about a project where backward compatibility influenced your architecture.",
            ]

        if "amazon" in normalized:
            return [
                "Tell me about a time you took ownership of a production issue end-to-end.",
                "How would you design an idempotent order-processing API at scale?",
                "Describe a decision where you had to balance speed of delivery with long-term quality.",
                "What metrics would you track to ensure operational excellence for a new service?",
            ]

        if "meta" in normalized or "facebook" in normalized:
            return [
                "How would you design a feed ranking experiment and evaluate its impact?",
                "Describe a backend optimization that improved user experience at scale.",
                "How would you handle consistency and freshness trade-offs in social graph queries?",
                "Tell me about a technical disagreement and how you resolved it with your team.",
            ]

        if "netflix" in normalized:
            return [
                "How would you design a resilient recommendation microservice for peak traffic?",
                "Describe how you would debug intermittent failures in an event-driven pipeline.",
                "What architecture choices would you make for high availability across regions?",
                "Tell me about a high-impact engineering decision you made under ambiguity.",
            ]

        return [
            f"Why do you want to work at {company}, and how does your profile fit this role?",
            f"Which project from your resume is most relevant to {company}, and why?",
            f"How would you improve one core engineering metric if you joined {company}?",
            f"Describe a challenging problem you solved that reflects {company}'s interview style.",
        ]

    result = {
        "technical": [
            "Explain a project where you improved API performance.",
            "How do you design a scalable backend for high traffic?",
            "What is your approach to writing maintainable tests?",
            "How do you debug memory/performance bottlenecks?",
            "Describe your CI/CD setup in a recent project.",
            "When would you choose SQL over NoSQL and why?",
            "How do you secure authentication and authorization flows?",
            "How do you structure a production-ready FastAPI service?"
        ],
        "hr": [
            "Tell me about a time you handled conflicting priorities.",
            "Describe a challenge where you took ownership end-to-end.",
            "How do you handle feedback during code reviews?",
            "What motivates you in fast-paced engineering teams?",
            "Describe a mistake you made and what you learned."
        ],
        "project_based": [
            "Walk through your most impactful project architecture.",
            "What trade-offs did you make and why?",
            "How did you measure success for that project?",
            "If rebuilding today, what would you change first?",
            "Which part was most complex to deliver?"
        ],
        "meta": {
            "source": "mock",
            "reason": "OPENAI_API_KEY not configured"
        }
    }

    companies = [c.strip() for c in (target_companies or []) if c and c.strip()]
    if not companies:
        companies = ["Google", "Microsoft", "Amazon", "Meta", "Netflix"]

    result["target_companies"] = companies
    result["company_specific"] = {
        company: get_company_mock_questions(company)
        for company in companies
    }

    return result

# Rate limiter
limiter = Limiter(key_func=get_remote_address)

# Create the main app without a prefix
app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, cast(Any, _rate_limit_exceeded_handler))

cors_origins_env = os.environ.get("CORS_ORIGINS", "")
if cors_origins_env.strip():
    cors_origins = [origin.strip().rstrip("/") for origin in cors_origins_env.split(",") if origin.strip()]
else:
    cors_origins = ["https://hire-ready-ai-lime.vercel.app"]

for dev_origin in ["http://localhost:3000", "http://localhost:5173"]:
    if dev_origin not in cors_origins:
        cors_origins.append(dev_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix="/api")

# Friendly root route so visiting "/" is helpful
@app.get("/", tags=["meta"])
def root():
    return {
        "message": "Backend is running",
        "docs": "/docs",
        "health": "/api/health"
    }

# File size limit (2MB)
MAX_FILE_SIZE = 2 * 1024 * 1024  # 2MB in bytes

# Simple health check endpoint
@api_router.get("/health")
def health():
    return {"status": "ok"}

# Supabase connectivity check (pings auth settings endpoint)
@api_router.get("/health/supabase")
def health_supabase():
    auth_settings_url = f"{SUPABASE_URL}/auth/v1/settings"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }
    try:
        resp = requests.get(auth_settings_url, headers=headers, timeout=8)
        return {
            "url": auth_settings_url,
            "status_code": resp.status_code,
            "ok": resp.ok,
            "connected": resp.ok,
            "details": (resp.json() if resp.headers.get("content-type","" ).startswith("application/json") else resp.text)  # type: ignore
        }
    except Exception as e:
        return {"connected": False, "error": str(e)}

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
    remaining_credits: int

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
    remaining_credits: int

class InterviewQuestionsRequest(BaseModel):
    resume_id: str
    target_companies: List[str] = Field(default_factory=list)

class InterviewQuestionsResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    technical: List[str]
    hr: List[str]
    project_based: List[str]
    company_specific: Dict[str, List[str]] = Field(default_factory=dict)
    target_companies: List[str] = Field(default_factory=list)
    remaining_credits: int

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
    credits: int  # Number of credits granted on purchase

# Define fixed pricing packages (NEVER accept prices from frontend)
PAYMENT_PACKAGES = {
    "basic": PaymentPackage(
        id="basic",
        name="Basic Analysis",
        price=20.0,
        currency="inr",
        features=["ATS Score (0-100)", "Section-wise feedback", "Keyword suggestions", "1 Analysis Credit"],
        analysis_type="basic",
        credits=1
    ),
    "detailed": PaymentPackage(
        id="detailed",
        name="Detailed AI + JD Matching",
        price=49.0,
        currency="inr",
        features=["Everything in Basic", "Job Description Matching", "Skill gap analysis", "Missing keywords", "2 Analysis Credits"],
        analysis_type="detailed",
        credits=2
    ),
    "full": PaymentPackage(
        id="full",
        name="Full Pro Analysis",
        price=79.0,
        currency="inr",
        features=["Everything in Detailed", "Interview question generation", "Technical questions", "HR questions", "Project-based questions", "3 Analysis Credits"],
        analysis_type="full",
        credits=3
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
        
        # Query Supabase
        response = supabase.table('users').select('*').eq('email', email).execute()
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=401, detail="User not found")
        
        user_data = response.data[0]
        return User.model_validate(cast(Dict[str, Any], user_data))
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def validate_pdf_file(file_size: int, filename: str):
    """Validate PDF file size and type"""
    if not filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds 2MB limit. Your file is {file_size / (1024*1024):.2f}MB"
        )

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

async def analyze_resume_with_ai(resume_text: str, analysis_type: str = "basic") -> dict:
    """Analyze resume using OpenAI - model selection based on plan type"""
    if openai_client is None:
        return _mock_resume_analysis(resume_text)

    try:
        # Cost optimization: Use appropriate model based on analysis type
        model_map = {
            "basic": "gpt-3.5-turbo",      # ₹20 plan - cheapest
            "detailed": "gpt-4o-mini",    # ₹49 plan - mid-tier
            "full": "gpt-4o"              # ₹79 plan - most capable
        }
        model = model_map.get(analysis_type, "gpt-3.5-turbo")
        
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
            model=model,
            messages=[
                {"role": "system", "content": "You are an expert ATS (Applicant Tracking System) resume analyzer. Provide detailed, actionable feedback. Always respond with valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.3
        )
        
        content_text = response.choices[0].message.content or "{}"
        result = json.loads(content_text)
        return result
    except json.JSONDecodeError as e:
        logging.error(f"JSON parsing error: {str(e)}")
        raise HTTPException(status_code=500, detail="AI returned invalid response format")
    except Exception as e:
        error_msg = str(e).lower()
        if 'api key' in error_msg or '401' in error_msg or 'unauthorized' in error_msg or 'authentication' in error_msg:
            logging.error(f"OpenAI authentication failed with configured key: {str(e)}")
            raise HTTPException(status_code=500, detail="OpenAI API key is invalid or unauthorized")
        logging.error(f"AI analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

async def match_jd_with_ai(resume_text: str, job_description: str, analysis_type: str = "detailed") -> dict:
    """Match resume with job description using OpenAI"""
    if openai_client is None:
        return _mock_jd_match(resume_text, job_description)

    try:
        # Use appropriate model (detailed or full plans only)
        model = "gpt-4o-mini" if analysis_type == "detailed" else "gpt-4o"
        
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
            model=model,
            messages=[
                {"role": "system", "content": "You are an expert at matching resumes with job descriptions. Always respond with valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.3
        )
        
        content_text = response.choices[0].message.content or "{}"
        result = json.loads(content_text)
        return result
    except json.JSONDecodeError as e:
        logging.error(f"JSON parsing error: {str(e)}")
        raise HTTPException(status_code=500, detail="AI returned invalid response format")
    except Exception as e:
        error_msg = str(e).lower()
        if 'api key' in error_msg or '401' in error_msg or 'unauthorized' in error_msg or 'authentication' in error_msg:
            logging.error(f"OpenAI authentication failed with configured key: {str(e)}")
            raise HTTPException(status_code=500, detail="OpenAI API key is invalid or unauthorized")
        logging.error(f"JD matching error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"JD matching failed: {str(e)}")

async def generate_interview_questions_with_ai(resume_text: str, target_companies: Optional[List[str]] = None) -> dict:
    """Generate interview questions using OpenAI - only for full plan"""
    if openai_client is None:
        return _mock_interview_questions(target_companies)

    try:
        # Full plan only - use best model
        model = "gpt-4o"

        companies = [c.strip() for c in (target_companies or []) if c and c.strip()]
        company_instruction = ""
        company_json_instruction = ""
        if companies:
            company_list = ", ".join(companies)
            company_instruction = (
                f"Also tailor company-specific interview questions for these target companies: {company_list}. "
                "Use known interview focus areas and style patterns of each company where possible."
            )
            company_json_instruction = ',\n  "company_specific": {"<company_name>": [<4-6 company-focused questions per company>]}'
        
        prompt = f"""Based on this resume, generate relevant interview questions in JSON format:

Resume:
{resume_text[:2000]}

{company_instruction}

Provide your response in this exact JSON structure:
{{
  "technical": [<list of 8-10 technical questions based on skills and experience>],
  "hr": [<list of 5-7 behavioral/HR questions>],
    "project_based": [<list of 5-7 questions about projects mentioned in resume>]{company_json_instruction}
}}"""
        
        response = await openai_client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "You are an expert interviewer who creates targeted interview questions. Always respond with valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.4
        )
        
        content_text = response.choices[0].message.content or "{}"
        result = json.loads(content_text)
        return result
    except json.JSONDecodeError as e:
        logging.error(f"JSON parsing error: {str(e)}")
        raise HTTPException(status_code=500, detail="AI returned invalid response format")
    except Exception as e:
        error_msg = str(e).lower()
        if 'api key' in error_msg or '401' in error_msg or 'unauthorized' in error_msg or 'authentication' in error_msg:
            logging.error(f"OpenAI authentication failed with configured key: {str(e)}")
            raise HTTPException(status_code=500, detail="OpenAI API key is invalid or unauthorized")
        logging.error(f"Interview question generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Question generation failed: {str(e)}")

# ===== Auth Routes =====
@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    try:
        # Check if user exists
        existing_user = supabase.table('users').select('*').eq('email', user_data.email).execute()
        if existing_user.data and len(existing_user.data) > 0:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Create user
        hashed_pw = hash_password(user_data.password)
        user_doc = {
            "name": user_data.name,
            "email": user_data.email,
            "password": hashed_pw,
            "plan_type": "free",
            "usage_count": 0,
            "credits": 0,
            "subscription_id": None
        }
        
        response = supabase.table('users').insert(user_doc).execute()
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to create user")
        
        created_user = cast(Dict[str, Any], response.data[0])
        user_id = created_user.get('id')
        
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
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Registration error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@api_router.post("/auth/login")
async def login(user_data: UserLogin):
    # Find user
    response = supabase.table('users').select('*').eq('email', user_data.email).execute()
    if not response.data or len(response.data) == 0:
        # Distinguish not-registered vs wrong password for better UX on frontend
        raise HTTPException(status_code=404, detail="User not registered")
    
    user = cast(Dict[str, Any], response.data[0])
    
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
@limiter.limit("10/minute")
async def analyze_resume(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    # Check if user has credits
    if current_user.credits <= 0:
        raise HTTPException(
            status_code=403,
            detail="No credits available. Please purchase credits to continue."
        )
    
    # Read file
    pdf_bytes = await file.read()
    
    # Validate PDF file and size
    validate_pdf_file(len(pdf_bytes), file.filename or '')
    
    # Extract text
    resume_text = extract_text_from_pdf(pdf_bytes)
    
    if not resume_text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from PDF")
    
    # Get user's last payment to determine analysis type
    last_payment_response = supabase.table('payment_transactions').select('*').eq('user_id', current_user.id).eq('payment_status', 'paid').order('created_at', desc=True).limit(1).execute()
    
    analysis_type = "basic"  # default
    if last_payment_response.data and len(last_payment_response.data) > 0:
        payment_row = cast(Dict[str, Any], last_payment_response.data[0])
        analysis_type = str(payment_row.get("package_id", "basic"))
    
    # Analyze with AI using appropriate model based on current active plan
    analysis = await analyze_resume_with_ai(resume_text, analysis_type)
    
    # Save to database
    resume_doc = {
        "user_id": current_user.id,
        "score": analysis["score"],
        "feedback": analysis,
        "resume_text": resume_text,
        "analysis_type": analysis_type
    }
    
    response = supabase.table('resumes').insert(resume_doc).execute()
    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=500, detail="Failed to save resume")
    
    resume_record = cast(Dict[str, Any], response.data[0])
    resume_id = str(resume_record.get('id'))
    
    # Deduct 1 credit from user
    current_credits = current_user.credits - 1
    current_usage = current_user.usage_count + 1
    
    # Update credits in database (CRITICAL: must verify success)
    try:
        update_response = supabase.table('users').update({
            "credits": current_credits,
            "usage_count": current_usage
        }).eq('id', current_user.id).execute()
        
        if not update_response.data:
            logging.error(f"Database update failed for user {current_user.id}. Response: {update_response}")
            raise HTTPException(status_code=500, detail="Failed to deduct credits")
        
        logging.info(f"Credits deducted for user {current_user.id}. New balance: {current_credits}")
    except Exception as e:
        logging.error(f"Error deducting credits: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to deduct credits: {str(e)}")
    
    return ResumeAnalyzeResponse(
        id=resume_id,
        user_id=current_user.id,
        score=analysis["score"],
        feedback=analysis,
        created_at=str(resume_record.get('created_at')),
        remaining_credits=current_credits
    )

@api_router.post("/resume/jd-match", response_model=JDMatchResponse)
@limiter.limit("5/minute")
async def match_jd(
    request: Request,
    request_data: JDMatchRequest,
    current_user: User = Depends(get_current_user)
):
    # Get resume
    response = supabase.table('resumes').select('*').eq('id', request_data.resume_id).eq('user_id', current_user.id).execute()
    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    resume = cast(Dict[str, Any], response.data[0])
    
    # Check user's current active plan (based on latest payment)
    last_payment_response = supabase.table('payment_transactions').select('*').eq('user_id', current_user.id).eq('payment_status', 'paid').order('created_at', desc=True).limit(1).execute()
    
    active_plan = "basic"  # default
    if last_payment_response.data and len(last_payment_response.data) > 0:
        payment_row = cast(Dict[str, Any], last_payment_response.data[0])
        active_plan = str(payment_row.get("package_id", "basic"))
    
    # Check if user has appropriate plan (detailed or full)
    if active_plan == "basic":
        raise HTTPException(
            status_code=403,
            detail="JD matching requires Detailed (₹49) or Full (₹79) plan"
        )
    
    # Check if user already has a JD match for this resume (free on subsequent matches)
    existing_match = supabase.table('jd_matches').select('*').eq('resume_id', request_data.resume_id).eq('user_id', current_user.id).limit(1).execute()
    is_first_match = not (existing_match.data and len(existing_match.data) > 0)
    
    # Check if user has credits (only needed for first match)
    if is_first_match and current_user.credits <= 0:
        raise HTTPException(
            status_code=403,
            detail="No credits available. Please purchase credits to continue."
        )
    
    # Match with AI using current active plan
    match_result = await match_jd_with_ai(resume["resume_text"], request_data.job_description, active_plan)
    
    # Save match result
    match_doc = {
        "user_id": current_user.id,
        "resume_id": request_data.resume_id,
        "jd_match_score": match_result["match_score"],
        "skill_gaps": match_result["skill_gaps"],
        "missing_keywords": match_result["missing_keywords"],
        "job_description": request_data.job_description
    }
    
    response = supabase.table('jd_matches').insert(match_doc).execute()
    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=500, detail="Failed to save match result")
    
    match_record = cast(Dict[str, Any], response.data[0])
    match_id = str(match_record.get('id'))
    
    # Deduct 1 credit only if this is the first match for this resume
    remaining_credits = current_user.credits
    if is_first_match:
        current_credits = current_user.credits - 1
        current_usage = current_user.usage_count + 1
        
        # Update credits in database (CRITICAL: must verify success)
        try:
            update_response = supabase.table('users').update({
                "credits": current_credits,
                "usage_count": current_usage
            }).eq('id', current_user.id).execute()
            
            if not update_response.data:
                logging.error(f"Database update failed for user {current_user.id}. Response: {update_response}")
                raise HTTPException(status_code=500, detail="Failed to deduct credits")
            
            remaining_credits = current_credits
            logging.info(f"Credits deducted for user {current_user.id}. First JD match for resume. New balance: {current_credits}")
        except Exception as e:
            logging.error(f"Error deducting credits: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to deduct credits: {str(e)}")
    else:
        logging.info(f"JD match for resume {request_data.resume_id} - already matched before, no credit deducted")
    
    return JDMatchResponse(
        id=match_id,
        user_id=current_user.id,
        resume_id=request_data.resume_id,
        jd_match_score=match_result["match_score"],
        skill_gaps=match_result["skill_gaps"],
        missing_keywords=match_result["missing_keywords"],
        created_at=str(match_record.get('created_at')),
        remaining_credits=remaining_credits
    )

@api_router.post("/resume/interview-questions", response_model=InterviewQuestionsResponse)
@limiter.limit("3/minute")
async def generate_interview_questions(
    request: Request,
    request_data: InterviewQuestionsRequest,
    current_user: User = Depends(get_current_user)
):
    # Normalize and validate requested companies
    seen: set[str] = set()
    target_companies: List[str] = []
    for company in request_data.target_companies:
        normalized = company.strip()
        key = normalized.lower()
        if normalized and key not in seen:
            seen.add(key)
            target_companies.append(normalized)

    if len(target_companies) > 5:
        raise HTTPException(status_code=400, detail="You can target up to 5 companies at a time")

    # Get resume
    response = supabase.table('resumes').select('*').eq('id', request_data.resume_id).eq('user_id', current_user.id).execute()
    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    resume = cast(Dict[str, Any], response.data[0])
    
    # Check user's current active plan (based on latest payment)
    last_payment_response = supabase.table('payment_transactions').select('*').eq('user_id', current_user.id).eq('payment_status', 'paid').order('created_at', desc=True).limit(1).execute()
    
    active_plan = "basic"  # default
    if last_payment_response.data and len(last_payment_response.data) > 0:
        payment_row = cast(Dict[str, Any], last_payment_response.data[0])
        active_plan = str(payment_row.get("package_id", "basic"))
    
    # Check if user has full plan
    if active_plan != "full":
        raise HTTPException(
            status_code=403,
            detail=f"Interview questions generation requires Full plan (₹79). Current active plan: {active_plan}."
        )
    
    # Check if user already has interview questions for this resume (free on subsequent generations)
    existing_questions = supabase.table('interview_questions').select('*').eq('resume_id', request_data.resume_id).eq('user_id', current_user.id).limit(1).execute()
    is_first_generation = not (existing_questions.data and len(existing_questions.data) > 0)
    
    # Check if user has credits (only needed for first generation)
    if is_first_generation and current_user.credits <= 0:
        raise HTTPException(
            status_code=403,
            detail="No credits available. Please purchase credits to continue."
        )
    
    # For generic generation (no companies), return cached questions without deducting credit.
    # For company-targeted generation, create fresh company-specific questions.
    if not is_first_generation and not target_companies:
        cached_q = cast(Dict[str, Any], existing_questions.data[0])
        questions = {
            "technical": cached_q.get("technical", []),
            "hr": cached_q.get("hr", []),
            "project_based": cached_q.get("project_based", []),
            "company_specific": {},
            "target_companies": []
        }
        questions["remaining_credits"] = current_user.credits
        logging.info(f"Interview questions for resume {request_data.resume_id} - already generated before, no credit deducted")
        return InterviewQuestionsResponse(**questions)
    
    # Generate questions with AI (first time)
    questions = await generate_interview_questions_with_ai(
        str(resume.get("resume_text", "")),
        target_companies=target_companies
    )
    
    # Save interview questions to database
    questions_doc = {
        "user_id": current_user.id,
        "resume_id": request_data.resume_id,
        "technical": questions.get("technical", []),
        "hr": questions.get("hr", []),
        "project_based": questions.get("project_based", [])
    }
    
    if is_first_generation:
        try:
            save_response = supabase.table('interview_questions').insert(questions_doc).execute()
            if not save_response.data:
                logging.error(f"Failed to save interview questions for resume {request_data.resume_id}")
        except Exception as e:
            logging.error(f"Error saving interview questions: {str(e)}")
    
    if is_first_generation:
        # Deduct 1 credit only on first generation
        current_credits = current_user.credits - 1
        current_usage = current_user.usage_count + 1

        # Update credits in database (CRITICAL: must verify success)
        try:
            update_response = supabase.table('users').update({
                "credits": current_credits,
                "usage_count": current_usage
            }).eq('id', current_user.id).execute()

            if not update_response.data:
                logging.error(f"Database update failed for user {current_user.id}. Response: {update_response}")
                raise HTTPException(status_code=500, detail="Failed to deduct credits")

            logging.info(f"Credits deducted for user {current_user.id}. First interview question generation. New balance: {current_credits}")
        except Exception as e:
            logging.error(f"Error deducting credits: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to deduct credits: {str(e)}")
    else:
        current_credits = current_user.credits
    
    # Add remaining credits to response
    if isinstance(questions, dict):
        if not isinstance(questions.get("company_specific"), dict):
            questions["company_specific"] = {}
        questions["target_companies"] = target_companies
        questions["remaining_credits"] = current_credits
    return InterviewQuestionsResponse(**questions)

@api_router.get("/resume/history")
async def get_resume_history(current_user: User = Depends(get_current_user)):
    response = supabase.table('resumes').select('id, user_id, score, feedback, analysis_type, created_at').eq('user_id', current_user.id).order('created_at', desc=True).limit(100).execute()
    
    return {"resumes": response.data}

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
        payment_doc = {
            "user_id": current_user.id,
            "user_email": current_user.email,
            "razorpay_order_id": razorpay_order["id"],
            "package_id": package.id,
            "package_name": package.name,
            "amount": package.price,
            "currency": package.currency,
            "payment_status": "created",
            "status": "initiated"
        }
        
        response = supabase.table('payment_transactions').insert(payment_doc).execute()
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to create payment record")
        
        payment_record = cast(Dict[str, Any], response.data[0])
        payment_id = str(payment_record.get('id'))
        
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
        payment_response = supabase.table('payment_transactions').select('*').eq('razorpay_order_id', razorpay_order_id).eq('user_id', current_user.id).execute()
        
        if not payment_response.data or len(payment_response.data) == 0:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        payment = cast(Dict[str, Any], payment_response.data[0])
        
        # Check if already paid (prevent double credit grant)
        if payment.get("payment_status") == "paid":
            return {
                "status": "success",
                "message": "Payment already verified",
                "payment_id": payment["id"]
            }
        
        # Update payment status
        supabase.table('payment_transactions').update({
            "razorpay_payment_id": razorpay_payment_id,
            "razorpay_signature": razorpay_signature,
            "payment_status": "paid",
            "status": "complete",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq('razorpay_order_id', razorpay_order_id).execute()
        
        # Grant credits based on package (only if not already paid)
        package_id = payment.get("package_id", "basic")
        credits_to_grant = PAYMENT_PACKAGES.get(package_id, PAYMENT_PACKAGES["basic"]).credits
        
        user_response = supabase.table('users').select('credits').eq('id', current_user.id).execute()
        if user_response.data and len(user_response.data) > 0:
            user_row = cast(Dict[str, Any], user_response.data[0])
            current_credits = user_row.get('credits', 0)
            supabase.table('users').update({
                "credits": current_credits + credits_to_grant
            }).eq('id', current_user.id).execute()
        
        return {
            "status": "success",
            "message": "Payment verified successfully",
            "payment_id": str(payment.get("id", ""))
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
    response = supabase.table('payment_transactions').select('*').eq('razorpay_order_id', order_id).eq('user_id', current_user.id).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    existing_payment = cast(Dict[str, Any], response.data[0])
    
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
            payment_response = supabase.table('payment_transactions').select('*').eq('razorpay_order_id', order_id).execute()
            
            if payment_response.data and len(payment_response.data) > 0:
                payment = cast(Dict[str, Any], payment_response.data[0])
                
                if payment.get("payment_status") != "paid":
                    supabase.table('payment_transactions').update({
                        "razorpay_payment_id": payment_id,
                        "payment_status": "paid",
                        "status": "complete",
                        "webhook_event": event,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }).eq('razorpay_order_id', order_id).execute()
                    
                    # Grant credits based on package
                    user_id = payment.get("user_id")
                    package_id = payment.get("package_id", "basic")
                    credits_to_grant = PAYMENT_PACKAGES.get(package_id, PAYMENT_PACKAGES["basic"]).credits
                    
                    if user_id:
                        user_response = supabase.table('users').select('credits').eq('id', user_id).execute()
                        if user_response.data and len(user_response.data) > 0:
                            user_row = cast(Dict[str, Any], user_response.data[0])
                            current_credits = user_row.get('credits', 0)
                            supabase.table('users').update({
                                "credits": current_credits + credits_to_grant
                            }).eq('id', user_id).execute()
        
        return {"status": "success"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Webhook error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ===== Admin Routes =====
@api_router.get("/admin/stats", response_model=AdminStats)
@limiter.limit("30/minute")
async def get_admin_stats(request: Request):
    # Get counts from Supabase
    users_response = supabase.table('users').select('*', count=CountMethod.exact).execute()
    total_users = users_response.count or 0
    
    free_users_response = supabase.table('users').select('*', count=CountMethod.exact).eq('plan_type', 'free').execute()
    free_users = free_users_response.count or 0
    
    pro_users_response = supabase.table('users').select('*', count=CountMethod.exact).eq('plan_type', 'pro').execute()
    pro_users = pro_users_response.count or 0
    
    resumes_response = supabase.table('resumes').select('*', count=CountMethod.exact).execute()
    total_analyses = resumes_response.count or 0
    
    # Calculate revenue from payment_transactions
    payments_response = supabase.table('payment_transactions').select('amount').eq('payment_status', 'paid').execute()
    total_revenue = (
        sum(float(cast(Dict[str, Any], p).get("amount", 0)) for p in payments_response.data)
        if payments_response.data else 0.0
    )
    
    return AdminStats(
        total_users=total_users,
        free_users=free_users,
        pro_users=pro_users,
        total_analyses=total_analyses,
        total_revenue=total_revenue
    )

@api_router.get("/admin/recent-payments")
@limiter.limit("30/minute")
async def get_recent_payments(request: Request, limit: int = 20):
    """Get recent successful payments"""
    response = supabase.table('payment_transactions').select('user_email, package_name, amount, created_at').eq('payment_status', 'paid').order('created_at', desc=True).limit(limit).execute()
    
    return {"payments": response.data}

@api_router.get("/admin/api-usage")
@limiter.limit("30/minute")
async def get_api_usage(request: Request):
    """Get API usage statistics"""
    today = datetime.now(timezone.utc).date()
    today_start = datetime.combine(today, datetime.min.time()).replace(tzinfo=timezone.utc)
    
    # Count analyses by type
    total_analyses_response = supabase.table('resumes').select('*', count=CountMethod.exact).execute()
    total_analyses = total_analyses_response.count or 0
    
    today_analyses_response = supabase.table('resumes').select('*', count=CountMethod.exact).gte('created_at', today_start.isoformat()).execute()
    today_analyses = today_analyses_response.count or 0
    
    # Count by analysis type
    basic_response = supabase.table('resumes').select('*', count=CountMethod.exact).eq('analysis_type', 'basic').execute()
    basic_count = basic_response.count or 0
    
    detailed_response = supabase.table('resumes').select('*', count=CountMethod.exact).eq('analysis_type', 'detailed').execute()
    detailed_count = detailed_response.count or 0
    
    full_response = supabase.table('resumes').select('*', count=CountMethod.exact).eq('analysis_type', 'full').execute()
    full_count = full_response.count or 0
    
    return {
        "total_analyses": total_analyses,
        "today_analyses": today_analyses,
        "by_type": {
            "basic": basic_count,
            "detailed": detailed_count,
            "full": full_count
        }
    }

# Include the router in the main app
app.include_router(api_router)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8000)
logger = logging.getLogger(__name__)