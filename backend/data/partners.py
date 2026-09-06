PARTNERS = [
    {
        "id": "partner_001",
        "name": "State Channelising Agency (SCA) - District Office",
        "type": "SCA",
        "city": "Kurukshetra",
        "latitude": 29.9695,
        "longitude": 76.8783,
        "loan_types": ["business", "education"],
        "schemes": [
            "mahila_samriddhi_yojana",
            "micro_finance",
            "laghu_udhyami_yojana",
            "green_business_scheme",
            "term_loan",
            "education_loan",
            "education_loan_abroad",
            "stand_up_india_sc"
        ]
    },

    {
        "id": "partner_002",
        "name": "Public Sector Bank - Lead Bank Office",
        "type": "PSB",
        "city": "Karnal",
        "latitude": 29.6857,
        "longitude": 76.9905,
        "loan_types": ["business", "education"],
        "schemes": [
            "term_loan",
            "education_loan",
            "education_loan_abroad",
            "stand_up_india_sc",
            "green_business_scheme"
        ]
    },

    {
        "id": "partner_003",
        "name": "Regional Rural Bank (RRB) - Gramin Branch",
        "type": "RRB",
        "city": "Ambala",
        "latitude": 30.3782,
        "longitude": 76.7767,
        "loan_types": ["business", "education"],
        "schemes": [
            "mahila_samriddhi_yojana",
            "micro_finance",
            "laghu_udhyami_yojana",
            "green_business_scheme",
            "term_loan",
            "education_loan"
        ]
    }
]


def get_all_partners():
    return PARTNERS