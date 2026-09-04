import os
import json
import re
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

API_KEY = os.getenv("OPENROUTER_API_KEY")

client = None
if API_KEY:
    try:
        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=API_KEY
        )
    except Exception as e:
        print("Failed to initialize OpenAI client:", e)

# Conversation history cache per session
SESSION_HISTORIES = {}

SYSTEM_PROMPT = """
You are "YojanaSetu AI" (योजनासेतु), an empathetic, intelligent AI Loan Assistant for Scheduled Caste (SC) beneficiaries seeking government-backed concessional loans (NSFDC / SCA schemes).

CRITICAL ACCESSIBILITY REQUIREMENT:
Many beneficiaries cannot read written text. You MUST ALWAYS compose your final conversational response in clear, polite, natural, spoken HINDI (Devanagari script: हिन्दी).
- Even if the user types or speaks in English or Hinglish, reply warmly in simple spoken Hindi so it can be read aloud by voice.
- Use natural Hindi words (e.g., 'ऋण' or 'लोन', 'व्यवसाय' or 'बिजनेस', 'वार्षिक आय', 'शिक्षा ऋण').
- Keep sentences short, respectful, and easy to understand when heard aloud.

REQUIRED DOCUMENTS KNOWLEDGE (NSFDC / SCA Schemes):
1. 🆔 जाति प्रमाण पत्र (SC Caste Certificate) - तहसीलदार या सक्षम प्राधिकारी द्वारा जारी।
2. 📄 आय प्रमाण पत्र (Family Income Certificate) - परिवार की वार्षिक आय का वैध प्रमाण।
3. 🪪 पहचान व निवास प्रमाण - आधार कार्ड (Aadhaar Card) / वोटर आईडी / राशन कार्ड।
4. 🏦 बैंक पासबुक (Bank Account Passbook) - IFSC कोड सहित सक्रिय बैंक खाता।
5. 📋 व्यवसाय ऋण हेतु: परियोजना रिपोर्ट या कोटेशन (Project Report & Estimate Quotation)
6. 🎓 शिक्षा ऋण हेतु: कॉलेज प्रवेश पत्र व फीस संरचना (Admission Letter & Fee Structure)

CONVERSATION GUIDELINES & EDGE CASES:
- If the user asks about DOCUMENTS ("डॉक्यूमेंट्स", "दस्तावेज", "कागजात", "documents needed", "what docs"), ALWAYS list the above 5 essential documents clearly with emojis/bullets in spoken Hindi.
- If the user says "हाँ", "yes", "हाँ, मुझे", "जी हाँ", "हाँजी", "मुझे लोन चाहिए", "loan chahiye", or expresses intent to take a loan:
  DO NOT repeat the initial greeting ("नमस्ते! मैं योजनासेतु AI सहायक हूँ..."). Instead, warmly ask:
  "जी बहुत बढ़िया! कृपया बताइए कि आपको किस प्रकार का ऋण चाहिए—शिक्षा ऋण (Education Loan) या व्यवसाय ऋण (Business Loan)?"
- Never repeat the introductory greeting once conversation has started.

Your Objectives:
1. Warmly assist beneficiaries in clear spoken Hindi.
2. Answer any questions about SC loan schemes, eligibility, required documents, interest rates, and channel partners accurately.
3. Help collect the following information in a natural, friendly conversation:
   - loan_type: "education" or "business"
   - loan_required: loan amount in Rupees (e.g., 200000)
   - business_type (if business loan) or education_course (if education loan)
   - income: annual family income in Rupees (e.g., 300000)
   - location: city/district/state
   - tenure_months: repayment tenure in months (e.g., 36)
"""

