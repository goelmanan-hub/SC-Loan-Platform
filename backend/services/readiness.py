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
    for SC beneficiaries based on 5 Underwriting Criteria Pillars.

    Underwriting Criteria Pillars (100 pts total):
    1. EMI Affordability & Debt Service Burden (FOIR): 30 points
    2. SC Eligibility & Scheme Limit Compliance: 25 points
    3. Document Readiness & Verification: 25 points
    4. Credit Track Record & Debt Profile: 10 points
    5. Location & Channel Partner Accessibility: 10 points
    """
    loan_type = str(user_data.get("loan_type") or "").lower().strip()
    loan_required = float(user_data.get("loan_required") or 0)
    annual_income = float(user_data.get("income") or 0)
    tenure_months = int(user_data.get("tenure_months") or 36)
    location = str(user_data.get("location") or "").strip()

    # Criteria-specific fields
    caste_status = str(user_data.get("caste_status") or user_data.get("caste") or "").lower().strip()
    docs_status = str(user_data.get("docs_status") or "").lower().strip()
    existing_emi = float(user_data.get("existing_emi") or 0)
    credit_history = str(user_data.get("credit_history") or "").lower().strip()

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
    total_monthly_debt = monthly_emi + existing_emi

    # ==========================================
    # PILLAR 1: EMI Affordability & FOIR (Max: 30 pts)
    # ==========================================
    affordability_score = 0
    affordability_details = ""

    if monthly_income > 0 and total_monthly_debt > 0:
        foir = (total_monthly_debt / monthly_income) * 100
        if foir <= 25:
            affordability_score = 30
            affordability_details = f"उत्कृष्ट (30/30): कुल EMI आय का केवल {foir:.1f}% है।"
        elif foir <= 40:
            affordability_score = 23
            affordability_details = f"अच्छा (23/30): कुल EMI आय का {foir:.1f}% है (सुरक्षित सीमा)।"
        elif foir <= 55:
            affordability_score = 15
            affordability_details = f"मध्यम (15/30): कुल EMI आय का {foir:.1f}% है। अवधि बढ़ाने की सलाह दी जाती है।"
        elif foir <= 70:
            affordability_score = 8
            affordability_details = f"उच्च बोझ (8/30): कुल EMI आय का {foir:.1f}% है। राशि घटाएं या अवधि बढ़ाएं।"
        else:
            affordability_score = 3
            affordability_details = f"अत्यधिक बोझ (3/30): EMI मासिक आय का {foir:.1f}% है (जोखिम भरा)।"
    elif monthly_income > 0 and total_monthly_debt == 0:
        affordability_score = 22
        affordability_details = "ऋण राशि व EMI गणना के आधार पर अंतिम मूल्यांकन होगा।"
    else:
        affordability_score = 7
        affordability_details = "आय विवरण दर्ज नहीं है (सत्यापन लंबित)।"

    # ==========================================
    # PILLAR 2: SC Eligibility & Scheme Compliance (Max: 25 pts)
    # ==========================================
    # Sub-part A: SC Caste Confirmation (15 pts)
    # Sub-part B: Scheme Maximum Loan Compliance (10 pts)
    caste_score = 0
    caste_detail = ""
    if caste_status in ["sc_certified", "sc", "अनुसूचित जाति", "sc_ready"]:
        caste_score = 15
        caste_detail = "SC जाति प्रमाण पत्र सत्यापित (15/15)"
    elif caste_status in ["sc_pending", "pending"]:
        caste_score = 9
        caste_detail = "SC श्रेणी चिन्हित, प्रमाण पत्र बनवाना शेष (9/15)"
    elif caste_status in ["other", "general", "obc"]:
        caste_score = 3
        caste_detail = "NSFDC योजनाएं मुख्य रूप से SC वर्ग हेतु हैं (3/15)"
    else:
        caste_score = 10
        caste_detail = "SC श्रेणी पुष्टि व प्रमाण पत्र सत्यापन लंबित (10/15)"

    compliance_score = 0
    compliance_detail = ""
    if scheme and loan_required > 0:
        if loan_required <= max_scheme_loan:
            compliance_score = 10
            compliance_detail = f"ऋण राशि (₹{loan_required:,.0f}) योजना सीमा (₹{max_scheme_loan:,.0f}) के अनुकूल (10/10)"
        else:
            compliance_score = 2
            compliance_detail = f"ऋण राशि योजना सीमा (₹{max_scheme_loan:,.0f}) से अधिक है (2/10)"
    elif loan_required > 0:
        compliance_score = 6
        compliance_detail = "योजना मिलान प्रगति पर (6/10)"
    else:
        compliance_score = 2
        compliance_detail = "ऋण राशि दर्ज नहीं है (2/10)"

    scheme_fit_score = caste_score + compliance_score
    scheme_fit_details = f"{caste_detail} | {compliance_detail}"

    # ==========================================
    # PILLAR 3: Document Readiness & Verification (Max: 25 pts)
    # ==========================================
    docs_score = 0
    docs_details = ""
    if docs_status in ["all_ready", "5_docs", "all"]:
        docs_score = 25
        docs_details = "पूर्ण तैयारी (25/25): सभी 5 अनिवार्य दस्तावेज (जाति, आय, आधार, पासबुक, प्रोजेक्ट) तैयार हैं।"
    elif docs_status in ["partial_ready", "3_4_docs", "partial"]:
        docs_score = 17
        docs_details = "आंशिक तैयारी (17/25): 3-4 दस्तावेज तैयार हैं; शेष 1-2 दस्तावेज तैयार करें।"
    elif docs_status in ["basic", "1_2_docs"]:
        docs_score = 8
        docs_details = "प्राथमिक स्तर (8/25): केवल 1-2 दस्तावेज उपलब्ध हैं; जाति व आय प्रमाण पत्र तुरंत तैयार करें।"
    else:
        docs_score = 12
        docs_details = "दस्तावेज मूल्यांकन (12/25): पूर्ण 25 अंक हेतु सभी मुख्य दस्तावेज पोर्टल/OCR पर जांचें।"

    # ==========================================
    # PILLAR 4: Credit Track Record & Debt Profile (Max: 10 pts)
    # ==========================================
    credit_score = 0
    credit_details = ""
    if credit_history in ["clean", "no_loans", "good"]:
        credit_score = 10
        credit_details = "उत्कृष्ट क्रेडिट स्थिति (10/10): कोई पिछला डिफ़ॉल्ट नहीं, स्वच्छ पुनर्भुगतान रिकॉर्ड।"
    elif credit_history in ["active_loan", "running"]:
        credit_score = 7
        credit_details = "सक्रिय ऋण चालू (7/10): वर्तमान ऋणों की नियमित किस्तों के साथ संतुलित रिकॉर्ड।"
    elif credit_history in ["defaulter", "delayed", "bad"]:
        credit_score = 1
        credit_details = "उच्च जोखिम (1/10): पूर्व ऋण में विलंब/अस्थिरता—क्रेडिट सुधार की आवश्यकता।"
    else:
        credit_score = 7
        credit_details = "मानक स्थिति (7/10): पहला ऋण आवेदन—बैंक सत्यापन उपरांत अंतिम क्रेडिट अंक।"

    # ==========================================
    # PILLAR 5: Location & Channel Partner Accessibility (Max: 10 pts)
    # ==========================================
    accessibility_score = 0
    accessibility_details = ""
    if location and len(location.strip()) >= 3:
        accessibility_score = 10
        accessibility_details = f"स्थान सत्यापित ({location}) (10/10): निकटतम राज्य एजेंसी (SCA)/पार्टनर बैंक नेटवर्क सक्रिय।"
    elif location and len(location.strip()) >= 2:
        accessibility_score = 7
        accessibility_details = f"स्थान दर्ज है ({location}) (7/10): सत्यापन संभव।"
    else:
        accessibility_score = 3
        accessibility_details = "स्थान विवरण दर्ज नहीं है (3/10)। नजदीकी सहायता केंद्र खोजने हेतु शहर/ज़िला बताएं।"

    # ==========================================
    # TOTAL SCORE & CATEGORIZATION
    # ==========================================
    total_score = (
        affordability_score +
        scheme_fit_score +
        docs_score +
        credit_score +
        accessibility_score
    )

    # Financial and compliance guardrails
    if monthly_income > 0 and total_monthly_debt > 0:
        foir = (total_monthly_debt / monthly_income) * 100
        if foir > 150:
            total_score = min(total_score, 40)
        elif foir > 80:
            total_score = min(total_score, 58)

    if scheme and loan_required > max_scheme_loan:
        total_score = min(total_score, 45)

    total_score = max(0, min(100, int(round(total_score))))

    if total_score >= 80:
        band = "EXCELLENT"
        badge_hi = "उत्कृष्ट तैयारी (High Readiness)"
        status_color = "#2e7d32"  # Green
        summary = "आपका आवेदन NSFDC ऋण पात्रता के अत्यंत अनुकूल है। सभी मानदंडों में मजबूत स्थिति।"
    elif total_score >= 60:
        band = "GOOD"
        badge_hi = "अच्छी तैयारी (Good Readiness)"
        status_color = "#0072bc"  # Blue
        summary = "आपकी प्राथमिक प्रोफाइल उपयुक्त है। शेष दस्तावेजों व विवरण के साथ आवेदन आगे बढ़ाएँ।"
    elif total_score >= 40:
        band = "MODERATE"
        badge_hi = "मध्यम तैयारी (Moderate Readiness)"
        status_color = "#e65100"  # Orange
        summary = "कुछ महत्वपूर्ण मानदंडों (जैसे आय प्रमाण, दस्तावेज या अवधि) में सुधार की आवश्यकता है।"
    else:
        band = "NEEDS_IMPROVEMENT"
        badge_hi = "सुधार आवश्यक (Needs Improvement)"
        status_color = "#c62828"  # Red
        summary = "ऋण पात्रता व वित्तीय मानदंडों पर अतिरिक्त तैयारी की आवश्यकता है। सुधार सुझाव देखें।"

    # Actionable suggestions / Tips based on criteria gaps
    tips = []
    if affordability_score < 24:
        tips.append("मासिक EMI कम करने के लिए ऋण अवधि (Tenure) को 3 से 5 वर्ष तक बढ़ाएँ।")
    if caste_score < 15:
        tips.append("तहसीलदार / एसडीएम द्वारा जारी वैध SC जाति प्रमाण पत्र (Caste Certificate) तैयार रखें (+5-6 अंक)।")
    if docs_score < 22:
        tips.append("सभी मुख्य दस्तावेज (जाति, आय, आधार, पासबुक, प्रोजेक्ट/एडमिशन) OCR पर जांचकर पूरे 25 अंक प्राप्त करें।")
    if credit_score < 8:
        tips.append("मौजूदा बैंक ऋणों की किस्तें समय पर चुकाकर अपना क्रेडिट रिकॉर्ड स्वच्छ रखें।")
    if accessibility_score < 8:
        tips.append("अपने निकटतम स्टेट चैनलाइजिंग एजेंसी (SCA) या बैंक शाखा की सटीक लोकेशन दर्ज करें।")

    if not tips:
        tips.append("आपकी ऋण तत्परता उत्कृष्ट है! सभी मूल प्रमाण पत्र सत्यापन हेतु तैयार रखें।")

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
    else:
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
                "max": 30,
                "name": "1. EMI वहनीयता व आय बोझ (Affordability)",
                "details": affordability_details
            },
            "scheme_fit": {
                "score": scheme_fit_score,
                "max": 25,
                "name": "2. SC पात्रता व योजना सीमा (Eligibility & Fit)",
                "details": scheme_fit_details
            },
            "document_readiness": {
                "score": docs_score,
                "max": 25,
                "name": "3. दस्तावेज तैयारी व सत्यापन (Documents)",
                "details": docs_details
            },
            "credit_profile": {
                "score": credit_score,
                "max": 10,
                "name": "4. क्रेडिट रिकॉर्ड व ऋण इतिहास (Credit History)",
                "details": credit_details
            },
            "accessibility": {
                "score": accessibility_score,
                "max": 10,
                "name": "5. स्थान व चैनल पहुंच (Accessibility)",
                "details": accessibility_details
            }
        },
        "tips": tips,
        "documents": documents
    }

