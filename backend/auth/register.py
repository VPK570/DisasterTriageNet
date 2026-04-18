from flask import Blueprint, request, jsonify
from flask_bcrypt import Bcrypt
import uuid
from datetime import datetime, timezone
from lib.user_model import create_user
from lib.validators import validate_email, validate_password

register_bp = Blueprint('register', __name__)
bcrypt = Bcrypt()

@register_bp.route('/register', methods=['POST'])
def register():
    data = request.json
    if not data or not all(k in data for k in ("name", "email", "password", "role")):
        return jsonify({"error": "Missing required fields (name, email, password, role)"}), 400

    email_error = validate_email(data['email'])
    if email_error:
        return jsonify({"error": email_error}), 400

    password_error = validate_password(data['password'])
    if password_error:
        return jsonify({"error": password_error}), 400

    if not data.get('name') or len(data['name'].strip()) < 2:
        return jsonify({"error": "Name must be at least 2 characters"}), 400
        
    role = data['role'].lower()
    if role not in ["victim", "responder", "admin"]:
        return jsonify({"error": "Invalid role. Must be victim, responder, or admin."}), 400
        
    hashed_password = bcrypt.generate_password_hash(data['password']).decode('utf-8')
    user_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    
    success = create_user(
        user_id=user_id,
        name=data['name'].strip(),
        email=data['email'].strip().lower(),
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
