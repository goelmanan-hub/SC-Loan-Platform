from data.schemes import get_all_schemes


def normalize_loan_type(value):

    if not value:
        return ""

    value = value.lower().strip()

    if "education" in value:
        return "education"

    if "business" in value or "project" in value:
        return "business"

    return value


def check_eligibility(user_data):

    income = float(user_data.get("income") or 0)
    loan_required = float(user_data.get("loan_required") or 0)
    loan_type = normalize_loan_type(
        user_data.get("loan_type")
    )

    results = []

    for scheme in get_all_schemes():

        if scheme["loan_type"] != loan_type:
            continue

        if loan_required > scheme["max_loan"]:
            continue

        results.append({
            "scheme": scheme,
            "eligible": True,
            "reason": "Your entered loan requirement is within the prototype scheme limit."
        })

    return results