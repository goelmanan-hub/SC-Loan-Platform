"""
RAG (Retrieval-Augmented Generation) Vector & Semantic Search Service for SC Loan Schemes.
Provides hybrid retrieval (hard constraint filtering + vector semantic search) over official scheme knowledge.
"""

import os
import math
import re
from typing import List, Dict, Any, Optional
from data.schemes_kb import get_all_schemes_kb, get_scheme_by_id_kb

# Optional OpenAI / OpenRouter client
from dotenv import load_dotenv
from openai import OpenAI

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
        print("RAG: Could not initialize OpenAI client for embeddings:", e)


# =====================================================
# IN-MEMORY VECTOR STORE & TF-IDF SEMANTIC ENGINE
# =====================================================

class SchemeVectorStore:
    """
    Lightweight, deterministic semantic vector store with TF-IDF and token n-gram embeddings.
    Provides fast, zero-dependency semantic search across scheme documents.
    """
    def __init__(self):
        self.documents: List[Dict[str, Any]] = []
        self.vocab: Dict[str, int] = {}
        self.doc_vectors: List[Dict[int, float]] = []
        self.idf: Dict[int, float] = {}
        self._build_index()

    def _tokenize(self, text: str) -> List[str]:
        """Tokenize English, Hindi, and numeric strings."""
        if not text:
            return []
        cleaned = re.sub(r"[^\w\s\u0900-\u097F]", " ", str(text).lower())
        tokens = [t for t in cleaned.split() if len(t) > 1]
        return tokens

    def _build_index(self):
        schemes = get_all_schemes_kb()
        self.documents = schemes
        num_docs = len(schemes)

        # 1. Build document text representations
        doc_tokens_list = []
        df: Dict[str, int] = {}

        for scheme in schemes:
            eligibility_str = " ".join([f"{k} {v}" for k, v in scheme.get("eligibility", {}).items()])
            docs_str = " ".join(scheme.get("mandatory_documents", []))
            keywords_str = " ".join(scheme.get("keywords", []))
            tags_str = " ".join(scheme.get("tags", []))

            full_text = f"""
            {scheme.get('name', '')}
            {scheme.get('name_hi', '')}
            {scheme.get('loan_type', '')}
            {scheme.get('target_group', '')}
            {scheme.get('description', '')}
            {scheme.get('description_hi', '')}
            {scheme.get('subsidy_details', '')}
            Max loan: {scheme.get('max_loan', 0)}
            Interest rate: {scheme.get('interest_rate', 0)}%
            {eligibility_str}
            {docs_str}
            {keywords_str}
            {tags_str}
            """
            tokens = self._tokenize(full_text)
            doc_tokens_list.append(tokens)

            unique_tokens = set(tokens)
            for token in unique_tokens:
                df[token] = df.get(token, 0) + 1

        # 2. Build Vocabulary & IDF
        self.vocab = {token: idx for idx, token in enumerate(df.keys())}
        for token, count in df.items():
            token_idx = self.vocab[token]
            self.idf[token_idx] = math.log((num_docs + 1) / (count + 1)) + 1.0

        # 3. Compute TF-IDF Vectors for each document
        self.doc_vectors = []
        for tokens in doc_tokens_list:
            vec: Dict[int, float] = {}
            total = len(tokens)
            if total == 0:
                self.doc_vectors.append(vec)
                continue

            tf: Dict[int, int] = {}
            for t in tokens:
                if t in self.vocab:
                    idx = self.vocab[t]
                    tf[idx] = tf.get(idx, 0) + 1

            norm_sq = 0.0
            for idx, count in tf.items():
                val = (count / total) * self.idf.get(idx, 1.0)
                vec[idx] = val
                norm_sq += val * val

            norm = math.sqrt(norm_sq) or 1.0
            for idx in vec:
                vec[idx] /= norm

            self.doc_vectors.append(vec)

    def query_similarity(self, query_text: str) -> List[float]:
        """Compute cosine similarity scores for a given query string against all schemes."""
        tokens = self._tokenize(query_text)
        if not tokens:
            return [0.0] * len(self.documents)

        # Build query vector
        tf: Dict[int, int] = {}
        for t in tokens:
            if t in self.vocab:
                idx = self.vocab[t]
                tf[idx] = tf.get(idx, 0) + 1

        if not tf:
            return [0.0] * len(self.documents)

        q_vec: Dict[int, float] = {}
        total = len(tokens)
        norm_sq = 0.0
        for idx, count in tf.items():
            val = (count / total) * self.idf.get(idx, 1.0)
            q_vec[idx] = val
            norm_sq += val * val

        norm = math.sqrt(norm_sq) or 1.0
        for idx in q_vec:
            q_vec[idx] /= norm

        # Compute Cosine Similarities
        scores = []
        for d_vec in self.doc_vectors:
            score = sum(val * d_vec.get(idx, 0.0) for idx, val in q_vec.items())
            scores.append(score)

        return scores


# Global vector store instance
VECTOR_STORE = SchemeVectorStore()


# =====================================================
# HYBRID RETRIEVER
# =====================================================

