"""
RAG-Powered Scheme Recommendation Engine for Scheduled Caste (SC) Beneficiaries.
Uses hybrid semantic retrieval + grounded LLM reasoning (OpenRouter/OpenAI) with deterministic fallback.
"""

import os
import json
import re
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv
from openai import OpenAI

from data.schemes_kb import get_scheme_by_id_kb, get_all_schemes_kb
from services.rag_service import retrieve_candidate_schemes, build_rag_scheme_context
from services.eligibility import normalize_loan_type

load_dotenv()
API_KEY = os.getenv("OPENROUTER_API_KEY")

openai_client = None
if API_KEY:
    try:
        openai_client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=API_KEY
        )
    except Exception as e:
        print("Recommendation: OpenRouter client init error:", e)


RAG_RECOMMENDER_SYSTEM_PROMPT = """
You are the Scheme Recommendation Reasoning Engine of "YojanaSetu" (योजनासेतु), an AI platform empowering Scheduled Caste (SC) beneficiaries with concessional government loans (NSFDC, SCA, Stand-Up India).

YOUR TASK:
Given the beneficiary's profile and the retrieved candidate schemes from the official knowledge base, analyze the best match and output a strictly valid JSON response.

GROUNDING RULES:
1. ONLY recommend a scheme from the provided [RETRIEVED SCHEME CANDIDATES].
2. Highlight any concessional interest rates, subsidies (e.g. Mahila Samriddhi 1% rebate, CSIS education subsidy, SCA margin money), and moratorium benefits.
3. Compose a warm, simple, spoken Hindi explanation (hindi_explanation) in Devanagari script so it can be synthesized via Text-to-Speech for beneficiaries who prefer voice.
4. Output MUST be ONLY a single JSON object with no markdown ticks or extra conversational filler.

OUTPUT JSON SCHEMA:
{
  "recommended_scheme_id": "<scheme_id from candidates>",
  "match_score": <integer from 60 to 98>,
  "reasons": [
    "<Concise reason 1: Why user profile matches this scheme>",
    "<Concise reason 2: Interest rate / subsidy / repayment advantage>"
  ],
  "subsidy_info": "<Specific subsidy or concession detail>",
  "documents_required": [
    "<Document 1>",
    "<Document 2>",
    "<Document 3>"
  ],
  "hindi_explanation": "<Polite, simple 2-3 sentence Hindi explanation of why this scheme was chosen and how it helps them>",
  "alternative_scheme_ids": ["<other candidate scheme id>"]
}
"""


def _generate_fallback_recommendation(candidates: List[Dict[str, Any]], user_data: Dict[str, Any]) -> Dict[str, Any]:
    """Deterministic fallback generator when LLM API is unavailable or unparseable."""
    if not candidates:
        all_schemes = get_all_schemes_kb()
        fallback_scheme = all_schemes[0]
        return {
            "success": True,
            "recommended_scheme": fallback_scheme,
            "match_score": 75,
            "reasons": ["Standard concessional scheme for eligible SC applicants."],
            "subsidy_info": fallback_scheme.get("subsidy_details", "Government subsidy applicable per SCA norms."),
            "documents_required": fallback_scheme.get("mandatory_documents", []),
            "hindi_explanation": f"आपके आवेदन के लिए '{fallback_scheme.get('name_hi')}' उपयुक्त है। इसमें रियायती ब्याज दर और आसान किश्तें उपलब्ध हैं।",
            "alternatives": all_schemes[1:3],
            "message": "Scheme recommended via deterministic eligibility engine."
        }

    top_candidate = candidates[0]["scheme"]
    retrieval_score = candidates[0].get("retrieval_score", 85)
    match_score = min(int(retrieval_score), 98)

    # Derive reasons
    reasons = []
    loan_req = user_data.get("loan_required") or 0
    if loan_req and loan_req <= top_candidate.get("max_loan", 0):
        reasons.append(f"Requested loan amount of ₹{float(loan_req):,.0f} falls within the scheme maximum ceiling of ₹{top_candidate.get('max_loan', 0):,}.")
    reasons.append(f"Concessional interest rate of {top_candidate.get('interest_rate')}% p.a. with {top_candidate.get('moratorium_months', 0)} months initial moratorium.")

    alt_schemes = [c["scheme"] for c in candidates[1:3]]

    hindi_summary = (
        f"आपके दिए गए विवरण के आधार पर '{top_candidate.get('name_hi', top_candidate.get('name'))}' "
        f"सबसे उपयुक्त योजना है। इसमें केवल {top_candidate.get('interest_rate')}% वार्षिक ब्याज दर पर ऋण सुविधा उपलब्ध है।"
    )

    return {
        "success": True,
        "recommended_scheme": top_candidate,
        "match_score": match_score,
        "reasons": reasons,
        "subsidy_info": top_candidate.get("subsidy_details", "SCA interest concession / subsidy applicable."),
        "documents_required": top_candidate.get("mandatory_documents", []),
        "hindi_explanation": hindi_summary,
        "alternatives": alt_schemes,
        "message": "Scheme recommendation generated using RAG vector engine."
    }


