from pydantic import BaseModel
from typing import Optional

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    refresh_token: Optional[str] = None
    role: Optional[str] = None # Trả về role để Frontend biết đường điều hướng (Admin/Student UI)

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None
    account_id: Optional[int] = None