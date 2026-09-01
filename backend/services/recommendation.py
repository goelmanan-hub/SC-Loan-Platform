from data.schemes import get_all_schemes
from services.eligibility import normalize_loan_type


def recommend_scheme(user_data):

    loan_type = normalize_loan_type(
        user_data.get("loan_type")
    )

    loan_required = float(
        user_data.get("loan_required") or 0
    )

    project_cost = float(
        user_data.get("project_cost") or 0
    )

    business_type = str(user_data.get("business_type") or "").lower()
    micro_business_keywords = (
        "shop", "store", "tailor", "stitch", "dairy", "food", "tea",
        "salon", "beauty", "repair", "kirana", "दुकान", "सिलाई", "डेयरी",
        "खाना", "चाय", "सैलून", "मरम्मत"
    )
    term_business_keywords = (
        "manufactur", "factory", "transport", "vehicle", "machinery",
        "construction", "warehouse", "manufacturing", "कारखाना", "ट्रांसपोर्ट",
        "वाहन", "मशीन", "निर्माण", "गोदाम"
    )

    candidates = []

    for scheme in get_all_schemes():

        if scheme["loan_type"] != loan_type:
            continue

        if loan_required > scheme["max_loan"]:
            continue

        score = 0

        if loan_type == "education":
            score += 100

        elif loan_type == "business":

            # Categorise the proposed business, while always respecting the
            # scheme's maximum eligible loan amount.
            if any(word in business_type for word in micro_business_keywords):
                if scheme["id"] == "micro_finance":
                    score += 100
            elif any(word in business_type for word in term_business_keywords):
                if scheme["id"] == "term_loan":
                    score += 100
            elif loan_required <= 140000 and scheme["id"] == "micro_finance":
                score += 80
            elif loan_required > 140000 and scheme["id"] == "term_loan":
                score += 80

        if project_cost > 0:
            if project_cost <= scheme["max_loan"]:
                score += 20

        candidates.append({
            "scheme": scheme,
            "score": score
        })

    candidates.sort(
        key=lambda x: x["score"],
        reverse=True
    )

    if not candidates:
        return {
            "success": False,
            "recommended_scheme": None,
            "alternatives": [],
            "message": "No suitable scheme found from the available prototype data."
        }

    recommended = candidates[0]

    alternatives = [
        item["scheme"]
        for item in candidates[1:]
    ]

    return {
        "success": True,
        "recommended_scheme": recommended["scheme"],
        "score": recommended["score"],
        "alternatives": alternatives,
        "message": "Scheme recommendation generated based on the information provided."
    }
