from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import firebase_admin
from firebase_admin import credentials as fb_credentials, auth as fb_auth

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Initialise Firebase Admin SDK
if not firebase_admin._apps:
    cred_path = os.environ.get('FIREBASE_CREDENTIALS_PATH', '/etc/secrets/firebase-admin.json')
    firebase_admin.initialize_app(fb_credentials.Certificate(cred_path))

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ========================= MODELS =========================

ProfileType = Literal["student", "freelancer", "creator"]

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    profile_type: Optional[ProfileType] = None
    theme: str = "system"
    created_at: datetime

class ProfileUpdate(BaseModel):
    profile_type: Optional[ProfileType] = None
    theme: Optional[str] = None
    name: Optional[str] = None

class Task(BaseModel):
    model_config = ConfigDict(extra="ignore")
    task_id: str = Field(default_factory=lambda: f"task_{uuid.uuid4().hex[:12]}")
    user_id: str
    title: str
    description: Optional[str] = None
    profile_type: ProfileType
    category: Optional[str] = None  # e.g., "study", "deadline", "content", "revision"
    date: Optional[str] = None  # ISO date YYYY-MM-DD
    time: Optional[str] = None  # HH:mm
    duration_min: Optional[int] = None
    status: str = "pending"  # pending, in_progress, done
    priority: str = "normal"  # low, normal, high
    recurring: Optional[str] = None  # none, daily, weekly, monthly
    # Student
    subject_id: Optional[str] = None
    # Freelancer
    client_id: Optional[str] = None
    # Creator
    platform: Optional[str] = None  # platform name (from user's platforms collection)
    # Student - link a task to a specific exam (for revision/prep)
    exam_id: Optional[str] = None
    tags: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    duration_min: Optional[int] = None
    status: Optional[str] = "pending"
    priority: Optional[str] = "normal"
    recurring: Optional[str] = None
    subject_id: Optional[str] = None
    client_id: Optional[str] = None
    platform: Optional[str] = None
    exam_id: Optional[str] = None
    tags: Optional[List[str]] = []

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    duration_min: Optional[int] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    recurring: Optional[str] = None
    subject_id: Optional[str] = None
    client_id: Optional[str] = None
    platform: Optional[str] = None
    exam_id: Optional[str] = None
    tags: Optional[List[str]] = None

class Subject(BaseModel):
    subject_id: str = Field(default_factory=lambda: f"sub_{uuid.uuid4().hex[:10]}")
    user_id: str
    name: str
    color: str = "#10B981"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SubjectCreate(BaseModel):
    name: str
    color: Optional[str] = "#10B981"

class Exam(BaseModel):
    exam_id: str = Field(default_factory=lambda: f"exam_{uuid.uuid4().hex[:10]}")
    user_id: str
    name: str
    subject_ids: List[str] = []
    date: str  # ISO YYYY-MM-DD
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ExamCreate(BaseModel):
    name: str
    subject_ids: Optional[List[str]] = []
    date: str
    notes: Optional[str] = None

class Client(BaseModel):
    client_id: str = Field(default_factory=lambda: f"client_{uuid.uuid4().hex[:10]}")
    user_id: str
    name: str
    company: Optional[str] = None
    email: Optional[str] = None
    color: str = "#3B82F6"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ClientCreate(BaseModel):
    name: str
    company: Optional[str] = None
    email: Optional[str] = None
    color: Optional[str] = "#3B82F6"

class TimeLog(BaseModel):
    log_id: str = Field(default_factory=lambda: f"log_{uuid.uuid4().hex[:10]}")
    user_id: str
    client_id: Optional[str] = None
    task_id: Optional[str] = None
    description: Optional[str] = None
    date: str
    minutes: int
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TimeLogCreate(BaseModel):
    client_id: Optional[str] = None
    task_id: Optional[str] = None
    description: Optional[str] = None
    date: str
    minutes: int

