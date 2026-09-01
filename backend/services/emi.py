def calculate_emi(
    principal,
    annual_interest_rate,
    tenure_months,
    moratorium_months=0
):

    principal = float(principal)
    annual_interest_rate = float(
        annual_interest_rate
    )
    tenure_months = int(tenure_months)
    moratorium_months = int(
        moratorium_months
    )

    monthly_rate = (
        annual_interest_rate / 12 / 100
    )

    repayment_months = (
        tenure_months - moratorium_months
    )

    if repayment_months <= 0:
        repayment_months = tenure_months

    if monthly_rate == 0:

        emi = principal / repayment_months

    else:

        emi = (
            principal
            * monthly_rate
            * (1 + monthly_rate) ** repayment_months
            /
            (
                (1 + monthly_rate)
                ** repayment_months
                - 1
            )
        )

    total_payment = (
        emi * repayment_months
    )

    total_interest = (
        total_payment - principal
    )

    return {
        "loan_amount": round(principal, 2),
        "interest_rate": annual_interest_rate,
        "tenure_months": tenure_months,
        "moratorium_months": moratorium_months,
        "repayment_months": repayment_months,
        "monthly_emi": round(emi, 2),
        "total_interest": round(
            total_interest, 2
        ),
        "total_payment": round(
            total_payment, 2
        )
    }