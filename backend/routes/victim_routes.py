from flask import Blueprint, jsonify, request
from lib.role_guard import require_role
import qrcode
import io
import base64

victim_bp = Blueprint('victim_routes', __name__)

qr_cache = {}

@victim_bp.route('/api/victims/<victim_id>/qr', methods=['GET'])
def get_victim_qr(victim_id):
    if victim_id in qr_cache:
        return jsonify(qr_cache[victim_id])
    
    url = f"http://localhost:5173/victim/{victim_id}"
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(url)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="#f1f5f9", back_color="#0f172a")
    
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    qr_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')
    
    response_data = {
        "qr_base64": qr_base64,
        "url": url,
        "victim_id": victim_id
    }
    
    qr_cache[victim_id] = response_data
    return jsonify(response_data)

@victim_bp.route('/api/victim/status', methods=['GET'])
@require_role('victim')
def victim_status():
    return jsonify({
        "message": "Welcome to the Victim Portal",
        "user_id": request.user_id
    })

# Add other victim routes here...