def extract_entities_from_text(text: str, current_data: dict, active_field: str = None) -> dict:
    """Deterministic fallback and supplementary extractor for loan parameters."""
    extracted = {}
    lower = text.lower()
    cleaned_text = text.strip()

    # 1. Loan type extraction
    if not current_data.get("loan_type"):
        if any(w in lower for w in ["education", "study", "college", "course", "degree", "btech", "mbbs", "mba"]) or any(w in text for w in ["शिक्षा", "पढ़ाई", "कॉलेज", "कोर्स"]):
            extracted["loan_type"] = "education"
        elif any(w in lower for w in ["business", "shop", "store", "dairy", "tailor", "factory", "transport", "project"]) or any(w in text for w in ["व्यवसाय", "बिजनेस", "दुकान", "सिलाई", "डेयरी", "कारोबार"]):
            extracted["loan_type"] = "business"

    # 2. Numbers / Amounts parsing
    def parse_amount(val):
        normalized = val.translate(str.maketrans("०१२३४५६७८९", "0123456789")).lower().replace(",", "")
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

    parsed_num = parse_amount(text)
    if parsed_num:
        if "income" in lower or "आय" in text or "kamai" in lower or active_field == "income":
            extracted["income"] = parsed_num
        elif "tenure" in lower or "month" in lower or "महीने" in text or "साल" in text or "year" in lower or active_field == "tenure_months":
            if "साल" in text or "year" in lower:
                extracted["tenure_months"] = int(parsed_num * 12)
            else:
                extracted["tenure_months"] = int(parsed_num)
        elif active_field == "loan_required" or not current_data.get("loan_required"):
            extracted["loan_required"] = parsed_num
        elif not current_data.get("income"):
            extracted["income"] = parsed_num

    # 3. Specific contextual field extraction
    INVALID_FILLERS = {
        "मुझे", "मुझे भी", "मुझे एक", "हाँ", "हां", "नहीं", "लोन", "बिजनेस", "व्यवसाय", "काम", "काम करना है",
        "kuch bhi", "yes", "no", "ok", "okay", "loan", "business", "please", "sir", "naam", "pata nahi",
        "karna hai", "chahiye", "loan chahiye", "business chahiye", "ek", "chahiye tha"
    }

    def clean_entity_text(val: str) -> str:
        clean = re.sub(r"[।.,!?'\"()_-]", " ", str(val or "")).strip()
        tokens = [t for t in clean.split() if t.lower() not in {"मुझे", "चाहिए", "लोन", "loan", "chahiye", "के", "लिए", "karna", "hai", "karni", "krna"}]
        res = " ".join(tokens).strip()
        return res if len(res) >= 2 else clean

    if active_field == "business_type" or (current_data.get("loan_type") == "business" and not current_data.get("business_type")):
        # Only accept if not an empty filler word and is meaningful
        if cleaned_text.lower() not in INVALID_FILLERS and len(cleaned_text) >= 2 and not parsed_num:
            extracted["business_type"] = clean_entity_text(cleaned_text)

    if active_field == "education_course" or (current_data.get("loan_type") == "education" and not current_data.get("education_course")):
        if cleaned_text.lower() not in INVALID_FILLERS and len(cleaned_text) >= 2 and not parsed_num:
            extracted["education_course"] = clean_entity_text(cleaned_text)

    if active_field == "location" or (not current_data.get("location") and not parsed_num and len(cleaned_text) >= 2):
        if cleaned_text.lower() not in INVALID_FILLERS and not extracted.get("business_type") and not extracted.get("loan_type"):
            extracted["location"] = cleaned_text

    return extracted


