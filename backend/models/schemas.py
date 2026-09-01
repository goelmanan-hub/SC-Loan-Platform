from pydantic import BaseModel, Field
from typing import Optional


class SchemeRequest(BaseModel):
    income: float = Field(..., ge=0)
    project_type: Optional[str] = None
    project_cost: float = Field(0, ge=0)
    loan_required: float = Field(..., ge=0)
    education_status: Optional[str] = None
    loan_type: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class SchemeResponse(BaseModel):
    success: bool
    recommended_scheme: Optional[dict] = None
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