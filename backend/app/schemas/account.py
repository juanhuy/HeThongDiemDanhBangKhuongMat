from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class AccountBase(BaseModel):
    username: str = Field(..., example="N22DCCN160")
    role: str = Field(..., example="student") # admin, lecturer, student

class AccountCreate(AccountBase):
    password: str = Field(..., example="123456")

class AccountUpdate(BaseModel):
    password: Optional[str] = None
    is_active: Optional[bool] = None

class AccountResponse(AccountBase):
    account_id: int
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True