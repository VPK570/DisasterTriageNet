from flask import Blueprint, jsonify, request
from middleware.role_guard import require_role

victim_bp = Blueprint('victim_routes', __name__)

@victim_bp.route('/api/victim/status', methods=['GET'])
@require_role('victim')
def victim_status():
    return jsonify({
        "message": "Welcome to the Victim Portal",
        "user_id": request.user_id
    })

# Add other victim routes here...
