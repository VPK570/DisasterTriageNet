from functools import wraps
from flask import request, jsonify
from auth.jwt_handler import decode_jwt

def require_role(*allowed_roles):
    """
    Decorator to protect routes based on user role.
    Admin has full system access and overrides the allowed_roles check.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                return jsonify({"error": "Missing or invalid authorization header"}), 401
            
            token = auth_header.split(" ")[1]
            decoded = decode_jwt(token)
            
            if not decoded:
                return jsonify({"error": "Invalid or expired token"}), 401
                
            user_role = decoded.get("role")
            
            # Admin has full system access, otherwise check if user's role is in the allowed list
            if user_role != "admin":
                if allowed_roles and user_role not in allowed_roles:
                    return jsonify({"error": f"Role '{user_role}' not authorized to access this resource"}), 403
            
            # Securely attach user details into the Flask request context
            request.user_id = decoded.get("user_id")
            request.user_role = user_role
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator
