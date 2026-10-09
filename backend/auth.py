import os
import time
import hashlib
import hmac
import jwt
from typing import Optional, Dict
from pydantic import BaseModel, EmailStr

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "fraudguard_super_secret_jwt_key_2026_dbscan")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_SECONDS = 86400  # 24 hours

DEMO_USERNAME = os.getenv("DEMO_USERNAME", "admin")
DEMO_PASSWORD = os.getenv("DEMO_PASSWORD", "FraudGuard@2026")

class UserRegister(BaseModel):
    full_name: str
    email: EmailStr
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

def hash_password(password: str) -> str:
    salt = "fraudguard_secure_salt_2026"
    return hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    ).hex()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hmac.compare_digest(hash_password(plain_password), hashed_password)

# In-memory user database pre-seeded with demo account
USERS_DB: Dict[str, dict] = {
    DEMO_USERNAME: {
        "full_name": "System Administrator",
        "email": "admin@fraudguard.internal",
        "username": DEMO_USERNAME,
        "hashed_password": hash_password(DEMO_PASSWORD),
        "created_at": time.time()
    }
}

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = time.time() + ACCESS_TOKEN_EXPIRE_SECONDS
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except Exception:
        return None
