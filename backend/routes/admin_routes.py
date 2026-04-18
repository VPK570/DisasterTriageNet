from flask import Blueprint, jsonify, request
from lib.role_guard import require_role

admin_bp = Blueprint('admin_routes', __name__)

@admin_bp.route('/api/admin/system', methods=['GET'])
@require_role('admin')
def admin_system():
    return jsonify({
        "message": "Welcome to the Command Center",
        "user_id": request.user_id
    })

# Add other admin routes here...
