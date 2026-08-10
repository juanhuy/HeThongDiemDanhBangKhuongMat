from pydantic import BaseModel
from datetime import datetime

class FaceFeatureResponse(BaseModel):
    feature_id: int
    student_id: str
    is_primary: bool
    model_version: str
    created_at: datetime

    class Config:
        from_attributes = True