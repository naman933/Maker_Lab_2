from fastapi import FastAPI, APIRouter, UploadFile, File
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
import json
import httpx
from pathlib import Path
from pydantic import BaseModel
from typing import List

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

app = FastAPI()
api_router = APIRouter(prefix="/api")

class AnalyzeRequest(BaseModel):
    description: str

@api_router.get("/")
async def root():
    return {"message": "AQIS API Running"}

@api_router.post("/ai/analyze")
async def analyze_query(req: AnalyzeRequest):
    groq_key = os.environ.get('GROQ_API_KEY', '')
    if not groq_key:
        return {"error": "GROQ_API_KEY not configured"}

    system_msg = "You are an admissions query analyst. Analyze the candidate's query and return a JSON object only, with no extra text."
    user_msg = f'''Analyze this admissions query and return ONLY a valid JSON object with these exact keys:
{{
  "summary": "2-3 sentence plain English summary of what the candidate is asking",
  "intent": "one of: Information Request | Document Submission | Payment Issue | Technical Problem | Eligibility Clarification | Complaint | Other",
  "urgency": "one of: High | Medium | Low",
  "urgencyReason": "one short sentence explaining why this urgency level was assigned",
  "draftResponse": "a polite, professional 3-5 sentence draft reply to the candidate that addresses their query. Do not use placeholders. Write as if from the admissions team."
}}

Candidate Query: {req.description}'''

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {groq_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [
                        {"role": "system", "content": system_msg},
                        {"role": "user", "content": user_msg}
                    ],
                    "temperature": 0.3,
                    "max_tokens": 1024
                }
            )
            data = resp.json()
            content = data.get('choices', [{}])[0].get('message', {}).get('content', '')
            try:
                return json.loads(content)
            except json.JSONDecodeError:
                start = content.find('{')
                end = content.rfind('}') + 1
                if start >= 0 and end > start:
                    return json.loads(content[start:end])
                return {"error": "Could not parse AI response", "raw": content}
    except Exception as e:
        logging.error(f"Groq API error: {e}")
        return {"error": str(e)}

# --- Document Verification Endpoint ---
from docverify import parse_formdata, parse_pdfs_parallel, match_and_verify

@api_router.post("/docverify/verify")
async def verify_documents(
    formdata_file: UploadFile = File(...),
    pdf_files: List[UploadFile] = File(...)
):
    form_bytes = await formdata_file.read()
    form_name = formdata_file.filename or 'data.csv'
    candidates = parse_formdata(form_bytes, form_name)

    if not candidates:
        return {"detail": "No valid candidates found in the uploaded file"}

    pdfs = []
    for pf in pdf_files:
        pdf_bytes = await pf.read()
        pdfs.append({'bytes': pdf_bytes, 'filename': pf.filename or 'unknown.pdf'})

    scorecards = parse_pdfs_parallel(pdfs)
    results = match_and_verify(candidates, scorecards)
    return results

# --- Auth & User Management ---
from auth import auth_router, users_router

app.include_router(api_router)
app.include_router(auth_router)
app.include_router(users_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