def recommend_scheme(user_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main entry point for Scheme Recommendation.
    Implements RAG (Retrieval-Augmented Generation):
    1. Hybrid Semantic Vector Retrieval over official scheme knowledge.
    2. Grounded LLM reasoning via OpenRouter.
    3. Resilient fallback if LLM is unavailable.
    """
    normalized_data = dict(user_data)
    normalized_data["loan_type"] = normalize_loan_type(user_data.get("loan_type"))

    # Step 1: Hybrid Retrieval of Candidates
    candidates = retrieve_candidate_schemes(normalized_data, top_k=4)

    if not candidates:
        return {
            "success": False,
            "recommended_scheme": None,
            "match_score": 0,
            "reasons": [],
            "subsidy_info": "",
            "documents_required": [],
            "hindi_explanation": "आपके दिए गए विवरण के अनुसार कोई उपयुक्त योजना नहीं मिली। कृपया विवरण पुनः जांचें।",
            "alternatives": [],
            "message": "No matching government loan scheme found for the requested parameters."
        }

    # Step 2: Build Grounded Context for LLM
    rag_context = build_rag_scheme_context(candidates)

    user_profile_summary = f"""
Beneficiary Application Details:
- Loan Category: {normalized_data.get('loan_type')}
- Loan Required: ₹{float(normalized_data.get('loan_required') or 0):,}
- Project / Business Type: {normalized_data.get('business_type') or normalized_data.get('project_type') or 'General'}
- Education Course (if applicable): {normalized_data.get('education_course') or normalized_data.get('education_status') or 'N/A'}
- Family Annual Income: ₹{float(normalized_data.get('income') or 0):,}
- Gender: {normalized_data.get('gender') or 'Not specified'}
- Location / State: {normalized_data.get('location') or 'India'}
"""

    # Step 3: LLM Reasoning
    if openai_client:
        try:
            response = openai_client.chat.completions.create(
                model="openai/gpt-4o-mini",
                messages=[
                    {"role": "system", "content": RAG_RECOMMENDER_SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": f"[RETRIEVED SCHEME CANDIDATES]\n{rag_context}\n\n[BENEFICIARY PROFILE]\n{user_profile_summary}\n\nPlease generate the grounded recommendation JSON:"
                    }
                ],
                temperature=0.2,
                max_tokens=800
            )

            raw_text = response.choices[0].message.content.strip()

            # Clean JSON formatting
            clean_json = re.sub(r"^```json\s*", "", raw_text)
            clean_json = re.sub(r"\s*```$", "", clean_json).strip()

            llm_result = json.loads(clean_json)

            rec_id = llm_result.get("recommended_scheme_id")
            recommended_scheme = get_scheme_by_id_kb(rec_id) or candidates[0]["scheme"]

            alt_ids = llm_result.get("alternative_scheme_ids", [])
            alternatives = []
            for a_id in alt_ids:
                s = get_scheme_by_id_kb(a_id)
                if s and s["id"] != recommended_scheme["id"]:
                    alternatives.append(s)

            if not alternatives:
                alternatives = [c["scheme"] for c in candidates if c["scheme"]["id"] != recommended_scheme["id"]][:2]

            return {
                "success": True,
                "recommended_scheme": recommended_scheme,
                "match_score": int(llm_result.get("match_score", 90)),
                "reasons": llm_result.get("reasons", [
                    f"Aligned with {recommended_scheme.get('name')}",
                    f"Concessional interest rate of {recommended_scheme.get('interest_rate')}%"
                ]),
                "subsidy_info": llm_result.get("subsidy_info") or recommended_scheme.get("subsidy_details", ""),
                "documents_required": llm_result.get("documents_required") or recommended_scheme.get("mandatory_documents", []),
                "hindi_explanation": llm_result.get("hindi_explanation", ""),
                "alternatives": alternatives,
                "message": "Scheme recommendation generated successfully using RAG model."
            }

        except Exception as e:
            print("RAG LLM recommendation call failed, using deterministic fallback:", e)

    # Step 4: Fallback if LLM failed or API key missing
    return _generate_fallback_recommendation(candidates, normalized_data)
