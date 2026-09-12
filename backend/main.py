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
    PartnerSearchRequest,
    ReadinessRequest,
    SendOtpRequest,
    VerifyOtpRequest,
    SaveAssessmentRequest
)

from services.auth_service import (
    send_otp_to_user,
    verify_user_otp
)

from database.db import (
    save_loan_assessment,
    get_user_loan_assessments,
    get_user_by_id,
    get_user_by_phone,
    get_crawler_logs,
    get_all_stored_schemes,
    get_all_stored_partners
)

from services.crawler_service import (
    CRAWLER_SCHEDULER,
    CrawlerOrchestrator
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

from services.partner_rag_service import (
    retrieve_channel_partners,
    geocode_location
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
    result = recommend_scheme(user_data)

    # Only attach readiness if user explicitly provided both credit history and location (no self-assumed data)
    if (
        result.get("success")
        and result.get("recommended_scheme")
        and user_data.get("credit_history")
        and user_data.get("location")
    ):
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

    loc = user_data.get("location")
    lat = user_data.get("latitude")
    lng = user_data.get("longitude")
    resolved_dist = user_data.get("nearest_partner_distance_km")

    if resolved_dist is None and (loc or (lat and lng)):
        try:
            from services.partner_rag_service import retrieve_channel_partners
            partners = retrieve_channel_partners(
                query=loc or "",
                latitude=lat,
                longitude=lng,
                scheme_id=request.scheme_id,
                top_k=1
            )
            if partners and partners[0].get("distance_km") is not None:
                resolved_dist = partners[0]["distance_km"]
        except Exception:
            pass

    readiness = calculate_loan_readiness(
        user_data,
        scheme=scheme,
        nearest_partner_distance_km=resolved_dist
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
# NSFDC CHANNEL PARTNER FINDER & RAG SEARCH
# =====================================================

@app.post("/api/find-partners")
def find_partners_api(
    request: PartnerRequest
):
    """
    Geospatial + RAG router for official NSFDC Channel Partners.
    """
    partners = find_suitable_partners(
        latitude=request.latitude,
        longitude=request.longitude,
        loan_type=request.loan_type,
        scheme_id=request.scheme_id,
        partner_type=request.partner_type,
        query=request.query,
        top_k=request.top_k or 10
    )

    return {
        "success": True,
        "count": len(partners),
        "partners": partners
    }


@app.post("/api/partners/rag-search")
def partner_rag_search_api(
    request: PartnerSearchRequest
):
    """
    Semantic RAG Search across Official NSFDC Channel Partners.
    Supports natural language queries in Hindi, English, and Hinglish.
    """
    from services.partner_rag_service import retrieve_channel_partners

    partners = retrieve_channel_partners(
        query=request.query,
        latitude=request.latitude,
        longitude=request.longitude,
        loan_type=request.loan_type,
        scheme_id=request.scheme_id,
        state=request.state,
        city=request.city,
        partner_type=request.partner_type,
        radius_km=request.radius_km,
        top_k=request.top_k or 10
    )

    return {
        "success": True,
        "query": request.query,
        "count": len(partners),
        "partners": partners
    }


@app.get("/api/partners/all")
def get_all_partners_api():
    """Returns all official NSFDC Channel Partners in the knowledge base."""
    from data.nsfdc_partners_kb import get_all_channel_partners_kb
    partners = get_all_channel_partners_kb()
    return {
        "success": True,
        "count": len(partners),
        "partners": partners
    }


@app.get("/api/partners/states")
def get_partner_states_api():
    """Returns available states, districts, and partner agency types for frontend filtering."""
    from data.nsfdc_partners_kb import get_all_channel_partners_kb
    partners = get_all_channel_partners_kb()

    states = sorted(list(set(p.get("state") for p in partners if p.get("state"))))
    partner_types = sorted(list(set(p.get("type") for p in partners if p.get("type"))))

    return {
        "success": True,
        "states": states,
        "types": partner_types,
        "total_partners": len(partners)
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
    language: Optional[str] = "hi-IN"


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
        session = create_session(request.session_id)

    current_field = session.get("current_question")

    # 1. Engage AI Agent to generate natural reply & extract parameters in user's selected language
    agent_result = chat_with_loan_agent(
        session_id=request.session_id,
        user_message=request.message,
        current_session=session,
        language=request.language
    )

    extracted = agent_result.get("extracted", {})

    # Fallback to deterministic parser if current field wasn't captured
    if current_field and current_field not in extracted:
        direct_parsed = parse_answer(current_field, request.message)
        if direct_parsed is not None:
            extracted[current_field] = direct_parsed

    # Geocode location if available in extracted or session
    from services.partner_rag_service import geocode_location
    user_loc_text = extracted.get("location") or session.get("location")
    if user_loc_text:
        geo_info = geocode_location(user_loc_text)
        if geo_info:
            extracted["latitude"] = geo_info["lat"]
            extracted["longitude"] = geo_info["lng"]
            if geo_info.get("state"):
                extracted["state"] = geo_info["state"]

    # Save all extracted values
    for field_name, val in extracted.items():
        if val is not None:
            save_answer(request.session_id, field_name, val)

    # Re-fetch session
    session = get_session(request.session_id)

    # If coordinates still missing, attempt to geocode current session location
    if session.get("location") and not (session.get("latitude") and session.get("longitude")):
        geo_info = geocode_location(session.get("location"))
        if geo_info:
            session["latitude"] = geo_info["lat"]
            session["longitude"] = geo_info["lng"]
            session["state"] = geo_info.get("state")
            save_answer(request.session_id, "latitude", geo_info["lat"])
            save_answer(request.session_id, "longitude", geo_info["lng"])

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

    # Core parameters needed to evaluate scheme recommendation:
    # 1. loan_type
    # 2. loan_required
    # 3. income
    is_fully_collected = bool(
        loan_type and loan_required and income
    )

    # Readiness parameters (strictly user provided, no assumptions)
    wants_readiness = session.get("wants_readiness_score")
    credit_history = session.get("credit_history")
    user_location = session.get("location")

    # Check if readiness can be verified
    can_evaluate_readiness = bool(
        is_fully_collected and wants_readiness is True and credit_history and user_location
    )

    # Check if this is the initial transition to completion
    already_completed = session.get("is_completed_shown", False)

    recommendation = None
    emi_result = None
    scheme = None
    if is_fully_collected:
        recommendation = recommend_scheme(session)
        if recommendation.get("success") and recommendation.get("recommended_scheme"):
            scheme = recommendation["recommended_scheme"]
            emi_result = calculate_emi(
                principal=session["loan_required"],
                annual_interest_rate=scheme["interest_rate"],
                tenure_months=int(session.get("tenure_months") or 36),
                moratorium_months=scheme.get("moratorium_months", 3)
            )

    # Calculate verified nearest partner distance if location and coordinates exist
    nearest_partner = None
    resolved_dist = None
    if user_location or (session.get("latitude") and session.get("longitude")):
        try:
            rag_query = f"{user_location or ''} {scheme.get('name', '') if scheme else ''}"
            nearest_partners = retrieve_channel_partners(
                query=rag_query,
                scheme_id=scheme.get("id") if scheme else None,
                latitude=session.get("latitude"),
                longitude=session.get("longitude"),
                top_k=1
            )
            if nearest_partners:
                nearest_partner = nearest_partners[0]
                resolved_dist = nearest_partner.get("distance_km")
        except Exception:
            nearest_partner = None
            resolved_dist = None

    readiness_result = None
    if can_evaluate_readiness:
        readiness_result = calculate_loan_readiness(
            session,
            scheme=scheme,
            emi_data=emi_result,
            nearest_partner_distance_km=resolved_dist
        )
        session["readiness_calculated"] = True

    is_en = bool(request.language and request.language.startswith("en"))

    # =================================================
    # INITIAL SCHEME RECOMMENDATION COMPLETION
    # =================================================
    if (next_field is None or is_fully_collected) and not already_completed:
        session["is_completed_shown"] = True
        session["complete"] = True
        if not session.get("tenure_months"):
            session["tenure_months"] = 36
            save_answer(request.session_id, "tenure_months", 36)

        session = mark_complete(request.session_id)

        default_reply = (
            "Thank you! Your personalized NSFDC loan recommendation is ready below."
            if is_en
            else "धन्यवाद! आपके विवरण के आधार पर व्यक्तिगत NSFDC ऋण योजना की सलाह तैयार है।"
        )
        completion_message = agent_result.get("reply") or default_reply

        dist_str = f" ({nearest_partner['distance_km']} km)" if nearest_partner and nearest_partner.get("distance_km") is not None else ""

        # Formatting response with EMI and Partner info
        if is_en:
            if emi_result and "EMI" not in completion_message:
                completion_message += f"\n\n📊 **Estimated Monthly EMI**: ₹{emi_result['monthly_emi']:,.2f}/month"
            if nearest_partner and "Partner" not in completion_message and "Bank" not in completion_message:
                p_phone = f" (📞 {nearest_partner['phone']})" if nearest_partner.get("phone") else ""
                completion_message += f"\n🏛️ **Nearest Official Channel Partner**{dist_str}: {nearest_partner['name']} — {nearest_partner.get('address') or nearest_partner.get('city')}{p_phone}"

            if readiness_result:
                badge_text = readiness_result.get("badge_en") or (
                    "High Readiness" if readiness_result['score'] >= 80 else "Good Readiness" if readiness_result['score'] >= 60 else "Moderate Readiness"
                )
                if "Readiness" not in completion_message and "Score" not in completion_message:
                    completion_message += f"\n\n🎯 **Verified Loan Readiness Score**: {readiness_result['score']}/100 ({badge_text})"
            elif wants_readiness is None and "Readiness" not in completion_message and "Score" not in completion_message:
                completion_message += "\n\n💡 **Would you like to calculate your Loan Readiness Score?**\nTo evaluate your score accurately without self-assumptions, I will need your credit history (clean / existing loans / past defaults) and exact location."
        else:
            if emi_result and "EMI" not in completion_message:
                completion_message += f"\n\n📊 **अनुमानित EMI**: ₹{emi_result['monthly_emi']:,.2f}/माह"
            if nearest_partner and "पार्टनर" not in completion_message and "कार्यालय" not in completion_message:
                p_phone = f" (📞 {nearest_partner['phone']})" if nearest_partner.get("phone") else ""
                completion_message += f"\n🏛️ **निकटतम आधिकारिक चैनल पार्टनर**{dist_str}: {nearest_partner['name']} — {nearest_partner.get('address') or nearest_partner.get('city')}{p_phone}"

            if readiness_result:
                if "तैयारी स्कोर" not in completion_message and "Readiness" not in completion_message:
                    completion_message += f"\n\n🎯 **सत्यापित ऋण तैयारी स्कोर**: {readiness_result['score']}/100 ({readiness_result['badge']})"
            elif wants_readiness is None and "तैयारी स्कोर" not in completion_message and "Readiness" not in completion_message:
                completion_message += "\n\n💡 **क्या आप अपना 'ऋण तैयारी स्कोर' (Loan Readiness Score) भी जानना चाहते हैं?**\nसटीक मूल्यांकन हेतु हमें आपके क्रेडिट इतिहास व स्थान की आवश्यकता होगी ताकि हम निकटतम चैनल पार्टनर की दूरी माप सकें।"

        return {
            "success": True,
            "complete": True,
            "session_id": request.session_id,
            "message": completion_message,
            "user_data": session,
            "recommendation": recommendation,
            "emi": emi_result,
            "readiness": readiness_result,
            "nearest_partner": nearest_partner,
            "user_coordinates": {
                "lat": session.get("latitude"),
                "lng": session.get("longitude"),
                "location": session.get("location"),
                "state": session.get("state")
            } if session.get("latitude") and session.get("longitude") else None
        }

    # =================================================
    # CONTINUOUS CHAT / FOLLOW-UP QUESTIONS / Q&A / READINESS EVALUATION
    # =================================================
    session["current_question"] = next_field

    # If the user is answering readiness opt-in or providing credit history/location in follow-up turns
    chat_message = agent_result.get("reply") or ""
    if can_evaluate_readiness and readiness_result and not session.get("readiness_message_sent"):
        session["readiness_message_sent"] = True
        dist_str = f" ({resolved_dist:.1f} km)" if resolved_dist is not None else ""
        if is_en:
            if "Readiness" not in chat_message and "Score" not in chat_message:
                chat_message += f"\n\n🎯 **Verified Loan Readiness Score**: {readiness_result['score']}/100 ({readiness_result['badge']})\n📍 **Nearest Partner Distance**: {dist_str}"
        else:
            if "तैयारी स्कोर" not in chat_message and "Readiness" not in chat_message:
                chat_message += f"\n\n🎯 **सत्यापित ऋण तैयारी स्कोर**: {readiness_result['score']}/100 ({readiness_result['badge']})\n📍 **निकटतम चैनल पार्टनर दूरी**: {dist_str}"

    return {
        "success": True,
        "complete": bool(is_fully_collected),
        "session_id": request.session_id,
        "message": chat_message,
        "next_field": next_field,
        "user_data": session,
        "recommendation": recommendation,
        "emi": emi_result,
        "readiness": readiness_result,
        "nearest_partner": nearest_partner,
        "user_coordinates": {
            "lat": session.get("latitude"),
            "lng": session.get("longitude"),
            "location": session.get("location"),
            "state": session.get("state")
        } if session.get("latitude") and session.get("longitude") else None
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


# =====================================================
# MULTILINGUAL NATIVE TEXT TO SPEECH (TTS) ENDPOINT
# =====================================================

@app.get("/api/ai/tts")
def text_to_speech_api(
    text: str,
    lang: Optional[str] = "hi"
):
    """
    Generates authentic, crystal-clear spoken multilingual audio stream (Hindi, English, Bengali, Tamil, Telugu, Marathi, Gujarati, Punjabi, Kannada, etc.).
    """
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Text is required")

    target_lang = (lang or "hi").split("-")[0].lower()

    # Clean emojis, markdown, and symbols
    cleaned = (
        re.sub(r"[\U00010000-\U0010ffff]", "", text)
        .replace("*", "")
        .replace("#", "")
        .replace("_", "")
        .replace("`", "")
    )

    if target_lang == "hi":
        cleaned = (
            cleaned
            .replace("EMI", "मासिक किस्त")
            .replace("p.a.", "प्रतिवर्ष")
            .replace("₹", "रुपये ")
            .replace("%", " प्रतिशत ")
            .replace("Readiness Score", "ऋण तैयारी स्कोर")
        )
    elif target_lang == "en":
        cleaned = (
            cleaned
            .replace("p.a.", "per annum")
            .replace("₹", "Rupees ")
            .replace("%", " percent ")
        )
    else:
        cleaned = cleaned.replace("₹", " Rs ").replace("%", " percent ")

    cleaned = cleaned.strip()

    # Map supported gTTS languages
    supported_langs = {"hi", "en", "bn", "ta", "te", "mr", "gu", "pa", "kn", "ml", "ur"}
    gtts_lang = target_lang if target_lang in supported_langs else "hi"

    try:
        tts = gTTS(text=cleaned, lang=gtts_lang, slow=False)
        fp = io.BytesIO()
        tts.write_to_fp(fp)
        fp.seek(0)
        return Response(content=fp.read(), media_type="audio/mpeg")
    except Exception as err:
        print(f"TTS Generation Error for language {gtts_lang}:", err)
        try:
            fallback_lang = "en" if target_lang == "en" else "hi"
            tts = gTTS(text=cleaned, lang=fallback_lang, slow=False)
            fp = io.BytesIO()
            tts.write_to_fp(fp)
            fp.seek(0)
            return Response(content=fp.read(), media_type="audio/mpeg")
        except Exception as fallback_err:
            raise HTTPException(status_code=500, detail=str(fallback_err))


# =====================================================
# AUTHENTICATION & OTP VERIFICATION ENDPOINTS
# =====================================================

@app.post("/api/auth/send-otp")
def send_otp_endpoint(req: SendOtpRequest):
    """
    Sends a 6-digit OTP to the user's phone/email for login/registration.
    """
    phone = req.get_phone()
    if not phone or len(phone) < 10:
        raise HTTPException(status_code=400, detail="कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें।")

    result = send_otp_to_user(phone=phone, email=req.email, name=req.get_name())
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result


@app.post("/api/auth/verify-otp")
def verify_otp_endpoint(req: VerifyOtpRequest):
    """
    Verifies the 6-digit OTP code and registers/authenticates the applicant in SQLite.
    """
    phone = req.get_phone()
    otp_code = req.get_otp()

    if not phone or len(phone) < 10:
        raise HTTPException(status_code=400, detail="कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें।")
    if not otp_code or len(otp_code) < 4:
        raise HTTPException(status_code=400, detail="कृपया वैध OTP कोड दर्ज करें।")

    result = verify_user_otp(
        phone=phone,
        otp_code=otp_code,
        name=req.get_name(),
        email=req.email
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result


# =====================================================
# USER PROFILE & SAVED ASSESSMENTS STORAGE
# =====================================================

@app.post("/api/user/save-assessment")
def save_user_assessment_endpoint(req: SaveAssessmentRequest):
    """
    Stores AI recommended loan scheme, readiness score, and underwriting breakdown in the database.
    """
    phone = req.phone or req.phone_number or ""
    user_id = req.user_id
    if not user_id and phone:
        user = get_user_by_phone(phone)
        if user:
            user_id = user["id"]

    scheme_id = req.scheme_id or req.recommended_scheme_id
    scheme_name = req.scheme_name or req.recommended_scheme_name
    readiness_band = req.readiness_badge or req.readiness_band
    loan_amount = req.loan_amount or req.loan_required
    annual_income = req.annual_income or req.income
    location = req.applicant_location or req.location
    purpose = req.purpose or req.loan_type

    assessment_id = save_loan_assessment(
        user_id=user_id,
        session_id=req.session_id,
        recommended_scheme_id=scheme_id,
        recommended_scheme_name=scheme_name,
        readiness_score=req.readiness_score,
        readiness_band=readiness_band,
        loan_amount=loan_amount,
        annual_income=annual_income,
        tenure_months=req.tenure_months,
        purpose=purpose,
        location=location,
        pillars=req.pillars,
        tips=req.tips
    )

    return {
        "success": True,
        "message": "ऋण सिफारिश व तैयारी स्कोर डेटाबेस में सुरक्षित कर लिया गया है।",
        "assessment_id": assessment_id,
        "user_id": user_id
    }



@app.get("/api/user/profile/{user_id}")
def get_user_profile_endpoint(user_id: str):
    """
    Retrieves the user profile and their complete history of loan assessments.
    """
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    assessments = get_user_loan_assessments(user_id)
    return {
        "success": True,
        "user": user,
        "assessments": assessments
    }


@app.get("/api/user/assessments/{user_id}")
def get_user_assessments_endpoint(user_id: str):
    """
    Retrieves all saved loan recommendations and readiness scores for a user.
    """
    assessments = get_user_loan_assessments(user_id)
    return {
        "success": True,
        "assessments": assessments,
        "count": len(assessments)
    }


# =====================================================
# AUTOMATED CRAWLER & RAG SYNC ENDPOINTS
# =====================================================

class CrawlerConfigRequest(BaseModel):
    interval_seconds: Optional[int] = None
    is_running: Optional[bool] = None


class CrawlerTriggerRequest(BaseModel):
    trigger_source: Optional[str] = "api_manual"


@app.on_event("startup")
async def startup_event():
    """Starts the background automated periodic crawler on application launch."""
    try:
        CRAWLER_SCHEDULER.start()
    except Exception as e:
        print(f"[Main] Notice starting crawler scheduler: {e}")


@app.post("/api/crawler/trigger")
async def trigger_crawler_endpoint(req: Optional[CrawlerTriggerRequest] = None):
    """
    Triggers an immediate live crawl for official schemes and channel partners,
    updates SQLite records, computes diffs, and hot-reloads RAG vector stores.
    """
    trigger_src = req.trigger_source if req and req.trigger_source else "api_manual"
    result = await CRAWLER_SCHEDULER.trigger_now(trigger_source=trigger_src)
    return {
        "success": result.get("status") == "SUCCESS",
        "result": result
    }


@app.get("/api/crawler/status")
def get_crawler_status_endpoint():
    """
    Returns the real-time operational status of the periodic crawler,
    including intervals, timestamps, database entity counts, and official target sources.
    """
    status = CRAWLER_SCHEDULER.get_status()
    return {
        "success": True,
        "status": status
    }


@app.get("/api/crawler/logs")
def get_crawler_logs_endpoint(limit: int = 20):
    """
    Returns historical audit logs of crawler execution runs.
    """
    logs = get_crawler_logs(limit=min(limit, 100))
    return {
        "success": True,
        "count": len(logs),
        "logs": logs
    }


@app.post("/api/crawler/configure")
def configure_crawler_endpoint(config: CrawlerConfigRequest):
    """
    Configures periodic crawling frequency (in seconds) or enables/disables the background scheduler.
    """
    if config.interval_seconds is not None:
        if config.interval_seconds < 10:
            raise HTTPException(status_code=400, detail="Interval must be at least 10 seconds.")
        CRAWLER_SCHEDULER.set_interval(config.interval_seconds)

    if config.is_running is not None:
        if config.is_running and not CRAWLER_SCHEDULER.is_running:
            CRAWLER_SCHEDULER.start()
        elif not config.is_running and CRAWLER_SCHEDULER.is_running:
            CRAWLER_SCHEDULER.stop()

    return {
        "success": True,
        "message": "Crawler configuration updated successfully.",
        "status": CRAWLER_SCHEDULER.get_status()
    }


@app.get("/api/crawler/schemes")
def get_crawled_schemes_endpoint():
    """
    Returns all live crawled schemes currently synchronized in the database.
    """
    schemes = get_all_stored_schemes()
    return {
        "success": True,
        "count": len(schemes),
        "schemes": schemes
    }


@app.get("/api/crawler/partners")
def get_crawled_partners_endpoint():
    """
    Returns all live crawled channel partners currently synchronized in the database.
    """
    partners = get_all_stored_partners()
    return {
        "success": True,
        "count": len(partners),
        "partners": partners
    }


