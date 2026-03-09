import unittest
import json
from app import app
from setup import init_db

class AuthTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Set up test database
        app.config['TESTING'] = True
        cls.app = app.test_client()
        init_db()

    def test_a_register_victim(self):
        res = self.app.post('/api/auth/register', json={
            "name": "Test Victim",
            "email": "victim@test.com",
            "password": "password123",
            "role": "victim"
        })
        self.assertEqual(res.status_code, 201)

    def test_b_login_victim_and_access(self):
        # Login
        res = self.app.post('/api/auth/login', json={
            "email": "victim@test.com",
            "password": "password123"
        })
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        token = data['access_token']
        self.assertEqual(data['role'], 'victim')

        # Access Victim Portal
        res2 = self.app.get('/api/victim/status', headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res2.status_code, 200)

        # Access Responder Dashboard (Should be 403 Forbidden)
        res3 = self.app.get('/api/responder/dashboard', headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res3.status_code, 403)

    def test_c_admin_access(self):
        # Register Admin
        self.app.post('/api/auth/register', json={
            "name": "Admin",
            "email": "admin@test.com",
            "password": "pass",
            "role": "admin"
        })
        
        # Login Admin
        res = self.app.post('/api/auth/login', json={
            "email": "admin@test.com",
            "password": "pass"
        })
        token = json.loads(res.data)['access_token']
        
        # Access Responder Dashboard as Admin (Should work)
        res2 = self.app.get('/api/responder/dashboard', headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res2.status_code, 200)

if __name__ == '__main__':
    unittest.main()
