SCHEMES = [
    {
        "id": "micro_finance",
        "name": "Micro Finance Scheme",
        "loan_type": "business",
        "description": "Suitable for small business or income-generating activities.",
        "max_loan": 140000,
        "interest_rate": 6.5,
        "moratorium_months": 3
    },

    {
        "id": "term_loan",
        "name": "Term Loan Scheme",
        "loan_type": "business",
        "description": "Suitable for larger business or project requirements.",
        "max_loan": 5000000,
        "interest_rate": 7.0,
        "moratorium_months": 6
    },

    {
        "id": "education_loan",
        "name": "Education Loan Scheme",
        "loan_type": "education",
        "description": "Suitable for eligible higher education requirements.",
        "max_loan": 5000000,
        "interest_rate": 7.0,
        "moratorium_months": 12
    }
]


def get_all_schemes():
    return SCHEMES


def get_scheme_by_id(scheme_id: str):
    for scheme in SCHEMES:
        if scheme["id"] == scheme_id:
            return scheme

    return None