class Payment(BaseModel):
    payment_id: str = Field(default_factory=lambda: f"pay_{uuid.uuid4().hex[:10]}")
    user_id: str
    client_id: Optional[str] = None
    title: str
    amount: float
    currency: str = "USD"
    due_date: str
    status: str = "pending"  # pending, received, overdue
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PaymentCreate(BaseModel):
    client_id: Optional[str] = None
    title: str
    amount: float
    currency: Optional[str] = "USD"
    due_date: str
    status: Optional[str] = "pending"
    notes: Optional[str] = None

class PaymentUpdate(BaseModel):
    status: Optional[str] = None
    amount: Optional[float] = None
    due_date: Optional[str] = None
    title: Optional[str] = None
    notes: Optional[str] = None

class Idea(BaseModel):
    idea_id: str = Field(default_factory=lambda: f"idea_{uuid.uuid4().hex[:10]}")
    user_id: str
    title: str
    notes: Optional[str] = None
    platform: Optional[str] = None
    tags: List[str] = []
    status: str = "new"  # new, planned, published
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class IdeaCreate(BaseModel):
    title: str
    notes: Optional[str] = None
    platform: Optional[str] = None
    tags: Optional[List[str]] = []
    status: Optional[str] = "new"

class IdeaUpdate(BaseModel):
    title: Optional[str] = None
    notes: Optional[str] = None
    platform: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None


class Platform(BaseModel):
    platform_id: str = Field(default_factory=lambda: f"plat_{uuid.uuid4().hex[:10]}")
    user_id: str
    name: str
    color: str = "#F59E0B"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PlatformCreate(BaseModel):
    name: str
    color: Optional[str] = "#F59E0B"


# ========================= AUTH HELPERS =========================