def retrieve_candidate_schemes(user_data: Dict[str, Any], top_k: int = 4) -> List[Dict[str, Any]]:
    """
    Hybrid retriever that:
    1. Applies hard business/education eligibility filters.
    2. Incorporates loan amount limits.
    3. Runs semantic vector scoring against user queries, business types, and education goals.
    4. Applies domain-specific rule bonuses (e.g. women entrepreneur benefits, green energy).
    """
    schemes = get_all_schemes_kb()
    loan_type = str(user_data.get("loan_type") or "").strip().lower()
    if any(w in loan_type for w in ["edu", "study", "college", "शिक्षा"]):
        loan_type = "education"
    elif any(w in loan_type for w in ["bus", "व्यापार", "व्यवसाय", "loan", "shop"]):
        loan_type = "business"

    loan_required = float(user_data.get("loan_required") or user_data.get("project_cost") or 0)
    business_type = str(user_data.get("business_type") or user_data.get("project_type") or "").strip()
    education_course = str(user_data.get("education_course") or user_data.get("education_status") or "").strip()
    gender = str(user_data.get("gender") or "").strip().lower()
    query_text = f"{loan_type} {business_type} {education_course} {user_data.get('additional_info', '')}"

    # Semantic Vector Search Scores
    sim_scores = VECTOR_STORE.query_similarity(query_text)

    candidates = []
    for idx, scheme in enumerate(schemes):
        # 1. Hard Filter: Loan Type Mismatch
        if loan_type and scheme.get("loan_type") != loan_type:
            continue

        # 2. Hard Filter: Loan Required exceeds scheme maximum (with 10% headroom)
        if loan_required > (scheme["max_loan"] * 1.1) and scheme["max_loan"] > 0:
            continue

        base_score = 50.0  # Base eligibility score for type match

        # 3. Add Vector Similarity Score (scaled 0-40)
        sim_score = sim_scores[idx] if idx < len(sim_scores) else 0.0
        base_score += min(sim_score * 80.0, 40.0)

        # 4. Domain Specific Relevance Rules:
        # A. Female entrepreneur special schemes
        if (gender in ["female", "woman", "महिला", "f"] or "mahila" in query_text.lower() or "महिला" in query_text) and scheme["id"] == "mahila_samriddhi_yojana":
            base_score += 30.0

        # B. Green business / EV / Solar
        if any(w in query_text.lower() for w in ["e-rickshaw", "erickshaw", "solar", "green", "ev", "ई-रिक्शा", "सोलर", "पर्यावरण"]) and scheme["id"] == "green_business_scheme":
            base_score += 35.0

        # C. Skilled / ITI / Polytechnic
        if any(w in query_text.lower() for w in ["iti", "polytechnic", "skill", "technician", "repair", "service", "प्रशिक्षित", "कुशल"]) and scheme["id"] == "laghu_udhyami_yojana":
            base_score += 25.0

        # D. Abroad Education
        if any(w in query_text.lower() for w in ["abroad", "foreign", "usa", "uk", "germany", "overseas", "विदेश"]) and scheme["id"] == "education_loan_abroad":
            base_score += 40.0
        elif loan_type == "education" and scheme["id"] == "education_loan" and not any(w in query_text.lower() for w in ["abroad", "foreign", "विदेश"]):
            base_score += 25.0

        # E. High value commercial greenfield
        if loan_required > 2000000 and scheme["id"] in ["stand_up_india_sc", "term_loan"]:
            base_score += 20.0

        # F. Micro amount matching
        if loan_required > 0 and loan_required <= 140000 and scheme["id"] in ["micro_finance", "mahila_samriddhi_yojana"]:
            base_score += 15.0

        candidates.append({
            "scheme": scheme,
            "retrieval_score": round(base_score, 2),
            "vector_similarity": round(sim_score, 4)
        })

    # Sort descending by score
    candidates.sort(key=lambda x: x["retrieval_score"], reverse=True)
    return candidates[:top_k]


# =====================================================
# RAG CONTEXT BUILDER
# =====================================================

def build_rag_scheme_context(candidates: List[Dict[str, Any]]) -> str:
    """Formats retrieved schemes into rich, grounded context for LLM prompt."""
    if not candidates:
        return "No specific matching scheme found."

    context_blocks = []
    for rank, item in enumerate(candidates, 1):
        s = item["scheme"]
        block = f"""
[SCHEME CANDIDATE #{rank}]
ID: {s.get('id')}
Name: {s.get('name')} ({s.get('name_hi')})
Loan Type: {s.get('loan_type')}
Target Beneficiary: {s.get('target_group')}
Max Loan Ceiling: ₹{s.get('max_loan', 0):,}
Interest Rate: {s.get('interest_rate')}% p.a.
Moratorium Period: {s.get('moratorium_months', 0)} months
Repayment Tenure: {s.get('repayment_tenure_months', 36)} months
Subsidy & Concession Details: {s.get('subsidy_details')}
Overview: {s.get('description')}
Overview (Hindi): {s.get('description_hi')}
Key Eligibility: {s.get('eligibility')}
Mandatory Documents: {", ".join(s.get('mandatory_documents', []))}
"""
        context_blocks.append(block.strip())

    return "\n\n".join(context_blocks)
