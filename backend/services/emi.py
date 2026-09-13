def calculate_emi(
    principal,
    annual_interest_rate,
    tenure_months,
    moratorium_months=0
):
    try:
        principal = float(principal)
        annual_interest_rate = float(annual_interest_rate)
        tenure_months = int(tenure_months)
        moratorium_months = int(moratorium_months or 0)
    except (ValueError, TypeError):
        return {"error": "अमान्य संख्यात्मक इनपुट। / Invalid numerical inputs provided for EMI calculation."}

    if principal <= 0:
        return {"error": "ऋण राशि ₹0 से अधिक होनी चाहिए (कम से कम ₹1,000)। / Loan amount must be greater than ₹0 (min ₹1,000)."}
    if principal > 500000000:
        return {"error": "ऋण राशि अधिकतम सीमा (₹50 करोड़) से अधिक नहीं हो सकती। / Loan amount cannot exceed ₹50 Crore."}
    if annual_interest_rate < 0 or annual_interest_rate > 36:
        return {"error": "वार्षिक ब्याज दर 0% से 36% के बीच होनी चाहिए। / Interest rate must be between 0% and 36%."}
    if tenure_months < 1 or tenure_months > 360:
        return {"error": "ऋण अवधि 1 से 360 महीने (30 वर्ष) के बीच होनी चाहिए। / Loan tenure must be between 1 and 360 months."}
    if moratorium_months < 0:
        return {"error": "मोरैटोरियम अवधि ऋणात्मक नहीं हो सकती। / Moratorium period cannot be negative."}
    if moratorium_months >= tenure_months:
        return {"error": "मोरैटोरियम अवधि (Moratorium Period) कुल ऋण अवधि (Tenure) से कम होनी चाहिए। / Moratorium period must be strictly less than total loan tenure."}

    repayment_months = tenure_months - moratorium_months
    monthly_rate = annual_interest_rate / 12 / 100

    if monthly_rate == 0:
        emi = principal / repayment_months
    else:
        try:
            factor = (1 + monthly_rate) ** repayment_months
            if factor == float("inf") or factor <= 1:
                return {"error": "अत्यधिक मान के कारण गणना संभव नहीं है। / Calculation overflow due to unrealistic values."}
            emi = (principal * monthly_rate * factor) / (factor - 1)
        except OverflowError:
            return {"error": "अत्यधिक मान के कारण गणना संभव नहीं है। / Calculation overflow error."}

    total_payment = emi * repayment_months
    total_interest = max(0.0, total_payment - principal)

    return {
        "loan_amount": round(principal, 2),
        "interest_rate": annual_interest_rate,
        "tenure_months": tenure_months,
        "moratorium_months": moratorium_months,
        "repayment_months": repayment_months,
        "monthly_emi": round(emi, 2),
        "total_interest": round(total_interest, 2),
        "total_payment": round(total_payment, 2)
    }