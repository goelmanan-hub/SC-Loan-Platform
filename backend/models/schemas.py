from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class SchemeRequest(BaseModel):
    income: float = Field(0, ge=0)
    project_type: Optional[str] = None
    business_type: Optional[str] = None
    project_cost: float = Field(0, ge=0)
    loan_required: float = Field(..., ge=0)
    education_status: Optional[str] = None
    education_course: Optional[str] = None
    loan_type: Optional[str] = None
    gender: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class SchemeResponse(BaseModel):
    success: bool
    recommended_scheme: Optional[dict] = None
    match_score: Optional[int] = 0
    reasons: Optional[List[str]] = []
    subsidy_info: Optional[str] = ""
    documents_required: Optional[List[str]] = []
    hindi_explanation: Optional[str] = ""
    alternatives: list = []
    message: str = ""


class EMIRequest(BaseModel):
    principal: float = Field(..., gt=0)
    annual_interest_rate: float = Field(..., ge=0)
    tenure_months: int = Field(..., gt=0)
    moratorium_months: int = Field(0, ge=0)


class PartnerRequest(BaseModel):
    latitude: float
    longitude: float
    loan_type: Optional[str] = None
    scheme_id: Optional[str] = None


class ReadinessRequest(BaseModel):
    loan_type: Optional[str] = None
    loan_required: float = Field(..., ge=0)
    income: float = Field(0, ge=0)
    tenure_months: Optional[int] = Field(36, gt=0)
    business_type: Optional[str] = None
    education_course: Optional[str] = None
    gender: Optional[str] = None
    location: Optional[str] = None
    scheme_id: Optional[str] = None
    caste_status: Optional[str] = None
    docs_status: Optional[str] = None
    experience: Optional[str] = None
    existing_emi: Optional[float] = Field(0, ge=0)
    credit_history: Optional[str] = None