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
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    loan_type: Optional[str] = None
    scheme_id: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    partner_type: Optional[str] = None
    query: Optional[str] = None
    radius_km: Optional[float] = None
    top_k: Optional[int] = 10


class PartnerSearchRequest(BaseModel):
    query: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    loan_type: Optional[str] = None
    scheme_id: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    partner_type: Optional[str] = None
    radius_km: Optional[float] = None
    top_k: Optional[int] = 10


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


class SendOtpRequest(BaseModel):
    phone: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    full_name: Optional[str] = None
    language: Optional[str] = None

    def get_phone(self) -> str:
        p = self.phone or self.phone_number or ""
        return "".join(c for c in p if c.isdigit() or c == "+")

    def get_name(self) -> Optional[str]:
        return self.name or self.full_name or "आवेदक"


class VerifyOtpRequest(BaseModel):
    phone: Optional[str] = None
    phone_number: Optional[str] = None
    otp_code: Optional[str] = None
    otp: Optional[str] = None
    name: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None

    def get_phone(self) -> str:
        p = self.phone or self.phone_number or ""
        return "".join(c for c in p if c.isdigit() or c == "+")

    def get_otp(self) -> str:
        return (self.otp_code or self.otp or "").strip()

    def get_name(self) -> Optional[str]:
        return self.name or self.full_name or "आवेदक"


class SaveAssessmentRequest(BaseModel):
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    phone: Optional[str] = None
    phone_number: Optional[str] = None
    scheme_id: Optional[str] = None
    recommended_scheme_id: Optional[str] = None
    scheme_name: Optional[str] = None
    recommended_scheme_name: Optional[str] = None
    readiness_score: Optional[int] = None
    readiness_badge: Optional[str] = None
    readiness_band: Optional[str] = None
    loan_amount: Optional[float] = None
    loan_required: Optional[float] = None
    loan_type: Optional[str] = None
    annual_income: Optional[float] = None
    income: Optional[float] = None
    tenure_months: Optional[int] = None
    purpose: Optional[str] = None
    location: Optional[str] = None
    applicant_location: Optional[str] = None
    pillars: Optional[Dict[str, Any]] = None
    tips: Optional[List[str]] = None
    status_details: Optional[Dict[str, Any]] = None