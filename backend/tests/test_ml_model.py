import unittest
import sys
import os
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))

from core.ml_model import predict_triage


class TestPredictTriage(unittest.TestCase):

    def test_returns_tuple(self):
        result = predict_triage(45, 80, 98, 37.0)
        self.assertIsInstance(result, tuple)
        self.assertEqual(len(result), 3)

    def test_severity_is_int(self):
        severity, _, _ = predict_triage(45, 80, 98, 37.0)
        self.assertIsInstance(severity, int)

    def test_severity_in_valid_range(self):
        severity, _, _ = predict_triage(45, 80, 98, 37.0)
        self.assertIn(severity, [0, 1, 2, 3])

    def test_confidence_is_float(self):
        _, confidence, _ = predict_triage(45, 80, 98, 37.0)
        self.assertIsInstance(confidence, float)

    def test_confidence_in_valid_range(self):
        _, confidence, _ = predict_triage(45, 80, 98, 37.0)
        self.assertGreaterEqual(confidence, 0.0)
        self.assertLessEqual(confidence, 1.0)

    def test_probabilities_sum_to_one(self):
        _, _, probs = predict_triage(45, 80, 98, 37.0)
        self.assertAlmostEqual(sum(probs), 1.0, places=5)

    def test_probabilities_length(self):
        _, _, probs = predict_triage(45, 80, 98, 37.0)
        self.assertEqual(len(probs), 4)

    def test_probabilities_all_non_negative(self):
        _, _, probs = predict_triage(45, 80, 98, 37.0)
        self.assertTrue(all(p >= 0 for p in probs))

    def test_critical_vitals_high_severity(self):
        severity, confidence, probs = predict_triage(70, 150, 75, 39.5)
        self.assertIn(severity, [2, 3])
        self.assertGreater(confidence, 0.0)

    def test_normal_vitals_low_severity(self):
        severity, confidence, probs = predict_triage(30, 72, 99, 36.8)
        self.assertIn(severity, [0, 1])
        self.assertGreater(confidence, 0.0)

    def test_elderly_critical(self):
        severity, _, _ = predict_triage(85, 130, 82, 39.0)
        self.assertIn(severity, [2, 3])

    def test_child_normal(self):
        severity, _, _ = predict_triage(8, 90, 98, 37.0)
        self.assertIn(severity, [0, 1])


if __name__ == '__main__':
    unittest.main()
