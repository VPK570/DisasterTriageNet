from flask import Blueprint, request, jsonify
from flask_bcrypt import Bcrypt
import uuid
from datetime import datetime, timezone
from models.user_model import create_user

register_bp = Blueprint('register', __name__)
bcrypt = Bcrypt()

@register_bp.route('/register', methods=['POST'])
def register():
    data = request.json
    if not data or not all(k in data for k in ("name", "email", "password", "role")):
        return jsonify({"error": "Missing required fields (name, email, password, role)"}), 400
        
    role = data['role'].lower()
    if role not in ["victim", "responder", "admin"]:
        return jsonify({"error": "Invalid role. Must be victim, responder, or admin."}), 400
        
    hashed_password = bcrypt.generate_password_hash(data['password']).decode('utf-8')
    user_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    
    success = create_user(
        user_id=user_id,
        name=data['name'],
        email=data['email'],
        password_hash=hashed_password,
        role=role,
        created_at=created_at
    )
    
    if not success:
        return jsonify({"error": "Email already registered"}), 409
        
    return jsonify({
        "message": "User registered successfully",
        "user_id": user_id,
        "role": role
    }), 201
