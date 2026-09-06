"""
Official Knowledge Base for Scheduled Caste (SC) Government Loan Schemes
(NSFDC - National Scheduled Castes Finance and Development Corporation & Ministry of Social Justice and Empowerment)
"""

SCHEMES_KNOWLEDGE_BASE = [
    {
        "id": "mahila_samriddhi_yojana",
        "name": "Mahila Samriddhi Yojana (MSY)",
        "name_hi": "महिला समृद्धि योजना (MSY)",
        "loan_type": "business",
        "target_group": "Scheduled Caste Women Entrepreneurs / SHGs",
        "description": "Micro-credit scheme designed exclusively for Scheduled Caste women for small business, tailoring, dairy, retail, and income-generating self-employment activities.",
        "description_hi": "अनुसूचित जाति की महिला उद्यमियों के लिए विशेष सूक्ष्म ऋण योजना, सिलाई, डेयरी, किराना, ब्यूटी पार्लर व छोटे स्वरोजगार हेतु।",
        "max_loan": 140000,
        "unit_cost_limit": 140000,
        "interest_rate": 4.0,  # Highly concessional for SC women
        "moratorium_months": 3,
        "repayment_tenure_months": 36,
        "subsidy_percentage": 50,
        "subsidy_details": "Up to ₹10,000 or 50% capital subsidy through State Channelising Agencies (SCAs). 1% interest rebate on timely repayment.",
        "eligibility": {
            "caste": "Scheduled Caste (SC)",
            "gender": "Female",
            "age": "18 to 55 years",
            "income_ceiling": 300000,
            "project_types": ["tailoring", "dairy", "retail_shop", "beauty_parlor", "handicrafts", "food_stall", "micro_enterprise"]
        },
        "mandatory_documents": [
            "SC Caste Certificate (जाति प्रमाण पत्र)",
            "Annual Family Income Certificate (< ₹3 Lakh)",
            "Aadhaar Card / Voter ID",
            "Active Bank Passbook with IFSC",
            "Quotation / Estimate for Equipment or Stock"
        ],
        "keywords": [
            "women", "mahila", "female", "tailor", "tailoring", "dairy", "sewing",
            "beauty parlor", "kirana", "micro", "सिलाई", "महिला", "डेयरी", "दुकान", "ब्यूटी पार्लर"
        ],
        "tags": ["women", "micro", "concessional", "business", "nsfdc"]
    },
    {
        "id": "micro_finance",
        "name": "Micro Credit Finance Scheme (MCF)",
        "name_hi": "सूक्ष्म ऋण वित्त योजना (MCF)",
        "loan_type": "business",
        "target_group": "SC Individuals / Self Help Groups",
        "description": "Fast-track micro finance for setting up small shops, repair services, food stalls, artisan units, or small transport businesses.",
        "description_hi": "छोटे व्यवसाय, मरम्मत की दुकान, चाय-नाश्ता स्टॉल, कारीगरी और सूक्ष्म उद्यमों के लिए आसान और त्वरित ऋण।",
        "max_loan": 140000,
        "unit_cost_limit": 140000,
        "interest_rate": 5.0,
        "moratorium_months": 3,
        "repayment_tenure_months": 36,
        "subsidy_percentage": 25,
        "subsidy_details": "SCA margin money support available up to ₹10,000.",
        "eligibility": {
            "caste": "Scheduled Caste (SC)",
            "gender": "All",
            "age": "18 to 60 years",
            "income_ceiling": 300000,
            "project_types": ["micro_business", "repair_shop", "tea_stall", "barber_shop", "artisan", "vegetable_vendor", "plumbing"]
        },
        "mandatory_documents": [
            "SC Caste Certificate",
            "Family Income Certificate",
            "Aadhaar Card",
            "Bank Account Details",
            "Business Plan / Cost Estimation"
        ],
        "keywords": [
            "micro", "small shop", "kirana", "repair", "tea", "food stall", "vendor",
            "artisan", "दुकान", "सिलाई", "मरम्मत", "फल सब्जी", "छोटा व्यापार"
        ],
        "tags": ["micro", "business", "individual", "nsfdc"]
    },
    {
        "id": "laghu_udhyami_yojana",
        "name": "Laghu Udhyami Yojana (LUY)",
        "name_hi": "लघु उद्यमी योजना (LUY)",
        "loan_type": "business",
        "target_group": "Skilled / ITI / Polytechnic Certified SC Youth",
        "description": "Support for skilled, vocationally trained SC youth to establish small scale enterprises, service centers, workshops, and fabrication units.",
        "description_hi": "प्रशिक्षित व कुशल अनुसूचित जाति के युवाओं को वर्कशॉप, सर्विस सेंटर व छोटे उद्यम स्थापित करने हेतु विशेष ऋण।",
        "max_loan": 500000,
        "unit_cost_limit": 500000,
        "interest_rate": 6.0,
        "moratorium_months": 6,
        "repayment_tenure_months": 60,
        "subsidy_percentage": 20,
        "subsidy_details": "Margin money and interest concession for certified trainees.",
        "eligibility": {
            "caste": "Scheduled Caste (SC)",
            "gender": "All",
            "age": "18 to 45 years",
            "income_ceiling": 300000,
            "skill_cert_required": True,
            "project_types": ["workshop", "electrical_repair", "automobile_service", "fabrication", "printing", "mobile_repair"]
        },
        "mandatory_documents": [
            "SC Caste Certificate",
            "Income Certificate",
            "Aadhaar Card",
            "Skill / ITI / Vocational Training Certificate",
            "Bank Passbook",
            "Detailed Project Report (DPR)"
        ],
        "keywords": [
            "skill", "iti", "polytechnic", "workshop", "mobile repair", "automobile",
            "electrician", "fabrication", "service center", "वर्कशॉप", "कुशल", "सर्विस सेंटर"
        ],
        "tags": ["skilled", "youth", "business", "nsfdc"]
    },
    {
        "id": "term_loan",
        "name": "Term Loan Scheme for SC Entrepreneurs",
        "name_hi": "अनुसूचित जाति टर्म लोन योजना",
        "loan_type": "business",
        "target_group": "SC Entrepreneurs establishing medium/larger business units",
        "description": "Financial assistance up to 95% of project cost for viable commercial projects in manufacturing, processing, wholesale trading, passenger/commercial transport, and service sectors.",
        "description_hi": "मध्यम व बड़े व्यवसायों, विनिर्माण (मैन्युफैक्चरिंग), कमर्शियल वाहन, वेयरहाउस व प्रोसेसिंग यूनिट्स हेतु 95% तक की वित्तीय सहायता।",
        "max_loan": 5000000,
        "unit_cost_limit": 5000000,
        "interest_rate": 7.0,
        "moratorium_months": 6,
        "repayment_tenure_months": 60,
        "subsidy_percentage": 15,
        "subsidy_details": "NSFDC covers up to 90-95% of project cost with 5-10% promoter contribution.",
        "eligibility": {
            "caste": "Scheduled Caste (SC)",
            "gender": "All",
            "age": "18 to 60 years",
            "income_ceiling": 300000,
            "project_types": ["manufacturing", "transport", "wholesale", "construction", "factory", "commercial_vehicle", "warehouse"]
        },
        "mandatory_documents": [
            "SC Caste Certificate",
            "Income Certificate / ITR",
            "Aadhaar Card & PAN Card",
            "Bank Statements (6-12 months)",
            "Detailed Project Report (DPR) with cash flows",
            "Trade License / GST Registration / MSME Udyam"
        ],
        "keywords": [
            "factory", "manufacturing", "transport", "truck", "commercial vehicle", "warehouse",
            "construction", "machinery", "large business", "कारखाना", "ट्रांसपोर्ट", "गाड़ी", "मशीन", "व्यापार"
        ],
        "tags": ["term", "manufacturing", "transport", "large", "nsfdc"]
    },
    {
        "id": "green_business_scheme",
        "name": "Green Business Scheme (GBS)",
        "name_hi": "ग्रीन बिजनेस योजना (ई-रिक्शा व सौर ऊर्जा)",
        "loan_type": "business",
        "target_group": "SC Individuals & Green Entrepreneurs",
        "description": "Financial assistance for eco-friendly, green energy and climate-positive businesses such as Battery Operated E-Rickshaws, Solar PV lighting, composting, and recycling units.",
        "description_hi": "पर्यावरण-अनुकूल व्यवसाय जैसे ई-रिक्शा, सौर ऊर्जा उपकरण, अपशिष्ट प्रबंधन व रिसाइक्लिंग के लिए विशेष रियायती लोन।",
        "max_loan": 3000000,
        "unit_cost_limit": 3000000,
        "interest_rate": 6.0,
        "moratorium_months": 6,
        "repayment_tenure_months": 60,
        "subsidy_percentage": 25,
        "subsidy_details": "Special interest subsidy and capital support for renewable energy adoption.",
        "eligibility": {
            "caste": "Scheduled Caste (SC)",
            "gender": "All",
            "age": "18 to 60 years",
            "income_ceiling": 300000,
            "project_types": ["e_rickshaw", "electric_vehicle", "solar_panel", "solar_pump", "waste_recycling", "bio_fertilizer"]
        },
        "mandatory_documents": [
            "SC Caste Certificate",
            "Income Certificate",
            "Aadhaar Card",
            "Commercial Driving License (for E-Rickshaw)",
            "Quotation from Authorized Solar / EV Dealer",
            "Bank Passbook"
        ],
        "keywords": [
            "e-rickshaw", "erickshaw", "solar", "solar panel", "green", "electric vehicle",
            "battery", "ev", "ई-रिक्शा", "सौर ऊर्जा", "सोलर", "पर्यावरण", "इलेक्ट्रिक"
        ],
        "tags": ["green", "ev", "solar", "e-rickshaw", "nsfdc"]
    },
    {
        "id": "education_loan",
        "name": "Educational Loan Scheme (ELIS - India)",
        "name_hi": "शिक्षा ऋण योजना (भारत में उच्च शिक्षा)",
        "loan_type": "education",
        "target_group": "SC Students pursuing higher professional / technical courses in India",
        "description": "Concessional loans for SC students admitted to recognized Engineering, Medical, Law, Management, Nursing, Pharmacy, and Polytechnic degree courses in India.",
        "description_hi": "भारत में इंजीनियरिंग, मेडिकल, एमबीए, लॉ, नर्सिंग, फार्मेसी आदि मान्यता प्राप्त उच्च तकनीकी पाठ्यक्रमों हेतु आसान शिक्षा ऋण।",
        "max_loan": 2000000,
        "unit_cost_limit": 2000000,
        "interest_rate": 4.0,  # 3.5% for female students, 4.0% for male students
        "moratorium_months": 12,  # Course duration + 6 to 12 months
        "repayment_tenure_months": 120,
        "subsidy_percentage": 100,
        "subsidy_details": "Central Sector Interest Subsidy (CSIS) during moratorium period. 0.5% interest concession for girl students.",
        "eligibility": {
            "caste": "Scheduled Caste (SC)",
            "gender": "All",
            "age": "Below 35 years",
            "income_ceiling": 300000,
            "admission_mode": "Merit / Entrance exam clearance in recognized institution",
            "courses": ["B.Tech", "MBBS", "BDS", "MBA", "LLB", "M.Tech", "B.Pharma", "Nursing", "Polytechnic"]
        },
        "mandatory_documents": [
            "SC Caste Certificate of Student",
            "Family Income Certificate (< ₹3 Lakh/yr)",
            "10th, 12th & Graduation Marksheets",
            "College Admission Letter & Bonafide Certificate",
            "Fee Structure on Official Institution Letterhead",
            "Aadhaar Card of Student and Co-applicant (Parent)",
            "Bank Account of Student"
        ],
        "keywords": [
            "education", "college", "study", "engineering", "btech", "medical", "mbbs",
            "mba", "degree", "fees", "polytechnic", "nursing", "पढ़ाई", "कॉलेज", "इंजीनियरिंग", "मेडिकल", "शिक्षा ऋण"
        ],
        "tags": ["education", "domestic", "student", "concessional", "nsfdc"]
    },
    {
        "id": "education_loan_abroad",
        "name": "Educational Loan Scheme for Studies Abroad",
        "name_hi": "विदेश अध्ययन शिक्षा ऋण योजना",
        "loan_type": "education",
        "target_group": "SC Students admitted to accredited universities abroad",
        "description": "Financial support for SC students pursuing Masters, PhD, MS, or specialized STEM/Management postgraduate courses in top recognized foreign universities (USA, UK, Germany, Canada, Australia, etc.).",
        "description_hi": "विदेश (USA, UK, जर्मनी, कनाडा आदि) के शीर्ष विश्वविद्यालयों में मास्टर्स, एमएस, पीएचडी व उच्च शिक्षा हेतु विशेष ऋण।",
        "max_loan": 3000000,
        "unit_cost_limit": 3000000,
        "interest_rate": 4.0,
        "moratorium_months": 12,
        "repayment_tenure_months": 120,
        "subsidy_percentage": 100,
        "subsidy_details": "Interest subsidy during study moratorium. Special linkage with National Overseas Scholarship (NOS) guidance.",
        "eligibility": {
            "caste": "Scheduled Caste (SC)",
            "gender": "All",
            "age": "Below 35 years",
            "income_ceiling": 800000,
            "admission_mode": "Secured admission in accredited foreign university with valid student visa / offer",
            "courses": ["MS", "Masters", "PhD", "Post Graduate", "STEM"]
        },
        "mandatory_documents": [
            "SC Caste Certificate",
            "Valid Passport & Student Visa (or I-20 / CAS letter)",
            "Foreign University Unconditional Offer Letter",
            "Course Fee Structure with Living Expense Estimation",
            "GRE / TOEFL / IELTS / GMAT Scorecard (if applicable)",
            "Co-borrower Income Proof & Bank Statements"
        ],
        "keywords": [
            "abroad", "foreign", "usa", "uk", "germany", "canada", "masters", "ms",
            "phd", "overseas", "विदेश", "विदेश में पढ़ाई", "मास्टर्स", "इंटरनेशनल"
        ],
        "tags": ["education", "abroad", "overseas", "stem", "nsfdc"]
    },
    {
        "id": "stand_up_india_sc",
        "name": "Stand-Up India Scheme (SC Category)",
        "name_hi": "स्टैंड-अप इंडिया योजना (अनुसूचित जाति)",
        "loan_type": "business",
        "target_group": "SC Entrepreneurs establishing Greenfield ventures",
        "description": "Bank loan facilitation between ₹10 Lakh and ₹1 Crore for setting up a greenfield (first-time) manufacturing, services, agri-allied, or trading enterprise by an SC borrower.",
        "description_hi": "प्रथम बार विनिर्माण, सेवा, कृषि-संबद्ध या व्यापार उद्यम स्थापित करने वाले अनुसूचित जाति के उद्यमियों के लिए ₹10 लाख से ₹1 करोड़ तक का बैंक ऋण।",
        "max_loan": 10000000,
        "unit_cost_limit": 10000000,
        "interest_rate": 7.5,
        "moratorium_months": 18,
        "repayment_tenure_months": 84,
        "subsidy_percentage": 15,
        "subsidy_details": "Credit Guarantee Scheme for Stand-Up India (CGSSI) provides collateral-free coverage. Convergence with state subsidies.",
        "eligibility": {
            "caste": "Scheduled Caste (SC)",
            "gender": "All",
            "age": "Above 18 years",
            "income_ceiling": 0,  # No strict cap for commercial greenfield
            "project_types": ["greenfield", "manufacturing", "trading", "services", "agri_processing", "hospitality"]
        },
        "mandatory_documents": [
            "SC Caste Certificate",
            "PAN Card & Aadhaar Card",
            "Project Report with Financial Projections (3-5 years)",
            "Land / Lease Agreement for Unit",
            "Pollution & Local Authority Clearances (if applicable)",
            "Audited Financials / Bank Statements"
        ],
        "keywords": [
            "stand up", "standup", "greenfield", "crore", "manufacturing", "industry",
            "large enterprise", "agro", "स्टैंड-अप", "उद्योग", "बड़ा लोन", "कारोबार"
        ],
        "tags": ["standup", "greenfield", "commercial", "high_value"]
    }
]


def get_all_schemes_kb():
    """Returns the comprehensive knowledge base of schemes."""
    return SCHEMES_KNOWLEDGE_BASE


def get_scheme_by_id_kb(scheme_id: str):
    """Retrieve full scheme specification by its ID."""
    for scheme in SCHEMES_KNOWLEDGE_BASE:
        if scheme["id"] == scheme_id:
            return scheme
    return None