async def get_current_user(request: Request) -> User:
    auth = request.headers.get("Authorization")
    if not auth or not auth.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth.split(" ", 1)[1]
    try:
        decoded = fb_auth.verify_id_token(token)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

    uid = decoded["uid"]
    email = decoded.get("email", "")
    name = decoded.get("name", email)
    picture = decoded.get("picture")

    user_doc = await db.users.find_one({"user_id": uid}, {"_id": 0})
    if not user_doc:
        await db.users.insert_one({
            "user_id": uid,
            "email": email,
            "name": name,
            "picture": picture,
            "profile_type": None,
            "theme": "system",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        user_doc = await db.users.find_one({"user_id": uid}, {"_id": 0})
    else:
        await db.users.update_one({"user_id": uid}, {"$set": {"name": name, "picture": picture}})
        user_doc = await db.users.find_one({"user_id": uid}, {"_id": 0})

    created_at = user_doc.get("created_at")
    if isinstance(created_at, str):
        user_doc["created_at"] = datetime.fromisoformat(created_at)
    return User(**user_doc)


# ========================= AUTH ROUTES =========================

@api_router.get("/auth/me")
async def auth_me(user: User = Depends(get_current_user)):
    return user.model_dump()


@api_router.post("/auth/logout")
async def logout():
    return {"ok": True}


# ========================= USER ROUTES =========================

@api_router.patch("/user/profile")
async def update_profile(update: ProfileUpdate, user: User = Depends(get_current_user)):
    patch = {k: v for k, v in update.model_dump().items() if v is not None}
    if patch:
        await db.users.update_one({"user_id": user.user_id}, {"$set": patch})
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    return user_doc


# ========================= TASKS =========================

def _strip_datetime(doc: dict) -> dict:
    if "created_at" in doc and isinstance(doc["created_at"], datetime):
        doc["created_at"] = doc["created_at"].isoformat()
    return doc


@api_router.get("/tasks")
async def list_tasks(
    user: User = Depends(get_current_user),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    category: Optional[str] = None,
    subject_id: Optional[str] = None,
    client_id: Optional[str] = None,
    platform: Optional[str] = None,
    status: Optional[str] = None,
):
    q: dict = {"user_id": user.user_id}
    if date_from and date_to:
        q["date"] = {"$gte": date_from, "$lte": date_to}
    elif date_from:
        q["date"] = {"$gte": date_from}
    elif date_to:
        q["date"] = {"$lte": date_to}
    if category:
        q["category"] = category
    if subject_id:
        q["subject_id"] = subject_id
    if client_id:
        q["client_id"] = client_id
    if platform:
        q["platform"] = platform
    if status:
        q["status"] = status
    docs = await db.tasks.find(q, {"_id": 0}).sort([("date", 1), ("time", 1)]).to_list(1000)
    return docs


@api_router.post("/tasks")
async def create_task(payload: TaskCreate, user: User = Depends(get_current_user)):
    if not user.profile_type:
        raise HTTPException(status_code=400, detail="Profile type not set")
    task = Task(user_id=user.user_id, profile_type=user.profile_type, **payload.model_dump(exclude_unset=True))
    doc = task.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.tasks.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.patch("/tasks/{task_id}")
async def update_task(task_id: str, payload: TaskUpdate, user: User = Depends(get_current_user)):
    patch = {k: v for k, v in payload.model_dump().items() if v is not None}
    if patch:
        result = await db.tasks.update_one({"task_id": task_id, "user_id": user.user_id}, {"$set": patch})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Task not found")
    doc = await db.tasks.find_one({"task_id": task_id, "user_id": user.user_id}, {"_id": 0})
    return doc


@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user: User = Depends(get_current_user)):
    await db.tasks.delete_one({"task_id": task_id, "user_id": user.user_id})
    return {"ok": True}


# ========================= SUBJECTS =========================

@api_router.get("/subjects")
async def list_subjects(user: User = Depends(get_current_user)):
    docs = await db.subjects.find({"user_id": user.user_id}, {"_id": 0}).to_list(500)
    return docs


@api_router.post("/subjects")
async def create_subject(payload: SubjectCreate, user: User = Depends(get_current_user)):
    sub = Subject(user_id=user.user_id, **payload.model_dump())
    doc = sub.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.subjects.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.delete("/subjects/{subject_id}")
async def delete_subject(subject_id: str, user: User = Depends(get_current_user)):
    await db.subjects.delete_one({"subject_id": subject_id, "user_id": user.user_id})
    return {"ok": True}


# ========================= EXAMS =========================

@api_router.get("/exams")
async def list_exams(user: User = Depends(get_current_user)):
    docs = await db.exams.find({"user_id": user.user_id}, {"_id": 0}).sort("date", 1).to_list(500)
    return docs


@api_router.post("/exams")
async def create_exam(payload: ExamCreate, user: User = Depends(get_current_user)):
    exam = Exam(user_id=user.user_id, **payload.model_dump())
    doc = exam.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.exams.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.delete("/exams/{exam_id}")
async def delete_exam(exam_id: str, user: User = Depends(get_current_user)):
    await db.exams.delete_one({"exam_id": exam_id, "user_id": user.user_id})
    return {"ok": True}


# ========================= CLIENTS =========================

@api_router.get("/clients")
async def list_clients(user: User = Depends(get_current_user)):
    docs = await db.clients.find({"user_id": user.user_id}, {"_id": 0}).to_list(500)
    return docs


@api_router.post("/clients")
async def create_client(payload: ClientCreate, user: User = Depends(get_current_user)):
    c = Client(user_id=user.user_id, **payload.model_dump())
    doc = c.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.clients.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str, user: User = Depends(get_current_user)):
    await db.clients.delete_one({"client_id": client_id, "user_id": user.user_id})
    return {"ok": True}


# ========================= TIME LOGS =========================

@api_router.get("/time-logs")
async def list_time_logs(
    user: User = Depends(get_current_user),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    client_id: Optional[str] = None,
):
    q: dict = {"user_id": user.user_id}
    if date_from and date_to:
        q["date"] = {"$gte": date_from, "$lte": date_to}
    if client_id:
        q["client_id"] = client_id
    docs = await db.time_logs.find(q, {"_id": 0}).sort("date", -1).to_list(1000)
    return docs


@api_router.post("/time-logs")
async def create_time_log(payload: TimeLogCreate, user: User = Depends(get_current_user)):
    log = TimeLog(user_id=user.user_id, **payload.model_dump())
    doc = log.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.time_logs.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.delete("/time-logs/{log_id}")
