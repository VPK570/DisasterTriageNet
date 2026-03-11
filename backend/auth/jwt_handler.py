import jwt
from datetime import datetime, timedelta, timezone
import os

JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    # In development, warn loudly but use a temporary key so the server starts.
    # In production, set JWT_SECRET in your environment / .env file.
    import warnings
    warnings.warn(
        "JWT_SECRET environment variable is not set! Using an insecure temporary key. "
        "Set JWT_SECRET in a .env file before deploying.",
        stacklevel=2
    )
    JWT_SECRET = "INSECURE_DEV_KEY_REPLACE_ME"

JWT_ALGORITHM = "HS256"

def sign_jwt(user_id: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=24)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_jwt(token: str):
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        return None  # Token has expired
    except jwt.InvalidTokenError:
        return None  # Token is invalid
