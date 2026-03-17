import os
import jwt
import bcrypt
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional

from database import get_db
from models import User

logger = logging.getLogger(__name__)

JWT_SECRET = os.environ.get('JWT_SECRET', 'aqis-jwt-secret-key-2026-secure')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRY_HOURS = 24

auth_router = APIRouter(prefix="/api/auth")
users_router = APIRouter(prefix="/api/users")


# --- Pydantic models ---

class LoginRequest(BaseModel):
    username: str
    password: str

class CreateUserRequest(BaseModel):
    name: str
    username: str
    password: str
    email: Optional[str] = ''
    role: Optional[str] = 'AdCom Member'
    isAdminAccess: Optional[bool] = False
    isAvailable: Optional[bool] = True

class UpdateUserRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    isAdminAccess: Optional[bool] = None
    isAvailable: Optional[bool] = None
    password: Optional[str] = None


# --- Helpers ---

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user: User) -> str:
    payload = {
        'sub': user.id,
        'username': user.username,
        'role': user.role,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])


# --- Auth Routes ---

@auth_router.post("/login")
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == req.username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_token(user)
    return {
        "success": True,
        "token": token,
        "user": user.to_dict()
    }


# --- User Management Routes ---

@users_router.get("")
async def list_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).order_by(User.created_at))
    users = result.scalars().all()
    return [u.to_dict() for u in users]

@users_router.post("")
async def create_user(req: CreateUserRequest, db: AsyncSession = Depends(get_db)):
    # Check username uniqueness
    existing = await db.execute(select(User).where(User.username == req.username))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already exists")

    user = User(
        username=req.username,
        password_hash=hash_password(req.password),
        name=req.name,
        email=req.email or '',
        role=req.role or 'AdCom Member',
        is_admin_access=req.isAdminAccess or False,
        is_available=req.isAvailable if req.isAvailable is not None else True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user.to_dict()

@users_router.put("/{user_id}")
async def update_user(user_id: str, req: UpdateUserRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if req.name is not None:
        user.name = req.name
    if req.email is not None:
        user.email = req.email
    if req.role is not None:
        user.role = req.role
    if req.isAdminAccess is not None:
        user.is_admin_access = req.isAdminAccess
    if req.isAvailable is not None:
        user.is_available = req.isAvailable
    if req.password:
        user.password_hash = hash_password(req.password)

    await db.commit()
    await db.refresh(user)
    return user.to_dict()

@users_router.delete("/{user_id}")
async def delete_user(user_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await db.delete(user)
    await db.commit()
    return {"success": True, "message": "User deleted"}
