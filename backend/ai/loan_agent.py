import os
import json
import re
from typing import Dict, Any, Optional
from dotenv import load_dotenv

from services.ai_client import get_ai_client
from services.rag_service import retrieve_candidate_schemes, build_rag_scheme_context

load_dotenv()

# Conversation history cache per session
SESSION_HISTORIES: Dict[str, list] = {}

SYSTEM_PROMPT = """
You are "YojanaSetu AI" (योजनासेतु), an empathetic, highly adaptive, and intelligent AI Loan Assistant for Scheduled Caste (SC) beneficiaries seeking government-backed concessional loans (NSFDC / SCA schemes, Stand-Up India).

ADAPTABILITY & COMMUNICATION RULES:
1. 🌐 DYNAMIC LANGUAGE MIRRORING:
   - Respond in the language and style the user prefers (Hindi, English, or conversational Hinglish).
   - If the user communicates in Hindi, respond in polite, natural spoken Hindi (Devanagari script).
   - If the user speaks/types in English, respond in clear, simple English.
   - If the user uses Hinglish, respond in warm, natural conversational Hinglish or simple Hindi.
   - Keep sentences clear, respectful, and easy to understand when heard aloud via Text-to-Speech.

2. 🤝 EMPATHETIC & ADAPTIVE PROBLEM SOLVING:
   - NEVER act like a rigid interrogation questionnaire.
   - If the user asks a question (about schemes, subsidies, interest rates, eligibility, documents, channel partners, or doubts), FIRST answer their question clearly using the provided Official Scheme Knowledge (RAG Context).
   - Then, seamlessly invite them to share any remaining application details if they want to proceed.
   - If the user provides multiple details in one message (e.g., "I need a 2 lakh loan for my tailor shop in Agra"), extract all of them at once.

3. 📑 REQUIRED DOCUMENTS KNOWLEDGE (NSFDC / SCA):
   - 🆔 SC Caste Certificate (जाति प्रमाण पत्र)
   - 📄 Family Income Certificate (आय प्रमाण पत्र)
   - 🪪 Aadhaar Card / Voter ID (पहचान व निवास प्रमाण)
   - 🏦 Bank Passbook with IFSC (बैंक पासबुक)
   - 📋 Project Report & Estimate (for Business) OR 🎓 Admission Letter & Fee Structure (for Education)

4. 🎯 LOAN PARAMETERS TO EXTRACT:
   - loan_type ("education" or "business")
   - loan_required (numeric amount in rupees)
   - business_type (string, e.g. "Tailoring Shop", "Dairy", "Kirana Store")
   - education_course (string, e.g. "B.Tech", "MBA", "Nursing")
   - income (annual family income numeric amount in rupees)
   - location (city/district/state string)
   - tenure_months (number of months, e.g. 36)
   - caste_status ("sc_certified", "sc_pending", or "other")
   - docs_status ("all_ready", "partial_ready", or "basic")
   - experience ("experienced", "moderate", or "fresher")
   - credit_history ("clean", "active_loan", or "defaulter")
"""

def extract_entities_from_text(text: str, current_data: dict, active_field: str = None) -> dict:
    """Deterministic fallback and supplementary extractor for loan parameters and criteria."""
def normalize_text(text: str) -> str:
    if not text:
        return ""
    return text.translate(str.maketrans({
        'ज़': 'ज', 'फ़': 'फ', 'ड़': 'ड', 'ढ़': 'ढ', 'ख़': 'ख', 'ग़': 'ग', 'क़': 'क',
        '०': '0', '१': '1', '२': '2', '३': '3', '४': '4', '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
    }))


