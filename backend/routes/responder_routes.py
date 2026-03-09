from flask import Blueprint, jsonify, request
from middleware.role_guard import require_role

responder_bp = Blueprint('responder_routes', __name__)

@responder_bp.route('/api/responder/dashboard', methods=['GET'])
@require_role('responder')
def responder_dashboard():
    return jsonify({
        "message": "Welcome to the First Responder Dashboard",
        "user_id": request.user_id
    })

# Add other responder routes here...
