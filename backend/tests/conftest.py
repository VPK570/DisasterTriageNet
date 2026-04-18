import os
import sys
import tempfile
import pytest

sys.path.insert(0, os.path.dirname(__file__))

from app import app as flask_app
from config import DB_PATH

TEST_DB_PATH = os.path.join(os.path.dirname(__file__), 'test_triage.db')

@pytest.fixture(scope='session')
def app():
    original_db_path = os.environ.get('DB_PATH', DB_PATH)
    os.environ['DB_PATH'] = TEST_DB_PATH

    flask_app.config['TESTING'] = True
    flask_app.config['WTF_CSRF_ENABLED'] = False

    from setup import init_db
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)
    init_db()

    yield flask_app

    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def admin_token(client):
    client.post('/api/auth/register', json={
        'name': 'Test Admin',
        'email': 'admin_test@test.com',
        'password': 'admin123',
        'role': 'admin'
    })
    res = client.post('/api/auth/login', json={
        'email': 'admin_test@test.com',
        'password': 'admin123'
    })
    return res.get_json()['access_token']

@pytest.fixture
def responder_token(client):
    client.post('/api/auth/register', json={
        'name': 'Test Responder',
        'email': 'responder_test@test.com',
        'password': 'responder123',
        'role': 'responder'
    })
    res = client.post('/api/auth/login', json={
        'email': 'responder_test@test.com',
        'password': 'responder123'
    })
    return res.get_json()['access_token']
