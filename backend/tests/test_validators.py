import unittest
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from lib.validators import validate_vitals, validate_email, validate_password


class TestValidateVitals(unittest.TestCase):

    def test_valid_vitals(self):
        data = {
            'age': 45,
            'heart_rate': 80,
            'spo2': 98,
            'temperature': 37.0,
            'lat': 13.0827,
            'lng': 80.2707
        }
        errors = validate_vitals(data)
        self.assertEqual(errors, [])

    def test_negative_age(self):
        data = {
            'age': -5,
            'heart_rate': 80,
            'spo2': 98,
            'temperature': 37.0,
            'lat': 13.0827,
            'lng': 80.2707
        }
        errors = validate_vitals(data)
        self.assertTrue(any('age' in e for e in errors))

    def test_age_over_120(self):
        data = {
            'age': 150,
            'heart_rate': 80,
            'spo2': 98,
            'temperature': 37.0,
            'lat': 13.0827,
            'lng': 80.2707
        }
        errors = validate_vitals(data)
        self.assertTrue(any('age' in e for e in errors))

    def test_heart_rate_too_low(self):
        data = {
            'age': 30,
            'heart_rate': 5,
            'spo2': 98,
            'temperature': 37.0,
            'lat': 13.0827,
            'lng': 80.2707
        }
        errors = validate_vitals(data)
        self.assertTrue(any('heart_rate' in e for e in errors))

    def test_heart_rate_too_high(self):
        data = {
            'age': 30,
            'heart_rate': 500,
            'spo2': 98,
            'temperature': 37.0,
            'lat': 13.0827,
            'lng': 80.2707
        }
        errors = validate_vitals(data)
        self.assertTrue(any('heart_rate' in e for e in errors))

    def test_spo2_below_50(self):
        data = {
            'age': 30,
            'heart_rate': 80,
            'spo2': 30,
            'temperature': 37.0,
            'lat': 13.0827,
            'lng': 80.2707
        }
        errors = validate_vitals(data)
        self.assertTrue(any('spo2' in e for e in errors))

    def test_spo2_above_100(self):
        data = {
            'age': 30,
            'heart_rate': 80,
            'spo2': 105,
            'temperature': 37.0,
            'lat': 13.0827,
            'lng': 80.2707
        }
        errors = validate_vitals(data)
        self.assertTrue(any('spo2' in e for e in errors))

    def test_temperature_too_low(self):
        data = {
            'age': 30,
            'heart_rate': 80,
            'spo2': 98,
            'temperature': 10,
            'lat': 13.0827,
            'lng': 80.2707
        }
        errors = validate_vitals(data)
        self.assertTrue(any('temperature' in e for e in errors))

    def test_temperature_too_high(self):
        data = {
            'age': 30,
            'heart_rate': 80,
            'spo2': 98,
            'temperature': 50,
            'lat': 13.0827,
            'lng': 80.2707
        }
        errors = validate_vitals(data)
        self.assertTrue(any('temperature' in e for e in errors))

    def test_lat_out_of_range(self):
        data = {
            'age': 30,
            'heart_rate': 80,
            'spo2': 98,
            'temperature': 37.0,
            'lat': 95,
            'lng': 80.2707
        }
        errors = validate_vitals(data)
        self.assertTrue(any('lat' in e for e in errors))

    def test_lng_out_of_range(self):
        data = {
            'age': 30,
            'heart_rate': 80,
            'spo2': 98,
            'temperature': 37.0,
            'lat': 13.0827,
            'lng': 200
        }
        errors = validate_vitals(data)
        self.assertTrue(any('lng' in e for e in errors))

    def test_missing_required_fields(self):
        data = {}
        errors = validate_vitals(data)
        self.assertEqual(len(errors), 6)

    def test_string_instead_of_number(self):
        data = {
            'age': 'old',
            'heart_rate': 'fast',
            'spo2': 'low',
            'temperature': 'hot',
            'lat': 'here',
            'lng': 'there'
        }
        errors = validate_vitals(data)
        self.assertEqual(len(errors), 6)

    def test_boundary_valid_age_zero(self):
        data = {
            'age': 0,
            'heart_rate': 80,
            'spo2': 98,
            'temperature': 37.0,
            'lat': 13.0827,
            'lng': 80.2707
        }
        errors = validate_vitals(data)
        self.assertEqual(errors, [])

    def test_boundary_valid_age_120(self):
        data = {
            'age': 120,
            'heart_rate': 80,
            'spo2': 98,
            'temperature': 37.0,
            'lat': 13.0827,
            'lng': 80.2707
        }
        errors = validate_vitals(data)
        self.assertEqual(errors, [])

    def test_boundary_valid_spo2_50(self):
        data = {
            'age': 30,
            'heart_rate': 80,
            'spo2': 50,
            'temperature': 37.0,
            'lat': 13.0827,
            'lng': 80.2707
        }
        errors = validate_vitals(data)
        self.assertEqual(errors, [])

    def test_boundary_valid_spo2_100(self):
        data = {
            'age': 30,
            'heart_rate': 80,
            'spo2': 100,
            'temperature': 37.0,
            'lat': 13.0827,
            'lng': 80.2707
        }
        errors = validate_vitals(data)
        self.assertEqual(errors, [])


class TestValidateEmail(unittest.TestCase):

    def test_valid_email(self):
        self.assertIsNone(validate_email('user@example.com'))

    def test_invalid_email_no_at(self):
        self.assertIsNotNone(validate_email('userexample.com'))

    def test_invalid_email_no_domain(self):
        self.assertIsNotNone(validate_email('user@'))

    def test_invalid_email_empty(self):
        self.assertIsNotNone(validate_email(''))

    def test_invalid_email_none(self):
        self.assertIsNotNone(validate_email(None))


class TestValidatePassword(unittest.TestCase):

    def test_valid_password(self):
        self.assertIsNone(validate_password('secure123'))

    def test_short_password(self):
        self.assertIsNotNone(validate_password('abc'))

    def test_empty_password(self):
        self.assertIsNotNone(validate_password(''))

    def test_none_password(self):
        self.assertIsNotNone(validate_password(None))

    def test_exact_6_char_password(self):
        self.assertIsNone(validate_password('abcdef'))


if __name__ == '__main__':
    unittest.main()
