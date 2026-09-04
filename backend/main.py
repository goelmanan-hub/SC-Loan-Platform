import io
import os
import re
import uuid

from typing import List, Optional
from fastapi import FastAPI, HTTPException, Request, UploadFile, File, Form, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from gtts import gTTS

from ai.loan_agent import generate_ai_message, chat_with_loan_agent

from data.schemes import (
    get_all_schemes,
    get_scheme_by_id
)

from models.schemas import (
    SchemeRequest,
    EMIRequest,
    PartnerRequest,
    ReadinessRequest
)

from services.conversation import (
    create_session,
    get_session,
    save_answer,
    get_next_question,
    get_question_text,
    mark_complete
)

from services.recommendation import (
    recommend_scheme
)

from services.emi import (
    calculate_emi
)

from services.partner_router import (
    find_suitable_partners
)

from services.readiness import (
    calculate_loan_readiness
)

from services.ocr_service import (
    extract_text_from_file_bytes,
    classify_and_verify_document,
    evaluate_scheme_document_readiness
)



# =====================================================
# FASTAPI APP
# =====================================================

app = FastAPI(
    title="SC Loan Assistance Platform",
    description="AI-powered SC Loan Assistance MVP",
    version="1.0.0"
)


# =====================================================
# CORS
# =====================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =====================================================
# STATIC FILES & SERVING FRONTEND
# =====================================================

FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../frontend"))

if os.path.exists(FRONTEND_DIR):
    app.mount("/app", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")


# =====================================================
# BASIC ROUTES
# =====================================================

@app.get("/")
def root(request: Request):
    accept_header = request.headers.get("accept", "")
    index_file = os.path.join(FRONTEND_DIR, "index.html")
    if "text/html" in accept_header and os.path.exists(index_file):
        return FileResponse(index_file)

    return {
        "success": True,
        "message": "SC Loan Assistance Platform Backend is running.",
        "docs_url": "/docs",
        "app_url": "/app"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }



# =====================================================
# SCHEME RECOMMENDATION
# =====================================================

@app.post("/api/recommend-scheme")
def recommend_scheme_api(
    request: SchemeRequest
):

    user_data = request.model_dump()

    result = recommend_scheme(
        user_data
    )

    if result.get("success") and result.get("recommended_scheme"):
        readiness = calculate_loan_readiness(
            user_data,
            scheme=result["recommended_scheme"]
        )
        result["readiness"] = readiness

    return result


# =====================================================
# LOAN READINESS SCORE
# =====================================================

@app.post("/api/calculate-readiness")
def calculate_readiness_api(
    request: ReadinessRequest
):
    user_data = request.model_dump()
    scheme = None
    if request.scheme_id:
        scheme = get_scheme_by_id(request.scheme_id)

    readiness = calculate_loan_readiness(
        user_data,
        scheme=scheme
    )

    return {
        "success": True,
        "readiness": readiness
    }


# =====================================================
# DOCUMENT OCR & SCHEME READINESS VERIFICATION
# =====================================================

@app.post("/api/verify-documents")
async def verify_documents_api(
    files: List[UploadFile] = File(...),
    loan_type: Optional[str] = Form("business"),
    scheme_id: Optional[str] = Form(None)
):
    verified_docs = []

    for file in files:
        contents = await file.read()
        extracted_text = extract_text_from_file_bytes(
            contents,
            filename=file.filename or "document.jpg",
            content_type=file.content_type or "application/octet-stream"
        )
        doc_verification = classify_and_verify_document(
            filename=file.filename or "document.jpg",
            text=extracted_text
        )
        verified_docs.append(doc_verification)

    readiness_report = evaluate_scheme_document_readiness(
        uploaded_docs=verified_docs,
        loan_type=loan_type or "business",
        scheme_id=scheme_id
    )

    return {
        "success": True,
        "count": len(verified_docs),
        "documents": verified_docs,
        "readiness_report": readiness_report
    }



# =====================================================
# EMI CALCULATOR
# =====================================================

@app.post("/api/calculate-emi")
def calculate_emi_api(
    request: EMIRequest
):

    result = calculate_emi(
        principal=request.principal,
        annual_interest_rate=request.annual_interest_rate,
        tenure_months=request.tenure_months,
        moratorium_months=request.moratorium_months
    )

    return {
        "success": True,
        "result": result
    }


# =====================================================
# PARTNER FINDER
# =====================================================

@app.post("/api/find-partners")
def find_partners_api(
    request: PartnerRequest
):

    partners = find_suitable_partners(
        latitude=request.latitude,
        longitude=request.longitude,
        loan_type=request.loan_type,
        scheme_id=request.scheme_id
    )

    return {
        "success": True,
        "count": len(partners),
        "partners": partners
    }


# =====================================================
# CREATE AI SESSION
# =====================================================

@app.post("/api/ai/new-session")
def new_ai_session():

    session_id = str(
        uuid.uuid4()
    )

    create_session(
        session_id
    )

    first_question = get_question_text(
        "loan_type"
    )

    ai_message = generate_ai_message(
        first_question
    )

    return {
        "success": True,
        "session_id": session_id,
        "message": ai_message,
        "complete": False
    }


# =====================================================
# CHAT REQUEST MODEL
# =====================================================

class LoanChatRequest(BaseModel):

    session_id: str
    message: str


# =====================================================
# CONVERT USER ANSWERS
# =====================================================

def parse_answer(
    field,
    message
):

    text = message.strip()

    def parse_indian_amount(value):
        normalized = value.translate(str.maketrans("०१२३४५६७८९", "0123456789")).lower().replace(",", "")
        match = re.search(r"\d+(?:\.\d+)?", normalized)
        if not match:
            return None

        amount = float(match.group())
        suffix = normalized[match.end():]
        if any(unit in suffix for unit in ("लाख", "lakh", "lac")):
            amount *= 100000
        elif any(unit in suffix for unit in ("करोड़", "crore")):
            amount *= 10000000
        elif any(unit in suffix for unit in ("हजार", "thousand")):
            amount *= 1000
        return amount

    if field == "loan_type":

        lower = text.lower()

        if (
            "education" in lower
            or "educational" in lower
            or "study" in lower
            or "college" in lower
            or "शिक्षा" in text
            or "पढ़ाई" in text
        ):
            return "education"

        if (
            "business" in lower
            or "project" in lower
            or "shop" in lower
            or "व्यवसाय" in text
            or "बिजनेस" in text
            or "दुकान" in text
        ):
            return "business"

        # Do not let an amount or an unrelated sentence advance the conversation.
        return None

    if field in [
        "income",
        "project_cost",
        "loan_required",
        "tenure_months"
    ]:

        indian_amount = parse_indian_amount(text)
        if indian_amount is not None:
            if field == "tenure_months":
                if "वर्ष" in text or "साल" in text or "year" in lower or "years" in lower:
                    indian_amount *= 12
                return int(indian_amount) if indian_amount > 0 else None
            return indian_amount

        cleaned = (
            text
            .replace(",", "")
            .replace("₹", "")
            .replace("rs", "")
            .replace("Rs.", "")
            .strip()
        )

        try:
            return float(cleaned)

        except ValueError:
            return None

    return text


# =====================================================
# AI LOAN CHAT
# =====================================================

@app.post("/api/ai/loan-chat")
def loan_chat(
    request: LoanChatRequest
):
    session = get_session(
        request.session_id
    )

    if not session:
        raise HTTPException(
            status_code=404,
            detail="Session not found."
        )

    current_field = session.get("current_question")

    # 1. Engage AI Agent to generate natural reply & extract parameters
    agent_result = chat_with_loan_agent(
        session_id=request.session_id,
        user_message=request.message,
        current_session=session
    )

    extracted = agent_result.get("extracted", {})

    # Fallback to deterministic parser if current field wasn't captured
    if current_field and current_field not in extracted:
        direct_parsed = parse_answer(current_field, request.message)
        if direct_parsed is not None:
            extracted[current_field] = direct_parsed

    # Save all extracted values
    for field_name, val in extracted.items():
        if val is not None:
            save_answer(request.session_id, field_name, val)

    # Re-fetch session
    session = get_session(request.session_id)

    # Check if essential fields are collected
    loan_type = session.get("loan_type")
    loan_required = session.get("loan_required")
    business_or_edu = (
        session.get("business_type") if loan_type == "business"
        else session.get("education_course") if loan_type == "education"
        else None
    )
    income = session.get("income")
    location = session.get("location")

    next_field = get_next_question(request.session_id)

    # If all mandatory fields are gathered (or only tenure remains), mark complete
    is_fully_collected = bool(
        loan_type and loan_required and (business_or_edu or (loan_type and income)) and income and location
    )

    # =================================================
    # CONVERSATION COMPLETE
    # =================================================
    if next_field is None or is_fully_collected:
        if not session.get("tenure_months"):
            session["tenure_months"] = 36
            save_answer(request.session_id, "tenure_months", 36)

        session = mark_complete(request.session_id)

        recommendation = recommend_scheme(session)

        emi_result = None
        if recommendation.get("success") and recommendation.get("recommended_scheme"):
            scheme = recommendation["recommended_scheme"]
            emi_result = calculate_emi(
                principal=session["loan_required"],
                annual_interest_rate=scheme["interest_rate"],
                tenure_months=session.get("tenure_months", 36),
                moratorium_months=scheme["moratorium_months"]
            )

        scheme = recommendation.get("recommended_scheme") if recommendation.get("success") else None
        readiness_result = calculate_loan_readiness(
            session,
            scheme=scheme,
            emi_data=emi_result
        )

        completion_message = agent_result.get("reply") or (
            "धन्यवाद! आवश्यक जानकारी मिल गई है। आपकी व्यक्तिगत ऋण योजना की सलाह तैयार है।"
        )
        if emi_result and "EMI" not in completion_message:
            completion_message += f"\n\n📊 **अनुमानित EMI**: ₹{emi_result['monthly_emi']:,.2f}/माह"
        if readiness_result and "Readiness" not in completion_message:
            completion_message += f"\n🎯 **ऋण तैयारी स्कोर**: {readiness_result['score']}/100 ({readiness_result['badge']})"

        return {
            "success": True,
            "complete": True,
            "session_id": request.session_id,
            "message": completion_message,
            "user_data": session,
            "recommendation": recommendation,
            "emi": emi_result,
            "readiness": readiness_result
        }

    # =================================================
    # CONTINUE CONVERSATION
    # =================================================
    session["current_question"] = next_field

    return {
        "success": True,
        "complete": False,
        "session_id": request.session_id,
        "message": agent_result.get("reply"),
        "next_field": next_field
    }


# =====================================================
# GET SCHEMES
# =====================================================

@app.get("/api/schemes")
def get_schemes():

    return {
        "success": True,
        "schemes": get_all_schemes()
    }

@app.get("/api/schemes")
def get_schemes():

    return {
        "success": True,
        "schemes": get_all_schemes()
    }


# =====================================================
# GET SINGLE SCHEME
# =====================================================

@app.get("/api/schemes/{scheme_id}")
def get_scheme(
    scheme_id: str
):
    scheme = get_scheme_by_id(
        scheme_id
    )

    if not scheme:
        raise HTTPException(
            status_code=404,
            detail="Scheme not found."
        )

    return {
        "success": True,
        "scheme": scheme
    }


# =====================================================
# HINDI NATIVE TEXT TO SPEECH (TTS) ENDPOINT
# =====================================================

@app.get("/api/ai/tts")
def text_to_speech_api(
    text: str,
    lang: Optional[str] = "hi"
):
    """
    Generates authentic, crystal-clear spoken Hindi MP3 audio stream for accessibility.
    """
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Text is required")

    # Clean emojis, markdown, and technical tokens for natural Hindi speech
    cleaned = (
        re.sub(r"[\U00010000-\U0010ffff]", "", text)
        .replace("*", "")
        .replace("#", "")
        .replace("_", "")
        .replace("`", "")
        .replace("EMI", "मासिक किस्त")
        .replace("p.a.", "प्रतिवर्ष")
        .replace("₹", "रुपये ")
        .replace("%", " प्रतिशत ")
        .replace("Readiness Score", "ऋण तैयारी स्कोर")
        .strip()
    )

    try:
        tts = gTTS(text=cleaned, lang=lang or "hi", slow=False)
        fp = io.BytesIO()
        tts.write_to_fp(fp)
        fp.seek(0)
        return Response(content=fp.read(), media_type="audio/mpeg")
    except Exception as err:
        print("TTS Generation Error:", err)
        raise HTTPException(status_code=500, detail=str(err))
