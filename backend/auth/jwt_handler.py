import jwt
from datetime import datetime, timedelta, timezone
import os

# Use a strong secret in production
JWT_SECRET = os.getenv("JWT_SECRET", "supersecretkey_for_disaster_triage_CHANGE_ME")
JWT_ALGORITHM = "HS256"

def sign_jwt(user_id: str, role: str):
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=24)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_jwt(token: str):
    try:
        decoded_token = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return decoded_token
    except Exception as e:
        return None