def extract_entities_from_text(text: str, current_data: dict, active_field: str = None) -> dict:
    """Deterministic fallback and supplementary extractor for loan parameters and criteria."""
    extracted = {}
    normalized_raw = normalize_text(text)
    lower = normalized_raw.lower()
    cleaned_text = normalized_raw.strip()

    # 1. Loan type extraction
    if not current_data.get("loan_type"):
        if any(w in lower for w in ["education", "study", "college", "course", "degree", "btech", "mbbs", "mba"]) or any(w in normalized_raw for w in ["शिक्षा", "पढ़ाई", "कॉलेज", "कोर्स"]):
            extracted["loan_type"] = "education"
        elif any(w in lower for w in ["business", "shop", "store", "dairy", "tailor", "factory", "transport", "project", "carpet"]) or any(w in normalized_raw for w in ["व्यवसाय", "बिजनेस", "दुकान", "सिलाई", "डेयरी", "कारोबार", "काम", "कारपेट", "कालीन"]):
            extracted["loan_type"] = "business"

    # 2. Criteria: Caste / SC Certificate status
    if any(w in lower for w in ["ऐसी जाति", "एससी", "sc", "अनुसूचित जाति", "दलित", "caste certificate", "जाति प्रमाण पत्र"]):
        if any(w in lower for w in ["nahi hai", "banwana", "pending", "apply kiya"]) or any(w in normalized_raw for w in ["नहीं है", "बनवाना है", "अप्लाई किया"]):
            extracted["caste_status"] = "sc_pending"
        else:
            extracted["caste_status"] = "sc_certified"

    # 3. Criteria: Documents readiness
    if any(w in lower for w in ["all ready", "sab ready", "all documents", "saare documents"]) or any(w in normalized_raw for w in ["सभी दस्तावेज तैयार", "सारे कागज हैं", "सब तैयार है"]):
        extracted["docs_status"] = "all_ready"
    elif any(w in lower for w in ["partial", "kuch documents", "kuch kagaz"]) or any(w in normalized_raw for w in ["कुछ दस्तावेज", "आधे तैयार"]):
        extracted["docs_status"] = "partial_ready"

    # 4. Criteria: Experience / Training
    if any(w in lower for w in ["experience", "trained", "training", "iti", "pmkvy"]) or any(w in normalized_raw for w in ["अनुभव है", "साल का अनुभव", "ट्रेनिंग", "सर्टिफिकेट", "पुराना काम", "दुकान चलाता"]):
        extracted["experience"] = "experienced"
    elif any(w in lower for w in ["fresher", "new", "nayi", "shuru"]) or any(w in normalized_raw for w in ["नया व्यवसाय", "नया काम", "पहली बार", "शुरू करना"]):
        extracted["experience"] = "fresher"

    # 5. Criteria: Credit history / Existing loans
    if any(w in lower for w in ["no loan", "no emi", "clean"]) or any(w in normalized_raw for w in ["कोई लोन नहीं", "कोई कर्ज नहीं", "कोई ईएमआई नहीं"]):
        extracted["credit_history"] = "clean"
        extracted["existing_emi"] = 0.0

    # 6. Numbers / Amounts parsing
    def parse_amount(val):
        normalized = val.lower().replace(",", "")
        match = re.search(r"(\d+(?:\.\d+)?)\s*(लाख|lakh|lac|करोड़|crore|हजार|thousand|k)?", normalized)
        if not match:
            return None
        num = float(match.group(1))
        unit = match.group(2) or ""
        if any(u in unit for u in ["लाख", "lakh", "lac"]):
            num *= 100000
        elif any(u in unit for u in ["करोड़", "crore"]):
            num *= 10000000
        elif any(u in unit for u in ["हजार", "thousand", "k"]):
            num *= 1000
        return num

    parsed_num = parse_amount(normalized_raw)
    if parsed_num:
        if any(w in lower for w in ["income", "आय", "काय", "kamai", "कमाई", "सालाना", "वार्षिक"]) or active_field == "income":
            extracted["income"] = parsed_num
        elif any(w in lower for w in ["tenure", "month", "महीने", "साल", "year"]) or active_field == "tenure_months":
            if "साल" in normalized_raw or "year" in lower:
                extracted["tenure_months"] = int(parsed_num * 12)
            else:
                extracted["tenure_months"] = int(parsed_num)
        elif active_field == "loan_required" or not current_data.get("loan_required"):
            extracted["loan_required"] = parsed_num
        elif not current_data.get("income"):
            extracted["income"] = parsed_num

    INVALID_FILLERS = {
        "मुझे", "मुझे भी", "मुझे एक", "हाँ", "हां", "नहीं", "लोन", "बिजनेस", "व्यवसाय", "काम", "काम करना है",
        "kuch bhi", "yes", "no", "ok", "okay", "loan", "business", "please", "sir", "naam", "pata nahi",
        "karna hai", "chahiye", "loan chahiye", "business chahiye", "ek", "chahiye tha", "karna", "शुरू"
    }

    BUSINESS_KEYWORDS = [
        "shop", "store", "tailor", "tailoring", "dairy", "farming", "kirana", "garment",
        "boutique", "transport", "vehicle", "rickshaw", "e-rickshaw", "taxi", "hotel",
        "restaurant", "stall", "salon", "parlour", "parlor", "repair", "electronics",
        "carpenter", "plumber", "footwear", "handicraft", "poultry", "goat", "dukan", "carpet",
        "दुकान", "सिलाई", "डेयरी", "किराना", "रिक्शा", "बुटीक", "ढाबा", "ब्यूटी पार्लर", "कारपेट", "कालीन"
    ]

    EDU_KEYWORDS = [
        "btech", "b.tech", "mtech", "m.tech", "mba", "bba", "mbbs", "bds", "nursing",
        "bed", "b.ed", "llb", "polytechnic", "iti", "diploma", "degree", "phd", "mca",
        "bca", "college", "university", "बीटेक", "एमबीए", "नर्सिंग", "डिप्लोमा", "आईटीआई"
    ]

    is_question_or_statement = any(w in lower for w in [
        "what", "how", "when", "where", "why", "which", "tell", "explain", "kya", "kaise",
        "kab", "kahan", "kyun", "batao", "bataiye", "document", "documents", "caste", "income",
        "interest", "rate", "subsidy", "eligibility", "?", "क्या", "कैसे", "कब", "कहाँ", "दस्तावेज"
    ])

    def clean_entity_text(val: str) -> str:
        clean = re.sub(r"[।.,!?'\"()_-]", " ", str(val or "")).strip()
        tokens = [t for t in clean.split() if t.lower() not in {"मुझे", "चाहिए", "लोन", "loan", "chahiye", "के", "लिए", "karna", "hai", "karni", "krna", "का", "की", "करना", "है", "बिजनेस", "व्यवसाय", "काम", "शुरू"}]
        res = " ".join(tokens).strip()
        return res if len(res) >= 2 else clean

    # 7. Location regex matcher (e.g., "पानीपत में", "पानीपत में शुरू", "जयपुर में")
    loc_match = re.search(r"([a-zA-Z\u0900-\u097F]{2,20})\s+(?:में|me|mein)\s*(?:शुरू|kholna|kholni|shuru|karna|chalu|rahta|rehta|rahata)?", normalized_raw)
    if loc_match:
        cand = loc_match.group(1).strip()
        if cand.lower() not in INVALID_FILLERS and len(cand) >= 2:
            extracted["location"] = cand

    if not is_question_or_statement:
        if active_field == "business_type" or any(w in lower for w in BUSINESS_KEYWORDS) or extracted.get("loan_type") == "business":
            cleaned = clean_entity_text(cleaned_text)
            if cleaned.lower() not in INVALID_FILLERS and len(cleaned) >= 2 and not parsed_num:
                extracted["business_type"] = cleaned

        if active_field == "education_course" or any(w in lower for w in EDU_KEYWORDS) or extracted.get("loan_type") == "education":
            cleaned = clean_entity_text(cleaned_text)
            if cleaned.lower() not in INVALID_FILLERS and len(cleaned) >= 2 and not parsed_num:
                extracted["education_course"] = cleaned

        if (active_field == "location" or not current_data.get("location")) and not extracted.get("location"):
            if cleaned_text.lower() not in INVALID_FILLERS and len(cleaned_text) >= 2 and not parsed_num:
                extracted["location"] = cleaned_text

    return extracted


