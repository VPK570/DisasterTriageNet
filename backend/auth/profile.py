from flask import Blueprint, request, jsonify
from lib.role_guard import require_role
from lib.user_model import get_user_by_id

profile_bp = Blueprint('profile', __name__)

@profile_bp.route('/profile', methods=['GET'])
@require_role() # Any valid token works, since allowed_roles is empty
def get_profile():
    # request.user_id is set by the require_role decorator
    user = get_user_by_id(request.user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    return jsonify({
        "id": user['id'],
        "name": user['name'],
        "email": user['email'],
        "role": user['role'],
        "created_at": user['created_at']
    }), 200
