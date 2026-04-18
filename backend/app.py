import eventlet
eventlet.monkey_patch()

from flask import Flask
from flask_cors import CORS

from config import DB_PATH
from lib.logging_config import get_logger
from migrations.runner import run_migrations
from lib.extensions import socketio, api

from auth.register import register_bp
from auth.login import login_bp
from auth.profile import profile_bp
from routes.victim_routes import victim_bp
from routes.responder_routes import responder_bp
from routes.admin_routes import admin_bp
from routes.core_routes import core_api

logger = get_logger('triage.app')

run_migrations()

app = Flask(__name__)

app.config['API_TITLE'] = 'DisasterTriageNet API'
app.config['API_VERSION'] = 'v1'
app.config['OPENAPI_VERSION'] = '3.0.2'
app.config['OPENAPI_URL_PREFIX'] = '/api/v1'
app.config['OPENAPI_SWAGGER_UI_PATH'] = '/docs'
app.config['OPENAPI_SWAGGER_UI_URL'] = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist/'
app.config['OPENAPI_JSON_PATH'] = '/api/openapi.json'
app.config['API_SPEC'] = {
    'security': [{'BearerAuth': []}],
    'components': {
        'securitySchemes': {
            'BearerAuth': {
                'type': 'http',
                'scheme': 'bearer',
                'bearerFormat': 'JWT'
            }
        }
    }
}

ALLOWED_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]
CORS(app, resources={r"/api/*": {"origins": ALLOWED_ORIGINS}})

api.init_app(app)
socketio.init_app(app, cors_allowed_origins=ALLOWED_ORIGINS)

app.register_blueprint(register_bp, url_prefix='/api/auth')
app.register_blueprint(login_bp, url_prefix='/api/auth')
app.register_blueprint(profile_bp, url_prefix='/api/auth')

app.register_blueprint(victim_bp)
app.register_blueprint(responder_bp)
app.register_blueprint(admin_bp)

api.register_blueprint(core_api)

if __name__ == '__main__':
    logger.info("API starting on http://0.0.0.0:5001")
    socketio.run(app, debug=False, port=5001, host='0.0.0.0')