def chat_with_loan_agent(session_id: str, user_message: str, current_session: dict) -> dict:
    """
    Interacts with AI LLM (Gemini with multi-model fallback) or adaptive fallback to provide
    natural, empathetic multi-turn conversation and entity extraction.
    """
    from services.ai_client import call_ai_chat_resilient

    if session_id not in SESSION_HISTORIES:
        SESSION_HISTORIES[session_id] = []

    history = SESSION_HISTORIES[session_id]
    active_field = current_session.get("current_question")

    # First extract entities using rule-based helper
    extracted = extract_entities_from_text(user_message, current_session, active_field)

    # Context about collected data so far
    collected_summary = {
        "loan_type": current_session.get("loan_type") or extracted.get("loan_type"),
        "loan_required": current_session.get("loan_required") or extracted.get("loan_required"),
        "business_type": current_session.get("business_type") or extracted.get("business_type"),
        "education_course": current_session.get("education_course") or extracted.get("education_course"),
        "income": current_session.get("income") or extracted.get("income"),
        "location": current_session.get("location") or extracted.get("location"),
        "tenure_months": current_session.get("tenure_months") or extracted.get("tenure_months"),
        "caste_status": current_session.get("caste_status") or extracted.get("caste_status"),
        "docs_status": current_session.get("docs_status") or extracted.get("docs_status"),
        "experience": current_session.get("experience") or extracted.get("experience"),
        "credit_history": current_session.get("credit_history") or extracted.get("credit_history")
    }

    ai_reply = None
    extracted_from_llm = {}

    # Retrieve RAG scheme knowledge context based on current parameters and user message
    rag_candidates = retrieve_candidate_schemes({**collected_summary, "additional_info": user_message}, top_k=2)
    rag_context = build_rag_scheme_context(rag_candidates)

    try:
        instruction = f"""
Current Session State: {json.dumps(collected_summary, ensure_ascii=False)}

Official SC Schemes Knowledge Base (RAG Context):
{rag_context}

User's Input: "{user_message}"

CRITICAL INSTRUCTIONS:
1. Generate an empathetic, human-like response:
   - Acknowledge what the user shared (e.g. location, income, caste certificate, business type).
   - If the user asks a question, answer it factually and warmly using the RAG Context.
   - Mirror the user's language (Hindi, English, or Hinglish).
   - If key application info is still missing, smoothly ask for the next relevant detail.
2. Accurately extract all newly mentioned facts/parameters from the user's message.

Output strictly valid JSON with this structure:
{{
  "reply": "Your conversational response here",
  "extracted": {{
    "loan_type": null,
    "loan_required": null,
    "business_type": null,
    "education_course": null,
    "income": null,
    "location": null,
    "tenure_months": null,
    "caste_status": null,
    "docs_status": null,
    "experience": null,
    "credit_history": null
  }}
}}
"""
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        for turn in history[-6:]:
            messages.append(turn)
        messages.append({"role": "user", "content": instruction})

        raw_text = call_ai_chat_resilient(messages, temperature=0.3, max_tokens=1000)

        if raw_text:
            clean_text = raw_text
            if clean_text.startswith("```"):
                clean_text = re.sub(r"^```(?:json)?\s*", "", clean_text)
                clean_text = re.sub(r"\s*```$", "", clean_text).strip()

            parsed = None
            try:
                parsed = json.loads(clean_text)
            except Exception:
                json_match = re.search(r"\{[\s\S]*\}", clean_text)
                if json_match:
                    try:
                        parsed = json.loads(json_match.group(0))
                    except Exception:
                        pass

            if isinstance(parsed, dict) and "reply" in parsed:
                ai_reply = parsed.get("reply")
                if isinstance(parsed.get("extracted"), dict):
                    extracted_from_llm = {k: v for k, v in parsed["extracted"].items() if v is not None}
            elif clean_text and not clean_text.startswith("{"):
                ai_reply = clean_text

    except Exception as err:
        print("AI Chat Error with client/model:", err)

    # Merge extracted fields
    final_extracted = {**extracted, **extracted_from_llm}

    # Update summary with merged extracted fields
    for k, v in final_extracted.items():
        if v is not None:
            collected_summary[k] = v

    # Fallback reply if AI call failed or returned empty
    if not ai_reply:
        user_msg_lower = user_message.lower()
        if any(w in user_msg_lower for w in ["सही है", "स्कीम सही", "योजना सही", "correct", "right", "valid"]):
            scheme_name = rag_candidates[0]["scheme"].get("name_hi", "अनुशंसित योजना") if rag_candidates else "यह योजना"
            ai_reply = f"हाँ, आपके द्वारा दिए गए विवरण के आधार पर '{scheme_name}' बिल्कुल सही और उपयुक्त है। इसमें NSFDC के तहत रियायती ब्याज दर और सरकारी सहायता उपलब्ध है।"
        elif any(w in user_msg_lower for w in ["डॉक्यूमेंट", "दस्तावेज", "कागजात", "document", "documents"]):
            ai_reply = "इस योजना के लिए मुख्य रूप से जाति प्रमाण पत्र (SC Certificate), आय प्रमाण पत्र, आधार कार्ड, बैंक पासबुक और प्रोजेक्ट रिपोर्ट / कॉलेज एडमिशन लेटर की आवश्यकता होती है।"
        elif not collected_summary.get("loan_type"):
            ai_reply = "नमस्ते! मैं योजनासेतु AI सहायक हूँ। क्या आप शिक्षा ऋण (Education Loan) या व्यवसाय ऋण (Business Loan) के लिए जानकारी चाहते हैं?"
        elif not collected_summary.get("loan_required"):
            ai_reply = "बहुत अच्छा! आपको कितनी ऋण राशि (Loan Amount) की आवश्यकता है? (उदाहरण: 2 लाख रुपये या 5 लाख रुपये)"
        elif collected_summary.get("loan_type") == "business" and not collected_summary.get("business_type"):
            ai_reply = "आप किस प्रकार का व्यवसाय शुरू या विस्तारित करना चाहते हैं? (जैसे: किराना दुकान, सिलाई, डेयरी फार्मिंग आदि)"
        elif collected_summary.get("loan_type") == "education" and not collected_summary.get("education_course"):
            ai_reply = "आप किस कोर्स या पढ़ाई के लिए शिक्षा ऋण लेना चाहते हैं? (जैसे: B.Tech, MBA आदि)"
        elif not collected_summary.get("income"):
            ai_reply = "कृपया अपने परिवार की वार्षिक पारिवारिक आय (Annual Family Income) बताएं।"
        elif not collected_summary.get("location"):
            ai_reply = "कृपया अपना शहर या ज़िला बताएं ताकि हम नजदीकी चैनल पार्टनर की जानकारी दे सकें।"
        elif not collected_summary.get("tenure_months"):
            ai_reply = "आप यह ऋण कितने समय में चुकाना चाहते हैं? (उदाहरण: 3 वर्ष या 36 महीने)"
        else:
            ai_reply = "जी, आपकी सभी जानकारियाँ सुरक्षित हैं। आप इस योजना, ब्याज दर, सब्सिडी या दस्तावेजों के बारे में कोई भी प्रश्न पूछ सकते हैं।"

    # Save to history
    history.append({"role": "user", "content": user_message})
    history.append({"role": "assistant", "content": ai_reply})
    SESSION_HISTORIES[session_id] = history[-10:]

    return {
        "reply": ai_reply,
        "extracted": final_extracted
    }


def generate_ai_message(question: str) -> str:
    """Helper for initial greetings or single prompt rephrasing."""
    client, model_name = get_ai_client()
    if not client:
        return question

    try:
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Beneficiary ko yeh initial question aasan aur aadarpoorvak puchiye (Hindi / English):\n\n{question}"}
            ],
            max_tokens=150,
            temperature=0.6
        )
        content = (response.choices[0].message.content or "").strip()
        return content if content else question
    except Exception as error:
        print("AI Error in generate_ai_message:", error)
        return question
