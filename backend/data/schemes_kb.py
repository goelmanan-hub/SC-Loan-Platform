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
        "channelizing_agency_rate": 1.5,
        "moratorium_months": 3,
        "moratorium_details": "3 months moratorium included",
        "repayment_tenure_months": 36,
        "repayment_tenure_details": "Up to 3 years in quarterly installments",
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
        "name": "Micro Finance Scheme (MFS)",
        "name_hi": "सूक्ष्म वित्त योजना (MFS)",
        "loan_type": "business",
        "target_group": "SC Individuals / Self Help Groups / Micro Units",
        "description": "NSFDC provides micro finance up to ₹1.25 Lakh (up to 90% of unit cost up to ₹1.40 Lakh) for small business, repair services, food stalls, artisan units, and income generation.",
        "description_hi": "एनएसएफडीसी ₹1.40 लाख रुपये तक की लागत वाली इकाइयों के लिए परियोजना लागत का 90% तक ऋण (अधिकतम ₹1.25 लाख प्रति इकाई) प्रदान करता है।",
        "max_loan": 125000,
        "unit_cost_limit": 140000,
        "interest_rate": 6.5,  # 6.5% p.a. for Beneficiaries (2.5% p.a. to Channelizing Agency)
        "channelizing_agency_rate": 2.5,
        "moratorium_months": 3,
        "moratorium_details": "3 months moratorium from date of disbursement",
        "repayment_tenure_months": 36,
        "repayment_tenure_details": "Up to 3 years in quarterly installments including 3 months moratorium",
        "subsidy_percentage": 25,
        "subsidy_details": "Up to 90% of project cost funded by NSFDC. SCA margin money support available.",
        "eligibility": {
            "caste": "Scheduled Caste (SC)",
            "gender": "All",
            "age": "18 to 60 years",
            "income_ceiling": 300000,
            "project_types": ["micro_business", "repair_shop", "tea_stall", "barber_shop", "artisan", "vegetable_vendor", "plumbing"]
        },
        "mandatory_documents": [
            "SC Caste Certificate",
            "Family Income Certificate (< ₹3 Lakh/yr)",
            "Aadhaar Card",
            "Bank Account Details",
            "Business Plan / Cost Estimation"
        ],
        "keywords": [
            "micro", "mfs", "small shop", "kirana", "repair", "tea", "food stall", "vendor",
            "artisan", "सूक्ष्म वित्त", "दुकान", "सिलाई", "मरम्मत", "फल सब्जी", "छोटा व्यापार"
        ],
        "tags": ["micro", "mfs", "business", "individual", "nsfdc"]
    },
    {
        "id": "term_loan",
        "name": "Term Loan Scheme",
        "name_hi": "मियादी ऋण (Term Loan)",
        "loan_type": "business",
        "target_group": "SC Entrepreneurs establishing medium/larger business units (above ₹1.40 Lakh up to ₹50.00 Lakh)",
        "description": "Term loan assistance for units costing between ₹1.40 Lakh and ₹50.00 Lakh. NSFDC provides up to 90% of project cost (from ₹1.25 Lakh up to ₹45.00 Lakh per unit).",
        "description_hi": "एनएसएफडीसी ₹1.40 लाख से अधिक और ₹50.00 लाख रुपये तक की लागत वाली इकाइयों के लिए परियोजना लागत का 90% तक (₹1.25 लाख से अधिक और ₹45 लाख प्रति इकाई तक) मियादी ऋण प्रदान करता है।",
        "max_loan": 4500000,
        "unit_cost_limit": 5000000,
        "interest_rate": 8.0,  # 8.0% p.a. for Beneficiaries (4.0% p.a. to Channelizing Agency)
        "channelizing_agency_rate": 4.0,
        "moratorium_months": 6,  # 6 months (12 months for plantation and construction activities)
        "moratorium_details": "6 months moratorium (12 months for plantation and construction activities)",
        "repayment_tenure_months": 84,  # Up to 7 years in quarterly installments
        "repayment_tenure_details": "Up to 7 years in quarterly installments including moratorium",
        "subsidy_percentage": 15,
        "subsidy_details": "Up to 90% of project cost funded by NSFDC with 10% promoter contribution.",
        "eligibility": {
            "caste": "Scheduled Caste (SC)",
            "gender": "All",
            "age": "18 to 60 years",
            "income_ceiling": 300000,
            "project_types": ["manufacturing", "transport", "wholesale", "construction", "factory", "commercial_vehicle", "warehouse", "plantation"]
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
            "term loan", "factory", "manufacturing", "transport", "truck", "commercial vehicle", "warehouse",
            "construction", "machinery", "large business", "मियादी ऋण", "टर्म लोन", "कारखाना", "ट्रांसपोर्ट", "गाड़ी", "मशीन", "व्यापार"
        ],
        "tags": ["term", "manufacturing", "transport", "large", "nsfdc"]
    },
    {
        "id": "ajeevika_microfinance",
        "name": "Ajeevika Microfinance Scheme",
        "name_hi": "आजीविका माइक्रो-फाइनेंस योजना",
        "loan_type": "business",
        "target_group": "SC Individuals / SHGs pursuing micro-business activities through NBFCs / MFIs",
        "description": "Quick, need-based micro finance for eligible SC individuals to pursue small/micro business activities through selected NBFCs/MFIs for units costing up to ₹1.40 Lakh (loan up to 90% / ₹1.25 Lakh).",
        "description_hi": "पात्र अनुसूचित जाति के व्यक्तियों को छोटे/सूक्ष्म व्यवसाय हेतु चयनित एनबीएफसी/एमएफआई (NBFC/MFI) के माध्यम से ₹1.40 लाख तक की लागत वाली परियोजनाओं के लिए 90% तक (₹1.25 लाख तक) त्वरित ऋण।",
        "max_loan": 125000,
        "unit_cost_limit": 140000,
        "interest_rate": 15.0,  # 15.0% p.a. for Beneficiaries (5.0% p.a. to NBFC/MFI)
        "channelizing_agency_rate": 5.0,
        "moratorium_months": 3,
        "moratorium_details": "3 months moratorium from date of each disbursement",
        "repayment_tenure_months": 36,
        "repayment_tenure_details": "Up to 3 years in quarterly installments including 3 months moratorium",
        "subsidy_percentage": 20,
        "subsidy_details": "Need-based fast disbursement through accredited NBFC-MFI network.",
        "eligibility": {
            "caste": "Scheduled Caste (SC)",
            "gender": "All",
            "age": "18 to 60 years",
            "income_ceiling": 300000,
            "project_types": ["micro_enterprise", "handicrafts", "artisan", "small_trade", "vegetable_vendor", "kirana", "dairy"]
        },
        "mandatory_documents": [
            "SC Caste Certificate",
            "Income Certificate (< ₹3 Lakh/yr)",
            "Aadhaar Card",
            "Bank Account Passbook",
            "NBFC/MFI Application Form"
        ],
        "keywords": [
            "ajeevika", "microfinance", "nbfc", "mfi", "micro", "small shop", "आजीविका", "माइक्रो फाइनेंस", "एनबीएफसी", "एमएफआई", "ऋण"
        ],
        "tags": ["ajeevika", "microfinance", "nbfc", "mfi", "business", "nsfdc"]
    },
    {
        "id": "udyam_nidhi_yojana",
        "name": "Udyam Nidhi Yojana (UNY)",
        "name_hi": "उद्यम निधि योजना (UNY)",
        "loan_type": "business",
        "target_group": "SC Entrepreneurs through Cooperative Societies, Cooperative Banks, and Small Finance Banks (SFBs)",
        "description": "Financial assistance under Udyam Nidhi Yojana (UNY) for projects/units costing up to ₹5.00 Lakh through Cooperative Societies, Cooperative Banks, and Small Finance Banks (SFBs). Loan up to 90% (₹4.50 Lakh).",
        "description_hi": "सहकारी समितियों, सहकारी बैंकों और लघु वित्त बैंकों (SFBs) के माध्यम से ₹5.00 लाख रुपये तक की लागत वाली परियोजनाओं/इकाइयों हेतु 90% यानी ₹4.50 लाख तक का ऋण।",
        "max_loan": 450000,
        "unit_cost_limit": 500000,
        "interest_rate": 13.0,  # 13.0% for Coop Banks/Societies; 15.0% for SFBs (5.0% for NSFDC)
        "channelizing_agency_rate": 5.0,
        "interest_details": "13.0% p.a. via Cooperative Banks/Societies; 15.0% p.a. via Small Finance Banks (SFBs). NSFDC charges 5.0% p.a.",
        "moratorium_months": 3,
        "moratorium_details": "3 months moratorium included",
        "repayment_tenure_months": 60,
        "repayment_tenure_details": "Up to 5 years in quarterly or half-yearly installments including 3 months moratorium",
        "subsidy_percentage": 20,
        "subsidy_details": "90% of project cost funded by NSFDC.",
        "eligibility": {
            "caste": "Scheduled Caste (SC)",
            "gender": "All",
            "age": "18 to 60 years",
            "income_ceiling": 300000,
            "project_types": ["small_enterprise", "workshop", "retail", "service_unit", "dairy", "agriculture_allied", "cooperative"]
        },
        "mandatory_documents": [
            "SC Caste Certificate",
            "Income Certificate (< ₹3 Lakh/yr)",
            "Aadhaar Card & PAN Card",
            "Bank Account / Membership Proof in Cooperative / SFB",
            "Quotation / Cost Estimate for Unit"
        ],
        "keywords": [
            "udyam nidhi", "uny", "cooperative", "sfb", "small finance bank", "cooperative bank", "उद्यम निधि", "सहकारी बैंक", "लघु वित्त बैंक", "समिति"
        ],
        "tags": ["udyam_nidhi", "uny", "cooperative", "sfb", "business", "nsfdc"]
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
        "channelizing_agency_rate": 3.0,
        "moratorium_months": 6,
        "moratorium_details": "6 months moratorium included",
        "repayment_tenure_months": 60,
        "repayment_tenure_details": "Up to 5 years in quarterly installments",
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
            "electrician", "fabrication", "service center", "वर्कशॉप", "कुशल", "सर्विस सेंटर", "लघु उद्यमी"
        ],
        "tags": ["skilled", "youth", "business", "nsfdc"]
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
        "channelizing_agency_rate": 3.0,
        "moratorium_months": 6,
        "moratorium_details": "6 months moratorium included",
        "repayment_tenure_months": 60,
        "repayment_tenure_details": "Up to 5 years in quarterly installments",
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
        "name": "Educational Loan Scheme (Domestic & Abroad)",
        "name_hi": "शिक्षा ऋण योजना (घरेलू और विदेश)",
        "loan_type": "education",
        "target_group": "SC Students pursuing higher professional / technical courses in India or Abroad",
        "description": "Concessional education loans for SC students admitted to recognized full-time professional/technical degree courses in India or abroad. Up to ₹40.00 Lakhs or 90% of course fee.",
        "description_hi": "भारत या विदेश में सरकार द्वारा अनुमोदित नियमित पूर्णकालिक व्यावसायिक/तकनीकी मान्यता प्राप्त पाठ्यक्रमों हेतु 40.00 लाख रुपये तक या पाठ्यक्रम शुल्क का 90% (जो भी कम हो) रियायती शिक्षा ऋण।",
        "max_loan": 4000000,
        "unit_cost_limit": 4000000,
        "interest_rate": 6.5,  # 6.5% p.a. for Beneficiary (2.5% p.a. for Channelizing Agency)
        "channelizing_agency_rate": 2.5,
        "moratorium_months": 12,  # Course duration + 1 year
        "moratorium_details": "Course duration + 1 year (if repayment not started) / up to 6 months (if loan disbursed & repayment started)",
        "repayment_tenure_months": 144,  # Up to 12 years
        "repayment_tenure_details": "Up to 12 years (if repayment not started) / Up to 10 years (if loan disbursed & repayment started)",
        "subsidy_percentage": 100,
        "subsidy_details": "Central Sector Interest Subsidy (CSIS) during moratorium period. Up to 90% of course fee covered.",
        "eligibility": {
            "caste": "Scheduled Caste (SC)",
            "gender": "All",
            "age": "Below 35 years",
            "income_ceiling": 300000,
            "admission_mode": "Merit / Entrance exam clearance in recognized institution",
            "courses": ["B.Tech", "MBBS", "BDS", "MBA", "LLB", "M.Tech", "B.Pharma", "Nursing", "Polytechnic", "MS", "PhD"]
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
            "mba", "degree", "fees", "polytechnic", "nursing", "abroad", "foreign", "masters", "phd",
            "पढ़ाई", "कॉलेज", "इंजीनियरिंग", "मेडिकल", "शिक्षा ऋण", "विदेश", "घरेलू और विदेश"
        ],
        "tags": ["education", "domestic", "abroad", "student", "concessional", "nsfdc"]
    },
    {
        "id": "education_loan_abroad",
        "name": "Educational Loan Scheme for Studies Abroad",
        "name_hi": "विदेश अध्ययन शिक्षा ऋण योजना",
        "loan_type": "education",
        "target_group": "SC Students admitted to accredited universities abroad",
        "description": "Financial support for SC students pursuing Masters, PhD, MS, or specialized STEM/Management postgraduate courses in top recognized foreign universities (USA, UK, Germany, Canada, Australia, etc.). Up to ₹40.00 Lakhs or 90% of course fee.",
        "description_hi": "विदेश (USA, UK, जर्मनी, कनाडा आदि) के शीर्ष मान्यता प्राप्त विश्वविद्यालयों में मास्टर्स, एमएस, पीएचडी व उच्च शिक्षा हेतु ₹40.00 लाख तक (या 90% फीस) शिक्षा ऋण।",
        "max_loan": 4000000,
        "unit_cost_limit": 4000000,
        "interest_rate": 6.5,  # 6.5% p.a. for Beneficiary (2.5% p.a. for Channelizing Agency)
        "channelizing_agency_rate": 2.5,
        "moratorium_months": 12,
        "moratorium_details": "Course duration + 1 year",
        "repayment_tenure_months": 144,
        "subsidy_percentage": 100,
        "subsidy_details": "Interest subsidy during study moratorium. Special linkage with National Overseas Scholarship (NOS) guidance. 90% of course fee covered.",
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
            "phd", "overseas", "विदेश", "विदेश में पढ़ाई", "मास्टर्स", "इंटरनेशनल", "शिक्षा ऋण"
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
        "channelizing_agency_rate": 4.5,
        "moratorium_months": 18,
        "moratorium_details": "Up to 18 months moratorium",
        "repayment_tenure_months": 84,
        "repayment_tenure_details": "Up to 7 years repayment tenure",
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
