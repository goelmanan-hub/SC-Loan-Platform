PARTNERS = [
    {
        "id": "partner_001",
        "name": "Demo SCA Partner",
        "type": "SCA",
        "city": "Kurukshetra",
        "latitude": 29.9695,
        "longitude": 76.8783,
        "loan_types": ["business", "education"],
        "schemes": [
            "micro_finance",
            "term_loan",
            "education_loan"
        ]
    },

    {
        "id": "partner_002",
        "name": "Demo Public Sector Bank",
        "type": "PSB",
        "city": "Karnal",
        "latitude": 29.6857,
        "longitude": 76.9905,
        "loan_types": ["business", "education"],
        "schemes": [
            "term_loan",
            "education_loan"
        ]
    },

    {
        "id": "partner_003",
        "name": "Demo RRB Partner",
        "type": "RRB",
        "city": "Ambala",
        "latitude": 30.3782,
        "longitude": 76.7767,
        "loan_types": ["business"],
        "schemes": [
            "micro_finance",
            "term_loan"
        ]
    }
]


def get_all_partners():
    return PARTNERS