from flask import Blueprint, request, jsonify
from flask_bcrypt import Bcrypt
from lib.user_model import get_user_by_email
from auth.jwt_handler import sign_jwt
from lib.rate_limiter import rate_limit

login_bp = Blueprint('login', __name__)
bcrypt = Bcrypt()

@login_bp.route('/login', methods=['POST'])
@rate_limit(max_requests=5, window_seconds=60, key_func=lambda: request.json.get('email', request.remote_addr))
def login():
    data = request.json
    if not data or not all(k in data for k in ("email", "password")):
        return jsonify({"error": "Missing required fields (email, password)"}), 400
        
    user = get_user_by_email(data['email'])
    
    if not user or not bcrypt.check_password_hash(user['password_hash'], data['password']):
        return jsonify({"error": "Invalid email or password"}), 401
        
    token = sign_jwt(user['id'], user['role'])
    
    return jsonify({
        "access_token": token,
        "role": user['role'],
        "user_id": user['id']
    }), 200
