import os
import re
import uuid

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from ai.loan_agent import generate_ai_message

from data.schemes import (
    get_all_schemes,
    get_scheme_by_id
)

from models.schemas import (
    SchemeRequest,
    EMIRequest,
    PartnerRequest
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

    return result


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


    current_field = session[
        "current_question"
    ]


    answer = parse_answer(
        current_field,
        request.message
    )


    if answer is None:

        question = get_question_text(
            current_field
        )

        clarification = (
            "कृपया शिक्षा ऋण या व्यवसाय ऋण में से एक चुनें। "
            if current_field == "loan_type"
            else "मैं आपकी राशि समझ नहीं पाया। कृपया केवल रकम लिखें, जैसे 5 लाख रुपये। "
            if current_field in {"income", "project_cost", "loan_required"}
            else "कृपया इस प्रश्न का उत्तर दें। "
        )

        return {
            "success": True,
            "message": (
                clarification
                + question
            ),
            "complete": False,
            "session_id": request.session_id
        }


    save_answer(
        request.session_id,
        current_field,
        answer
    )


    # Find next question

    next_field = get_next_question(
        request.session_id
    )


    # =================================================
    # CONVERSATION COMPLETE
    # =================================================

    if next_field is None:

        session = mark_complete(
            request.session_id
        )

        recommendation = recommend_scheme(
            session
        )

        emi_result = None
        if recommendation.get("success") and recommendation.get("recommended_scheme"):
            scheme = recommendation["recommended_scheme"]
            emi_result = calculate_emi(
                principal=session["loan_required"],
                annual_interest_rate=scheme["interest_rate"],
                tenure_months=session.get("tenure_months", 36),
                moratorium_months=scheme["moratorium_months"]
            )

        completion_message = (
            "धन्यवाद। आवश्यक जानकारी मिल गई है। आपकी व्यक्तिगत "
            "ऋण योजना की सलाह तैयार है।"
        )
        if emi_result:
            completion_message += (
                f" अनुमानित मासिक EMI ₹{emi_result['monthly_emi']:,.2f} है।"
            )

        return {
            "success": True,
            "complete": True,
            "session_id": request.session_id,
            "message": completion_message,
            "user_data": session,
            "recommendation": recommendation,
            "emi": emi_result
        }


    # =================================================
    # ASK NEXT QUESTION
    # =================================================

    session["current_question"] = next_field

    question = get_question_text(
        next_field
    )

    ai_message = generate_ai_message(
        question
    )

    return {
        "success": True,
        "complete": False,
        "session_id": request.session_id,
        "message": ai_message,
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
