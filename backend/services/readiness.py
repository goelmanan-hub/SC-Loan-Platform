import re
from typing import Dict, Any, Optional
from services.emi import calculate_emi
from services.recommendation import recommend_scheme
from data.schemes import get_all_schemes


def calculate_loan_readiness(
    user_data: Dict[str, Any],
    scheme: Optional[Dict[str, Any]] = None,
    emi_data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Calculates a multi-factor Loan Readiness Score (0 - 100)
    for beneficiaries based on user profile and NSFDC loan requirements.

    Scoring Pillars (100 pts total):
    1. EMI Affordability & Debt Service Burden: 35 points
    2. Scheme Fit & Limit Compliance: 25 points
    3. Purpose Clarity & Project Viability: 20 points
    4. Repayment Tenure Feasibility: 10 points
    5. Location & Channel Partner Accessibility: 10 points
    """
    loan_type = str(user_data.get("loan_type") or "").lower().strip()
    loan_required = float(user_data.get("loan_required") or 0)
    annual_income = float(user_data.get("income") or 0)
    tenure_months = int(user_data.get("tenure_months") or 36)
    location = str(user_data.get("location") or "").strip()
    business_type = str(user_data.get("business_type") or "").strip()
    education_course = str(user_data.get("education_course") or "").strip()

    # Determine recommended scheme if not provided
    if not scheme:
        rec_result = recommend_scheme(user_data)
        if rec_result.get("success") and rec_result.get("recommended_scheme"):
            scheme = rec_result["recommended_scheme"]

    interest_rate = float(scheme.get("interest_rate", 6.5)) if scheme else 7.0
    moratorium_months = int(scheme.get("moratorium_months", 3)) if scheme else 3
    max_scheme_loan = float(scheme.get("max_loan", 5000000)) if scheme else 5000000

    # Calculate EMI if not provided
    if not emi_data and loan_required > 0:
        emi_data = calculate_emi(
            principal=loan_required,
            annual_interest_rate=interest_rate,
            tenure_months=tenure_months,
            moratorium_months=moratorium_months
        )

    monthly_emi = float(emi_data.get("monthly_emi", 0)) if emi_data else 0
    monthly_income = annual_income / 12.0 if annual_income > 0 else 0

    # ==========================================
    # 1. EMI Affordability (Max: 35 points)
    # ==========================================
    # Fixed Obligation to Income Ratio (FOIR)
    affordability_score = 0
    affordability_details = ""

    if monthly_income > 0 and monthly_emi > 0:
        foir = (monthly_emi / monthly_income) * 100
        if foir <= 30:
            affordability_score = 35
            affordability_details = f"उत्कृष्ट (Excellent): EMI आय का केवल {foir:.1f}% है।"
        elif foir <= 45:
            affordability_score = 28
            affordability_details = f"अच्छा (Good): EMI आय का {foir:.1f}% है (अनुशंसित सीमा में)।"
        elif foir <= 60:
            affordability_score = 18
            affordability_details = f"मध्यम (Moderate): EMI आय का {foir:.1f}% है। अवधि बढ़ाने की सलाह दी जाती है।"
        elif foir <= 80:
            affordability_score = 10
            affordability_details = f"उच्च बोझ (High Burden): EMI आय का {foir:.1f}% है। ऋण राशि कम करें या अवधि बढ़ाएँ।"
        else:
            affordability_score = 4
            affordability_details = f"अत्यधिक बोझ (Critical): EMI मासिक आय से अधिक/अत्यधिक है ({foir:.1f}%)।"
    elif monthly_income > 0 and monthly_emi == 0:
        affordability_score = 25
        affordability_details = "ऋण राशि के आधार पर गणना लंबित।"
    else:
        # Default baseline if income not provided
        affordability_score = 15
        affordability_details = "आय विवरण उपलब्ध नहीं है।"

    # ==========================================
    # 2. Scheme Fit & Limit Compliance (Max: 25 points)
    # ==========================================
    scheme_fit_score = 0
    scheme_fit_details = ""

    if scheme and loan_required > 0:
        if loan_required <= max_scheme_loan:
            # Full compliance
            scheme_fit_score = 25
            scheme_fit_details = f"मांगी गई राशि (₹{loan_required:,.0f}) योजना की अधिकतम सीमा (₹{max_scheme_loan:,.0f}) के अनुकूल है।"
        else:
            # Exceeds max loan limit
            scheme_fit_score = 8
            scheme_fit_details = f"मांगी गई राशि योजना की अधिकतम सीमा (₹{max_scheme_loan:,.0f}) से अधिक है।"
    elif loan_required > 0:
        scheme_fit_score = 15
        scheme_fit_details = "उपयुक्त योजना का मिलान जारी है।"
    else:
        scheme_fit_score = 5
        scheme_fit_details = "ऋण राशि दर्ज नहीं है।"

    # ==========================================
    # 3. Purpose Clarity (Max: 20 points)
    # ==========================================
    purpose_score = 0
    purpose_details = ""

    INVALID_FILLERS = {
        "मुझे", "मुझे भी", "मुझे एक", "हाँ", "हां", "नहीं", "लोन", "बिजनेस", "व्यवसाय", "काम", "काम करना है",
        "kuch bhi", "yes", "no", "ok", "okay", "loan", "business", "please", "sir", "naam", "pata nahi",
        "karna hai", "chahiye", "loan chahiye", "business chahiye", "ek"
    }

    BUSINESS_KEYWORDS = [
        "दुकान", "किराना", "सिलाई", "डेयरी", "फार्म", "ट्रांसपोर्ट", "गाड़ी", "वाहन", "मशीन", "सैलून", "ब्यूटी",
        "चाय", "होटल", "ढाबा", "कपड़ा", "जूता", "रिपेयर", "कारोबार", "व्यापार", "दुकानदारी", "वर्कशॉप", "फैक्ट्री",
        "उत्पादन", "ट्रेडिंग", "रेस्टोरेंट", "सब्जी", "फल", "शॉप", "स्टोर", "shop", "store", "tailor", "dairy",
        "farm", "transport", "vehicle", "salon", "hotel", "food", "repair", "service", "cloth", "garment",
        "factory", "manufacturing", "trade", "retail", "kirana"
    ]

    EDUCATION_KEYWORDS = [
        "btech", "b.tech", "mba", "mbbs", "bca", "mca", "bba", "bcom", "b.com", "bsc", "b.sc", "ba", "ma", "msc",
        "diploma", "iti", "polytechnic", "degree", "course", "engineering", "medical", "law", "llb", "phd", "bed",
        "बीटेक", "एमबीए", "डिप्लोमा", "इंजीनियरिंग", "मेडिकल", "नर्सिंग", "कॉलेज", "विश्वविद्यालय", "पढ़ाई", "शिक्षा"
    ]

    if loan_type == "education":
        clean_edu = re.sub(r"[।.,!?'\"()_-]", "", education_course).lower().strip()
        if not clean_edu or clean_edu in INVALID_FILLERS or len(clean_edu) < 3 or all(w in INVALID_FILLERS for w in clean_edu.split()):
            purpose_score = 4
            purpose_details = f"शिक्षा उद्देश्य अस्पष्ट है: '{education_course}'। कृपया कॉलेज/कोर्स का नाम दर्ज करें।"
        elif any(k in clean_edu for k in EDUCATION_KEYWORDS):
            purpose_score = 20
            purpose_details = f"शिक्षा उद्देश्य स्पष्ट एवं मान्यता प्राप्त है: '{education_course}'"
        else:
            purpose_score = 10
            purpose_details = f"सामान्य शिक्षा विवरण दर्ज: '{education_course}'"

    elif loan_type == "business":
        clean_biz = re.sub(r"[।.,!?'\"()_-]", "", business_type).lower().strip()
        if not clean_biz or clean_biz in INVALID_FILLERS or len(clean_biz) < 3 or all(w in INVALID_FILLERS for w in clean_biz.split()):
            purpose_score = 4
            purpose_details = f"व्यवसाय उद्देश्य अस्पष्ट है: '{business_type}'। कृपया विशिष्ट व्यापार (जैसे किराना, डेयरी) दर्ज करें।"
        elif any(k in clean_biz for k in BUSINESS_KEYWORDS):
            purpose_score = 20
            purpose_details = f"व्यवसाय उद्देश्य स्पष्ट एवं व्यावहारिक है: '{business_type}'"
        elif len(clean_biz.split()) >= 2:
            purpose_score = 10
            purpose_details = f"सामान्य व्यवसाय विवरण: '{business_type}'"
        else:
            purpose_score = 4
            purpose_details = f"अस्पष्ट व्यवसाय उद्देश्य: '{business_type}'"
    else:
        purpose_score = 4
        purpose_details = "ऋण का उद्देश्य या प्रकार अनिर्धारित है।"

    # ==========================================
    # 4. Tenure Feasibility (Max: 10 points)
    # ==========================================
    tenure_score = 0
    tenure_details = ""

    if 24 <= tenure_months <= 84:
        tenure_score = 10
        tenure_details = f"पुनर्भुगतान अवधि ({tenure_months} माह) अत्यंत संतुलित है।"
    elif 12 <= tenure_months < 24:
        tenure_score = 7
        tenure_details = f"कम अवधि ({tenure_months} माह) से EMI थोड़ी बढ़ सकती है।"
    elif tenure_months > 84:
        tenure_score = 6
        tenure_details = f"लंबी अवधि ({tenure_months} माह) से कुल ब्याज भुगतान बढ़ेगा।"
    else:
        tenure_score = 5
        tenure_details = f"मानक अवधि ({tenure_months} माह) निर्धारित।"

    # ==========================================
    # 5. Location & Channel Partner Accessibility (Max: 10 points)
    # ==========================================
    accessibility_score = 0
    accessibility_details = ""

    if location and len(location.strip()) >= 2:
        accessibility_score = 10
        accessibility_details = f"स्थान दर्ज है ({location}) - निकटतम पार्टनर बैंक/एजेंसी से सत्यापन संभव।"
    else:
        accessibility_score = 4
        accessibility_details = "स्थान विवरण दर्ज नहीं है।"

    # ==========================================
    # TOTAL SCORE & CATEGORIZATION
    # ==========================================
    total_score = affordability_score + scheme_fit_score + purpose_score + tenure_score + accessibility_score
    
    # Financial guardrails for realistic underwriting readiness
    if monthly_income > 0 and monthly_emi > 0:
        foir = (monthly_emi / monthly_income) * 100
        if foir > 200:
            total_score = min(total_score, 35)
        elif foir > 100:
            total_score = min(total_score, 45)
        elif foir > 70:
            total_score = min(total_score, 65)

    if scheme and loan_required > max_scheme_loan:
        total_score = min(total_score, 40)

    total_score = max(0, min(100, int(round(total_score))))

    if total_score >= 80:
        band = "EXCELLENT"
        badge_hi = "उत्कृष्ट तैयारी (High Readiness)"
        status_color = "#2e7d32"  # Green
        summary = "आपका आवेदन NSFDC ऋण पात्रता के अत्यंत अनुकूल है। ऋण स्वीकृति की संभावना अधिक है।"

    elif total_score >= 60:
        band = "GOOD"
        badge_hi = "अच्छी तैयारी (Good Readiness)"
        status_color = "#0072bc"  # Blue
        summary = "आपकी प्राथमिक प्रोफाइल उपयुक्त है। आवश्यक दस्तावेजों के साथ आवेदन आगे बढ़ाएँ।"
    elif total_score >= 40:
        band = "MODERATE"
        badge_hi = "मध्यम तैयारी (Moderate Readiness)"
        status_color = "#e65100"  # Orange
        summary = "प्रोफाइल में कुछ सुधार (जैसे अवधि बढ़ाना या राशि संतुलित करना) से स्वीकृति आसान होगी।"
    else:
        band = "NEEDS_IMPROVEMENT"
        badge_hi = "सुधार आवश्यक (Needs Improvement)"
        status_color = "#c62828"  # Red
        summary = "आय के अनुपात में EMI का बोझ अधिक है या योजना सीमा का उल्लंघन है। विवरण समायोजित करें।"

    # Actionable suggestions / Tips
    tips = []
    if affordability_score < 25:
        tips.append("मासिक EMI कम करने के लिए ऋण अवधि (Tenure) को 3 से 5 वर्ष तक बढ़ाएँ।")
    if scheme_fit_score < 20:
        tips.append(f"चयनित योजना ({scheme.get('name', 'NSFDC') if scheme else 'योजना'}) की अधिकतम सीमा के भीतर ऋण राशि रखें।")
    if purpose_score < 15:
        tips.append("व्यवसाय योजना (Project Report) या कॉलेज एडमिशन विवरण को स्पष्ट रूप से तैयार रखें।")
    if accessibility_score < 8:
        tips.append("अपने निकटतम स्टेट चैनलाइजिंग एजेंसी (SCA) या बैंक शाखा की जानकारी जोड़ें।")

    if not tips:
        tips.append("आपकी ऋण तत्परता बहुत अच्छी है। सभी मूल प्रमाण पत्र सत्यापन के लिए तैयार रखें।")

    # Document Checklist based on profile
    documents = [
        {"name": "जाति प्रमाण पत्र (SC Caste Certificate)", "required": True, "icon": "fa-id-card"},
        {"name": "आय प्रमाण पत्र (Income Certificate / Family Income Proof)", "required": True, "icon": "fa-file-invoice-dollar"},
        {"name": "पहचान व निवास प्रमाण (Aadhaar Card / Voter ID / Ration Card)", "required": True, "icon": "fa-address-card"},
        {"name": "बैंक खाता पासबुक (Bank Account Passbook / Cancelled Cheque)", "required": True, "icon": "fa-building-columns"}
    ]

    if loan_type == "education":
        documents.append({"name": "कॉलेज प्रवेश पत्र व फीस संरचना (Admission Letter & Fee Structure)", "required": True, "icon": "fa-graduation-cap"})
        documents.append({"name": "पिछली शैक्षणिक अंकतालिकाएँ (Mark sheets / Certificates)", "required": True, "icon": "fa-certificate"})
    elif loan_type == "business":
        documents.append({"name": "परियोजना रिपोर्ट / व्यवसाय विवरण (Project Report / Quotation)", "required": True, "icon": "fa-briefcase"})
        if loan_required > 200000:
            documents.append({"name": "व्यापार पंजीकरण या दुकान अनुबंध (Business Registration / Rent Agreement)", "required": False, "icon": "fa-shop"})

    return {
        "score": total_score,
        "max_score": 100,
        "band": band,
        "badge": badge_hi,
        "color": status_color,
        "summary": summary,
        "pillars": {
            "affordability": {
                "score": affordability_score,
                "max": 35,
                "name": "EMI वहनीयता (Affordability)",
                "details": affordability_details
            },
            "scheme_fit": {
                "score": scheme_fit_score,
                "max": 25,
                "name": "योजना सीमा अनुकूलता (Scheme Fit)",
                "details": scheme_fit_details
            },
            "purpose_clarity": {
                "score": purpose_score,
                "max": 20,
                "name": "उद्देश्य स्पष्टता (Purpose Clarity)",
                "details": purpose_details
            },
            "tenure_feasibility": {
                "score": tenure_score,
                "max": 10,
                "name": "अवधि संतुलन (Tenure)",
                "details": tenure_details
            },
            "accessibility": {
                "score": accessibility_score,
                "max": 10,
                "name": "स्थान व चैनल पहुंच (Accessibility)",
                "details": accessibility_details
            }
        },
        "tips": tips,
        "documents": documents
    }
