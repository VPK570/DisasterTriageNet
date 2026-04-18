from flask import jsonify

def error_response(message, details=None, status=500):
    payload = {"error": message}
    if details:
        payload["details"] = details
    return jsonify(payload), status

def success_response(data, status=200):
    return jsonify(data), status