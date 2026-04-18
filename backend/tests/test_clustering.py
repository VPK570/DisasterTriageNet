import unittest
import sys
import os
import numpy as np
import pytest

sys.path.insert(0, os.path.dirname(__file__))

from core.clustering import _severity_weights, _temporal_weights, _adaptive_eps


class TestSeverityWeights(unittest.TestCase):

    def test_weights_increase_with_severity(self):
        weights = _severity_weights([0, 1, 2, 3])
        self.assertTrue(all(weights[i] < weights[i+1] for i in range(len(weights)-1)))

    def test_base_weight_is_1(self):
        weights = _severity_weights([0])
        self.assertAlmostEqual(weights[0], 1.0)

    def test_critical_weight_is_2_5(self):
        weights = _severity_weights([3])
        self.assertAlmostEqual(weights[0], 2.5)


class TestTemporalWeights(unittest.TestCase):

    def test_fresh_victim_has_high_weight(self):
        from datetime import datetime, timedelta
        now = (datetime.now()).isoformat()
        weights = _temporal_weights([now])
        self.assertAlmostEqual(weights[0], 1.0, places=2)

    def test_old_victim_has_lower_weight(self):
        from datetime import datetime, timedelta
        old = (datetime.now() - timedelta(hours=2)).isoformat()
        weights = _temporal_weights([old])
        self.assertLess(weights[0], 0.5)

    def test_empty_timestamps_returns_ones(self):
        weights = _temporal_weights([])
        self.assertEqual(len(weights), 1)
        self.assertEqual(weights[0], 1.0)

    def test_invalid_timestamp_treated_as_fresh(self):
        weights = _temporal_weights(['not-a-timestamp'])
        self.assertAlmostEqual(weights[0], 1.0, places=2)


class TestAdaptiveEps(unittest.TestCase):

    @pytest.mark.skip(reason="NearestNeighbors deadlocks under pytest on macOS")
    def test_tight_cluster_small_eps(self):
        coords = np.array([
            [13.082, 80.270],
            [13.083, 80.271],
            [13.082, 80.271],
            [13.083, 80.270],
            [13.0825, 80.2705],
        ])
        eps = _adaptive_eps(coords)
        self.assertLess(eps, 0.01)

    @pytest.mark.skip(reason="NearestNeighbors deadlocks under pytest on macOS")
    def test_sparse_points_larger_eps(self):
        coords = np.array([
            [13.0, 80.0],
            [13.1, 80.1],
            [13.2, 80.2],
            [13.3, 80.3],
            [13.4, 80.4],
        ])
        eps = _adaptive_eps(coords)
        self.assertGreater(eps, 0.01)

    def test_eps_within_bounds(self):
        coords = np.random.rand(20, 2) * 0.1 + 13.0
        eps = _adaptive_eps(coords)
        self.assertGreaterEqual(eps, 0.002)
        self.assertLessEqual(eps, 0.015)

    @pytest.mark.skip(reason="NearestNeighbors deadlocks under pytest on macOS")
    def test_minimum_points(self):
        coords = np.array([[13.082, 80.270], [13.083, 80.271], [13.0825, 80.2705]])
        eps = _adaptive_eps(coords, min_samples=2)
        self.assertGreater(eps, 0)


if __name__ == '__main__':
    unittest.main()
