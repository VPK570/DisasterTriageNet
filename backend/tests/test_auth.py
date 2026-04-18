import unittest
import json
from app import app
from scripts.setup import init_db
import os
import tempfile

TEST_DB = os.path.join(os.path.dirname(__file__), 'test_auth_triage.db')

class AuthTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.environ['DB_PATH'] = TEST_DB
        if os.path.exists(TEST_DB):
            os.remove(TEST_DB)
        app.config['TESTING'] = True
        cls.app = app.test_client()
        init_db()

    @classmethod
    def tearDownClass(cls):
        if os.path.exists(TEST_DB):
            os.remove(TEST_DB)

    def test_a_register_victim(self):
        res = self.app.post('/api/auth/register', json={
            "name": "Test Victim",
            "email": "victim@test.com",
            "password": "password123",
            "role": "victim"
        })
        self.assertEqual(res.status_code, 201)

    def test_b_login_victim_and_access(self):
        res = self.app.post('/api/auth/login', json={
            "email": "victim@test.com",
            "password": "password123"
        })
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        token = data['access_token']
        self.assertEqual(data['role'], 'victim')

        res2 = self.app.get('/api/victim/status', headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res2.status_code, 200)

        res3 = self.app.get('/api/responder/dashboard', headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res3.status_code, 403)

    def test_c_admin_access(self):
        self.app.post('/api/auth/register', json={
            "name": "Admin",
            "email": "admin@test.com",
            "password": "adminpass",
            "role": "admin"
        })
        
        res = self.app.post('/api/auth/login', json={
            "email": "admin@test.com",
            "password": "adminpass"
        })
        token = json.loads(res.data)['access_token']
        
        res2 = self.app.get('/api/responder/dashboard', headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res2.status_code, 200)

    def test_d_invalid_email_rejected(self):
        res = self.app.post('/api/auth/register', json={
            "name": "Bad Email",
            "email": "not-an-email",
            "password": "password123",
            "role": "victim"
        })
        self.assertEqual(res.status_code, 400)

    def test_e_short_password_rejected(self):
        res = self.app.post('/api/auth/register', json={
            "name": "Short Pass",
            "email": "short@test.com",
            "password": "abc",
            "role": "victim"
        })
        self.assertEqual(res.status_code, 400)

    def test_f_invalid_role_rejected(self):
        res = self.app.post('/api/auth/register', json={
            "name": "Bad Role",
            "email": "role@test.com",
            "password": "password123",
            "role": "superadmin"
        })
        self.assertEqual(res.status_code, 400)

if __name__ == '__main__':
    unittest.main()
