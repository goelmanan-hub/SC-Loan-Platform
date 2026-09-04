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
    # 3. Purpose Clarity & Project Viability (Max: 20 points)
    # Dynamic Probability Engine based on Domain, Loan Scale & Income Leverage
    # ==========================================
    purpose_score = 0
    purpose_details = ""
    purpose_probability = 50

    INVALID_FILLERS = {
        "मुझे", "मुझे भी", "मुझे एक", "हाँ", "हां", "नहीं", "लोन", "बिजनेस", "व्यवसाय", "काम", "काम करना है",
        "kuch bhi", "yes", "no", "ok", "okay", "loan", "business", "please", "sir", "naam", "pata nahi",
        "karna hai", "chahiye", "loan chahiye", "business chahiye", "ek", "chahiye tha", "ke liye", "lena hai"
    }

    # Clean purpose text by removing noise words
    def clean_purpose_text(raw_text: str) -> str:
        cleaned = re.sub(r"[।.,!?'\"()_-]", " ", str(raw_text or "")).strip()
        tokens = [t for t in cleaned.split() if t.lower() not in INVALID_FILLERS]
        return " ".join(tokens).strip() if tokens else cleaned

    DOMAIN_TAXONOMY = {
        "digital_it": {
            "keywords": [
                "वेबसाइट", "वेब", "सॉफ्टवेयर", "कंप्यूटर", "आईटी", "डिजिटल", "साइबर", "कैफे", "ग्राफिक", "डिजाइन",
                "यूट्यूब", "फोटो", "स्टूडियो", "प्रिंटिंग", "एप", "इंटरनेट", "ऑनलाइन", "ई-कॉमर्स", "कोडिंग",
                "website", "web", "software", "it", "digital", "cyber", "cafe", "graphic", "design", "studio",
                "computer", "tech", "app", "online", "printing", "xerox", "e-commerce", "freelance"
            ],
            "typical_min": 25000,
            "typical_max": 500000,
            "base_prob": 88,
            "label": "डिजिटल / आईटी सेवाएँ (Digital & IT)"
        },
        "retail_trade": {
            "keywords": [
                "किराना", "जनरल स्टोर", "दुकान", "सब्जी", "फल", "कपड़ा", "जूता", "स्टेशनरी", "हार्डवेयर", "इलेक्ट्रिकल",
                "मोबाइल", "स्टोर", "शॉप", "ट्रेडिंग", "व्यापार", "दुकानदारी", "किराना स्टोर",
                "retail", "grocery", "shop", "store", "cloth", "garment", "stationery", "mobile", "electronics", "trade"
            ],
            "typical_min": 40000,
            "typical_max": 500000,
            "base_prob": 86,
            "label": "खुदरा व्यापार / दुकान (Retail Trade)"
        },
        "services_craft": {
            "keywords": [
                "सिलाई", "टेलरिंग", "बुटीक", "सैलून", "ब्यूटी", "पार्लर", "प्लंबर", "इलेक्ट्रीशियन", "कारपेंटर",
                "लॉन्ड्री", "ड्राई क्लीन", "रिपेयर", "सर्विस", "वर्कशॉप", "मैकेनिक", "वेल्डिंग",
                "tailor", "boutique", "salon", "beauty", "parlour", "plumber", "electrician", "carpenter", "repair", "service"
            ],
            "typical_min": 30000,
            "typical_max": 300000,
            "base_prob": 90,
            "label": "कौशल व सेवा व्यवसाय (Vocational & Services)"
        },
        "dairy_agri": {
            "keywords": [
                "डेयरी", "गाय", "भैंस", "दूध", "पशुपालन", "पोल्ट्री", "मुर्गी", "बकरी", "मत्स्य", "फार्म", "खेती", "कृषि", "पशु",
                "dairy", "poultry", "cattle", "milk", "goat", "farming", "fishery", "agriculture", "livestock"
            ],
            "typical_min": 50000,
            "typical_max": 700000,
            "base_prob": 88,
            "label": "डेयरी व कृषि आधारित व्यवसाय (Dairy & Agri-Allied)"
        },
        "transport_auto": {
            "keywords": [
                "ऑटो", "ई-रिक्शा", "रिक्शा", "टैक्सी", "गाड़ी", "वाहन", "ट्रक", "कमर्शियल", "लोडर", "ड्राइवर", "गैरेज",
                "auto", "e-rickshaw", "rickshaw", "taxi", "transport", "vehicle", "driver", "garage", "logistics"
            ],
            "typical_min": 80000,
            "typical_max": 1000000,
            "base_prob": 85,
            "label": "परिवहन व वाहन व्यवसाय (Transport & Logistics)"
        },
        "manufacturing_food": {
            "keywords": [
                "फैक्ट्री", "कारखाना", "मशीन", "होटल", "ढाबा", "चाय", "रेस्टोरेंट", "बेकरी", "मिठाई", "फूड", "अगरबत्ती", "पैकेजिंग", "हस्तशिल्प",
                "factory", "manufacturing", "hotel", "restaurant", "food", "bakery", "packaging", "handicraft", "sweets"
            ],
            "typical_min": 100000,
            "typical_max": 2500000,
            "base_prob": 84,
            "label": "उत्पादन व खाद्य व्यवसाय (Manufacturing & Food Enterprise)"
        },
        "higher_education": {
            "keywords": [
                "btech", "b.tech", "mba", "mbbs", "bca", "mca", "bba", "bcom", "b.com", "bsc", "b.sc", "ba", "ma", "msc",
                "diploma", "iti", "polytechnic", "degree", "course", "engineering", "medical", "law", "llb", "phd", "bed", "nursing",
                "बीटेक", "एमबीए", "डिप्लोमा", "इंजीनियरिंग", "मेडिकल", "नर्सिंग", "कॉलेज", "विश्वविद्यालय", "पढ़ाई", "शिक्षा", "कोर्स"
            ],
            "typical_min": 50000,
            "typical_max": 3000000,
            "base_prob": 92,
            "label": "उच्च / व्यावसायिक शिक्षा (Higher Professional Education)"
        }
    }

    raw_purpose = education_course if loan_type == "education" else business_type
    clean_purpose = clean_purpose_text(raw_purpose)
    clean_lower = clean_purpose.lower()

    if not clean_purpose or clean_lower in INVALID_FILLERS or len(clean_purpose) < 2:
        purpose_probability = 25
        purpose_score = 5
        purpose_details = "ऋण उद्देश्य अनिर्धारित या बहुत संक्षिप्त है (25% स्पष्टता)।"
    else:
        # Match domain taxonomy (prioritize based on loan_type)
        matched_domain = None
        domain_keys = list(DOMAIN_TAXONOMY.keys())
        if loan_type == "education":
            domain_keys.remove("higher_education")
            domain_keys.insert(0, "higher_education")

        for dom_key in domain_keys:
            dom_val = DOMAIN_TAXONOMY[dom_key]
            if any(k in clean_lower for k in dom_val["keywords"]):
                matched_domain = dom_val
                break

        if matched_domain:
            prob = matched_domain["base_prob"]
            label = matched_domain["label"]

            # Factor 1: Capital Scale Feasibility Match
            if loan_required > 0:
                if matched_domain["typical_min"] <= loan_required <= matched_domain["typical_max"]:
                    prob += 4  # Capital demand perfectly matches industry benchmark
                elif loan_required > matched_domain["typical_max"] * 2:
                    prob -= 12  # Capital requirement unusually high for this micro venture
                elif loan_required < matched_domain["typical_min"] * 0.5:
                    prob -= 4

            # Factor 2: Income-to-Loan Leverage Grounding
            if annual_income > 0 and loan_required > 0:
                leverage = loan_required / annual_income
                if leverage <= 1.5:
                    prob += 5  # Strong debt service capacity
                elif leverage <= 3.0:
                    prob += 2  # Balanced standard leverage
                elif leverage <= 5.0:
                    prob -= 2  # Moderate leverage
                elif leverage <= 8.0:
                    prob -= 8  # High leverage relative to family income
                else:
                    prob -= 15  # Excessive leverage

            purpose_probability = max(30, min(96, int(round(prob))))
            purpose_score = max(6, min(20, int(round((purpose_probability / 100.0) * 20))))

            status_text = "अत्यधिक व्यावहारिक व अनुकूल" if purpose_probability >= 85 else "व्यावहारिक व उपयुक्त" if purpose_probability >= 70 else "मध्यम व्यावहारिक"
            display_title = clean_purpose.strip()
            purpose_details = f"उद्देश्य व्यवहार्यता: {purpose_probability}% ({status_text}) — '{display_title}' ({label}) हेतु मांगी गई राशि आय व बाजार आवश्यकता के अनुरूप है।"

        elif len(clean_purpose.split()) >= 2:
            # Descriptive purpose without direct keyword hit
            prob = 68
            if annual_income > 0 and loan_required > 0:
                leverage = loan_required / annual_income
                if leverage <= 2.0:
                    prob += 4
                elif leverage > 6.0:
                    prob -= 8

            purpose_probability = max(35, min(80, int(round(prob))))
            purpose_score = max(7, min(16, int(round((purpose_probability / 100.0) * 20))))
            purpose_details = f"उद्देश्य व्यवहार्यता: {purpose_probability}% — '{clean_purpose}' का सामान्य विवरण दर्ज है। प्रोजेक्ट रिपोर्ट से स्पष्टता बढ़ेगी।"
        else:
            purpose_probability = 45
            purpose_score = 9
            purpose_details = f"उद्देश्य व्यवहार्यता: {purpose_probability}% — '{clean_purpose}' संक्षिप्त विवरण है। कृपया विशिष्ट कार्य योजना जोड़ें।"

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
