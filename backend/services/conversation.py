from typing import Dict


SESSIONS: Dict[str, dict] = {}


QUESTIONS = {
    "loan_type": "आपको शिक्षा ऋण चाहिए या व्यवसाय/परियोजना ऋण?",
    "loan_required": "आपको कितनी ऋण राशि चाहिए? उदाहरण: 5 लाख रुपये।",
    "business_type": "आप कौन-सा व्यवसाय शुरू करना चाहते हैं? उदाहरण: दुकान, सिलाई, डेयरी, ट्रांसपोर्ट या कोई अन्य व्यवसाय।",
    "education_course": "आप किस पढ़ाई या कोर्स के लिए शिक्षा ऋण चाहते हैं?",
    "income": "आपकी वार्षिक पारिवारिक आय कितनी है? उदाहरण: 5 लाख रुपये।",
    "location": "कृपया अपना शहर या स्थान बताइए ताकि हम आपके पास के चैनल पार्टनर ढूँढ सकें।",
    "tenure_months": "आप कितने महीनों या वर्षों में ऋण चुकाना चाहते हैं? उदाहरण: 3 वर्ष या 36 महीने।"
}


def create_session(session_id: str):

    SESSIONS[session_id] = {
        "loan_type": None,
        "income": None,
        "loan_required": None,
        "business_type": None,
        "education_course": None,
        "location": None,
        "latitude": None,
        "longitude": None,
        "tenure_months": None,
        "current_question": "loan_type",
        "complete": False
    }

    return SESSIONS[session_id]


def get_session(session_id: str):

    return SESSIONS.get(session_id)


def save_answer(session_id: str, field: str, value):

    if session_id not in SESSIONS:
        return None

    SESSIONS[session_id][field] = value

    return SESSIONS[session_id]


def get_next_question(session_id: str):

    session = SESSIONS.get(session_id)

    if not session:
        return None

    loan_type = session["loan_type"]

    if not loan_type:
        return "loan_type"

    if not session["loan_required"]:
        return "loan_required"

    if loan_type == "business" and not session["business_type"]:
        return "business_type"

    if loan_type == "education" and not session["education_course"]:
        return "education_course"

    if not session["income"]:
        return "income"

    if not session["location"]:
        return "location"

    # `.get` keeps conversations started before this field was added working.
    if not session.get("tenure_months"):
        return "tenure_months"

    return None


def get_question_text(field: str):

    return QUESTIONS.get(field)


def mark_complete(session_id: str):

    if session_id in SESSIONS:
        SESSIONS[session_id]["complete"] = True

    return SESSIONS.get(session_id)