def chat_with_loan_agent(session_id: str, user_message: str, current_session: dict) -> dict:
    """
    Interacts with AI LLM or intelligent fallback to provide natural multi-turn chat
    and update collected session parameters.
    """
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
        "tenure_months": current_session.get("tenure_months") or extracted.get("tenure_months")
    }

    ai_reply = None
    extracted_from_llm = {}

    if client:
        try:
            instruction = f"""
Current Session State: {json.dumps(collected_summary, ensure_ascii=False)}
Active Question Field: {active_field}

User just said: "{user_message}"

Tasks:
1. Generate a friendly, empathetic response in simple spoken Hindi (Devanagari script) acknowledging what they just said and asking for the NEXT missing detail politely.
2. Extract any newly provided values from the user's message:
   - loan_type ("education" or "business")
   - loan_required (number in rupees)
   - business_type (string, e.g. "Kirana Store", "Dairy Farming")
   - education_course (string, e.g. "B.Tech", "MBA")
   - income (annual family income number in rupees)
   - location (city/district/state string)
   - tenure_months (number of months, e.g. 36)

Respond ONLY in valid JSON format with keys:
"reply": "<your conversational response in simple, clear spoken Hindi (Devanagari script: हिन्दी)>",
"extracted": {{
    "loan_type": ... (or null),
    "loan_required": ... (or null),
    "business_type": ... (or null),
    "education_course": ... (or null),
    "income": ... (or null),
    "location": ... (or null),
    "tenure_months": ... (or null)
}}
"""
            messages = [{"role": "system", "content": SYSTEM_PROMPT}]
            for turn in history[-6:]:
                messages.append(turn)
            messages.append({"role": "user", "content": instruction})

            response = client.chat.completions.create(
                model="openrouter/auto",
                messages=messages,
                max_tokens=400,
                temperature=0.6
            )

            raw_text = (response.choices[0].message.content or "").strip()
            
            # Clean markdown JSON block if present
            if raw_text.startswith("```"):
                raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
                raw_text = re.sub(r"\s*```$", "", raw_text)

            try:
                parsed = json.loads(raw_text)
                if isinstance(parsed, dict) and "reply" in parsed:
                    ai_reply = parsed.get("reply")
                    if isinstance(parsed.get("extracted"), dict):
                        extracted_from_llm = {k: v for k, v in parsed["extracted"].items() if v is not None}
            except Exception:
                if raw_text and not raw_text.startswith("{"):
                    ai_reply = raw_text

        except Exception as err:
            print("OpenRouter AI Chat Error:", err)

    # Merge extracted fields
    final_extracted = {**extracted, **extracted_from_llm}

    # Update summary with merged extracted fields to compute next question accurately
    for k, v in final_extracted.items():
        if v is not None:
            collected_summary[k] = v

    # Detect document query intent
    user_msg_clean = user_message.lower().strip()
    is_doc_query = any(w in user_msg_clean for w in [
        "डॉक्यूमेंट", "दस्तावेज", "कागजात", "कागज", "कागज़", "document", "documents",
        "docs", "paper", "papers", "प्रमाण पत्र", "certificate"
    ])

    specific_doc_line = (
        "5. 🎓 **कॉलेज प्रवेश पत्र व फीस विवरण (Admission Letter & Fee Structure)** — शिक्षा ऋण हेतु।"
        if collected_summary.get("loan_type") == "education"
        else "5. 📋 **परियोजना रिपोर्ट या कोटेशन (Project Report & Estimate Quotation)** — व्यवसाय ऋण हेतु।"
    )
    standard_doc_guidance = (
        "इस सरकारी ऋण योजना (NSFDC / SCA) के लिए निम्नलिखित मुख्य दस्तावेजों (Documents) की आवश्यकता होती है:\n\n"
        "1. 🆔 **अनुसूचित जाति प्रमाण पत्र (SC Caste Certificate)** — तहसीलदार या एसडीएम द्वारा जारी।\n"
        "2. 📄 **पारिवारिक आय प्रमाण पत्र (Family Income Certificate)** — वार्षिक पारिवारिक आय का वैध प्रमाण।\n"
        "3. 🪪 **पहचान एवं निवास प्रमाण** — आधार कार्ड (Aadhaar Card), वोटर आईडी या राशन कार्ड।\n"
        "4. 🏦 **बैंक पासबुक (Bank Passbook / Cancelled Cheque)** — IFSC कोड सहित सक्रिय बैंक खाता।\n"
        f"{specific_doc_line}\n\n"
        "💡 आप नीचे दिए गए **'दस्तावेज OCR'** सेक्शन में अपने दस्तावेज अपलोड करके उनकी वैधता व तैयारी की तुरंत जांच कर सकते हैं।"
    )

    # Detect affirmative user intent
    is_affirmative = any(w in user_msg_clean for w in [
        "हाँ", "हां", "जी", "जी हाँ", "जी हां", "हाँजी", "हाजी", "yes", "ha", "haan", "han",
        "yup", "sure", "ok", "okay", "चाहिए", "लोन", "loan"
    ])

    # Fallback reply if AI call failed or didn't return a reply
    if not ai_reply:
        if is_doc_query:
            ai_reply = standard_doc_guidance
        elif not collected_summary.get("loan_type"):
            if is_affirmative:
                ai_reply = "जी बहुत बढ़िया! कृपया बताइए कि आपको किस प्रकार का ऋण चाहिए—शिक्षा ऋण (Education Loan) या व्यवसाय ऋण (Business Loan)?"
            else:
                ai_reply = "नमस्ते! क्या आप शिक्षा ऋण (Education Loan) या व्यवसाय ऋण (Business Loan) के लिए आवेदन करना चाहते हैं?"
        elif not collected_summary.get("loan_required"):
            ai_reply = "बहुत अच्छा! आपको इस कार्य के लिए कितनी ऋण राशि (Loan Amount) की आवश्यकता होगी? (जैसे: 2 लाख रुपये या 5 लाख रुपये)"
        elif collected_summary.get("loan_type") == "business" and not collected_summary.get("business_type"):
            ai_reply = "आप किस प्रकार का व्यवसाय शुरू या विस्तारित करना चाहते हैं? (जैसे: किराना दुकान, सिलाई, डेयरी फार्मिंग आदि)"
        elif collected_summary.get("loan_type") == "education" and not collected_summary.get("education_course"):
            ai_reply = "आप किस कोर्स या पढ़ाई के लिए शिक्षा ऋण लेना चाहते हैं? (जैसे: B.Tech, MBA आदि)"
        elif not collected_summary.get("income"):
            ai_reply = "बहुत बढ़िया! कृपया अपने परिवार की वार्षिक पारिवारिक आय (Annual Family Income) बताएं।"
        elif not collected_summary.get("location"):
            ai_reply = "कृपया अपना शहर या ज़िला बताएं ताकि हम नजदीकी चैनल पार्टनर की जानकारी दे सकें।"
        elif not collected_summary.get("tenure_months"):
            ai_reply = "आप यह ऋण कितने समय में चुकाना चाहते हैं? (उदाहरण: 3 वर्ष या 36 महीने)"
        else:
            ai_reply = "धन्यवाद! आपकी सभी जानकारियाँ प्राप्त हो गई हैं। हम आपके लिए सर्वश्रेष्ठ ऋण योजना और ऋण तैयारी स्कोर तैयार कर रहे हैं।"

    # Post-processing: If user asked for documents, ensure detailed document list is present
    if is_doc_query:
        if not any(w in ai_reply for w in ["जाति प्रमाण पत्र", "Caste Certificate", "Aadhaar", "आधार"]):
            ai_reply = standard_doc_guidance

    # Post-processing: If user responded affirmatively and loan_type is still not set, ensure prompt directly asks for loan type
    elif not collected_summary.get("loan_type") and is_affirmative:
        if "नमस्ते! मैं योजनासेतु AI सहायक हूँ" in ai_reply or "क्या आप शिक्षा" in ai_reply:
            ai_reply = "जी बहुत बढ़िया! कृपया बताइए कि आपको किस प्रकार का ऋण चाहिए—शिक्षा ऋण (Education Loan) या व्यवसाय ऋण (Business Loan)?"

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
    if not client:
        return question

    try:
        response = client.chat.completions.create(
            model="openrouter/auto",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Beneficiary ko yeh question aasan aur aadarpoorvak Hindi me puchiye:\n\n{question}"}
            ],
            max_tokens=150,
            temperature=0.7
        )
        content = (response.choices[0].message.content or "").strip()
        return content if content else question
    except Exception as error:
        print("OpenRouter Error in generate_ai_message:", error)
        return question