async def delete_time_log(log_id: str, user: User = Depends(get_current_user)):
    await db.time_logs.delete_one({"log_id": log_id, "user_id": user.user_id})
    return {"ok": True}


# ========================= PAYMENTS =========================

@api_router.get("/payments")
async def list_payments(user: User = Depends(get_current_user)):
    docs = await db.payments.find({"user_id": user.user_id}, {"_id": 0}).sort("due_date", 1).to_list(500)
    return docs


@api_router.post("/payments")
async def create_payment(payload: PaymentCreate, user: User = Depends(get_current_user)):
    p = Payment(user_id=user.user_id, **payload.model_dump())
    doc = p.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.payments.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.patch("/payments/{payment_id}")
async def update_payment(payment_id: str, payload: PaymentUpdate, user: User = Depends(get_current_user)):
    patch = {k: v for k, v in payload.model_dump().items() if v is not None}
    if patch:
        await db.payments.update_one({"payment_id": payment_id, "user_id": user.user_id}, {"$set": patch})
    doc = await db.payments.find_one({"payment_id": payment_id, "user_id": user.user_id}, {"_id": 0})
    return doc


@api_router.delete("/payments/{payment_id}")
async def delete_payment(payment_id: str, user: User = Depends(get_current_user)):
    await db.payments.delete_one({"payment_id": payment_id, "user_id": user.user_id})
    return {"ok": True}


# ========================= IDEAS =========================

@api_router.get("/ideas")
async def list_ideas(user: User = Depends(get_current_user)):
    docs = await db.ideas.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs


@api_router.post("/ideas")
async def create_idea(payload: IdeaCreate, user: User = Depends(get_current_user)):
    idea = Idea(user_id=user.user_id, **payload.model_dump())
    doc = idea.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.ideas.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.patch("/ideas/{idea_id}")
async def update_idea(idea_id: str, payload: IdeaUpdate, user: User = Depends(get_current_user)):
    patch = {k: v for k, v in payload.model_dump().items() if v is not None}
    if patch:
        await db.ideas.update_one({"idea_id": idea_id, "user_id": user.user_id}, {"$set": patch})
    doc = await db.ideas.find_one({"idea_id": idea_id, "user_id": user.user_id}, {"_id": 0})
    return doc


@api_router.delete("/ideas/{idea_id}")
async def delete_idea(idea_id: str, user: User = Depends(get_current_user)):
    await db.ideas.delete_one({"idea_id": idea_id, "user_id": user.user_id})
    return {"ok": True}


# ========================= PLATFORMS (Creator) =========================

@api_router.get("/platforms")
async def list_platforms(user: User = Depends(get_current_user)):
    docs = await db.platforms.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", 1).to_list(200)
    return docs


@api_router.post("/platforms")
async def create_platform(payload: PlatformCreate, user: User = Depends(get_current_user)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name required")
    existing = await db.platforms.find_one({"user_id": user.user_id, "name": name})
    if existing:
        raise HTTPException(status_code=409, detail="Platform already exists")
    plat = Platform(user_id=user.user_id, name=name, color=payload.color or "#F59E0B")
    doc = plat.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.platforms.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.delete("/platforms/{platform_id}")
async def delete_platform(platform_id: str, user: User = Depends(get_current_user)):
    await db.platforms.delete_one({"platform_id": platform_id, "user_id": user.user_id})
    return {"ok": True}


# ========================= DASHBOARD STATS =========================

@api_router.get("/dashboard/stats")
async def dashboard_stats(user: User = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date().isoformat()
    total = await db.tasks.count_documents({"user_id": user.user_id})
    done = await db.tasks.count_documents({"user_id": user.user_id, "status": "done"})
    today_count = await db.tasks.count_documents({"user_id": user.user_id, "date": today})
    pending = await db.tasks.count_documents({"user_id": user.user_id, "status": "pending"})
    return {"total": total, "done": done, "today": today_count, "pending": pending}


@api_router.get("/")
async def root():
    return {"message": "Smart Schedule Planner API"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
