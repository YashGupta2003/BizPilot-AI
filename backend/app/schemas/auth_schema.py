"""
Pydantic schemas = the "shape" of data going IN and OUT of your API.

CONCEPT: These are NOT the same as MongoDB documents. Schemas validate
HTTP request/response bodies. MongoDB documents are just Python dicts.
We convert between them in the route functions.
"""
from pydantic import BaseModel, EmailStr, Field


class UserSignup(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(..., min_length=6)
    business_name: str = Field(..., min_length=2, max_length=120)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    business_name: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
