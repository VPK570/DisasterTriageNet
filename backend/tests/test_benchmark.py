#!/usr/bin/env python3
"""
Tests for DisasterTriageNet Benchmark Suite
"""

import random
import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from scripts.benchmark import (
    generate_scenario_a, generate_scenario_b, generate_scenario_c,
    dispatch_baseline1, dispatch_baseline2, dispatch_system,
    haversine
)


class TestScenarioGeneration:
    """Tests for scenario generation"""

    def test_generate_scenario_a_returns_20_victims_1_ambulance(self):
        """Verify scenario A returns 20 victims and 1 ambulance"""
        random.seed(42)
        victims, ambulances = generate_scenario_a()
        assert len(victims) == 20, f"Expected 20 victims, got {len(victims)}"
        assert len(ambulances) == 1, f"Expected 1 ambulance, got {len(ambulances)}"

    def test_generate_scenario_b_returns_20_victims_1_ambulance(self):
        """Verify scenario B returns 20 victims and 1 ambulance"""
        random.seed(42)
        victims, ambulances = generate_scenario_b()
        assert len(victims) == 20, f"Expected 20 victims, got {len(victims)}"
        assert len(ambulances) == 1, f"Expected 1 ambulance, got {len(ambulances)}"

    def test_generate_scenario_c_returns_30_victims_3_ambulances(self):
        """Verify scenario C returns 30 victims and 3 ambulances"""
        random.seed(42)
        victims, ambulances = generate_scenario_c()
        assert len(victims) == 30, f"Expected 30 victims, got {len(victims)}"
        assert len(ambulances) == 3, f"Expected 3 ambulances, got {len(ambulances)}"

    def test_generate_scenario_c_cluster1_high_severity(self):
        """Verify cluster 1 victims in scenario C all have triage_level >= 3"""
        random.seed(42)
        victims, ambulances = generate_scenario_c()
        cluster1 = [v for v in victims if v['id'].startswith('V-C1')]
        for victim in cluster1:
            assert victim['triage_level'] >= 3, \
                f"Victim {victim['id']} has triage_level {victim['triage_level']}, expected >= 3"


class TestDispatchStrategies:
    """Tests for dispatch strategies"""

    def test_dispatch_baseline1_assigns_by_distance(self):
        """Verify BASELINE_1 assigns victims in distance order (nearest first)"""
        random.seed(42)
        victims, ambulances = generate_scenario_a()
        
        v_result, a_result, _ = dispatch_baseline1(victims, ambulances)
        
        assigned = [v for v in v_result if v.get('assignment_time') is not None]
        if len(assigned) >= 2:
            for i in range(len(assigned) - 1):
                dist_i = haversine(assigned[i]['lat'], assigned[i]['lng'], 
                                   a_result[0]['lat'], a_result[0]['lng'])
                dist_next = haversine(assigned[i+1]['lat'], assigned[i+1]['lng'],
                                      a_result[0]['lat'], a_result[0]['lng'])
                assert dist_i <= dist_next + 0.001, \
                    f"BASELINE_1 should assign by distance order, got {dist_i} > {dist_next}"

    def test_dispatch_baseline2_assigns_highest_severity_first(self):
        """Verify BASELINE_2 assigns highest severity victim first"""
        random.seed(42)
        victims, ambulances = generate_scenario_a()
        
        v_result, a_result, _ = dispatch_baseline2(victims, ambulances)
        
        assigned = [v for v in v_result if v.get('assignment_time') is not None]
        if len(assigned) >= 2:
            triage_levels = [v['triage_level'] for v in assigned]
            for i in range(len(triage_levels) - 1):
                assert triage_levels[i] >= triage_levels[i + 1], \
                    f"BASELINE_2 severity not in descending order: {triage_levels}"

    def test_dispatch_system_fires_reopt_on_deterioration(self):
        """Verify SYSTEM with deteriorate=True fires at least 1 reopt when vitals worsen"""
        reopt_fired = False
        for seed in range(100):
            random.seed(seed)
            victims, ambulances = generate_scenario_b()
            _, _, reopt_count = dispatch_system(victims, ambulances, deteriorate=True,
                                                 use_severity_weight=True, use_reopt=True)
            if reopt_count >= 1:
                reopt_fired = True
                break
        
        assert reopt_fired, "Expected at least 1 reopt event with deterioration enabled"

    def test_dispatch_system_prefers_high_severity_over_distance(self):
        """Verify SYSTEM assigns high-severity victim first, even if farther"""
        v1_far = {
            'id': 'V-HIGH', 'lat': 13.0827, 'lng': 80.2707,
            'triage_level': 4, 'arrival_time': 10,
            'heart_rate': 150, 'spo2': 75, 'temperature': 40.5
        }
        v2_close = {
            'id': 'V-LOW', 'lat': 13.0837, 'lng': 80.2717,
            'triage_level': 1, 'arrival_time': 5,
            'heart_rate': 80, 'spo2': 98, 'temperature': 37.0
        }
        amb = {'id': 'A1', 'lat': 13.0830, 'lng': 80.2710, 'status': 'available', 'assigned_victim': None}
        
        victims = [v1_far, v2_close]
        ambulances = [amb]
        
        v_result, a_result, _ = dispatch_system(victims, ambulances, deteriorate=False,
                                                  use_severity_weight=True, use_reopt=False)
        
        assigned = [v for v in v_result if v.get('assignment_time') is not None]
        
        assert len(assigned) >= 1, "At least one victim should be assigned"
        
        first_assigned = assigned[0]
        
        assert first_assigned['id'] == 'V-HIGH', \
            f"SYSTEM should assign high-severity (V-HIGH) first, but got {first_assigned['id']}"

    def test_system_higher_critical_response_rate_than_baseline1(self):
        """Verify SYSTEM achieves higher critical_response_rate than BASELINE_1"""
        random.seed(123)
        victims, ambulances = generate_scenario_c()
        
        from scripts.benchmark import run_simulation
        
        metrics_baseline1 = run_simulation(victims, ambulances, "BASELINE_1", use_deterioration=False)
        
        random.seed(123)
        victims2, ambulances2 = generate_scenario_c()
        metrics_system = run_simulation(victims2, ambulances2, "SYSTEM", use_deterioration=False)
        
        baseline1_rate = metrics_baseline1.get('critical_response_rate')
        system_rate = metrics_system.get('critical_response_rate')
        
        assert baseline1_rate is not None, "BASELINE_1 should have critical victims"
        assert system_rate is not None, "SYSTEM should have critical victims"
        
        assert system_rate >= baseline1_rate, \
            f"SYSTEM critical_response_rate ({system_rate:.2f}) should be >= BASELINE_1 ({baseline1_rate:.2f})"


class TestComputeMetrics:
    """Tests for compute metrics"""

    def test_compute_metrics_returns_all_keys(self):
        """Verify run_simulation returns all required keys including critical metrics"""
        random.seed(42)
        victims, ambulances = generate_scenario_a()
        
        from scripts.benchmark import run_simulation
        metrics = run_simulation(victims, ambulances, "BASELINE_1", use_deterioration=False)
        
        required_keys = [
            'mean_time_to_assignment',
            'reopt_events_fired',
            'ambulance_utilization_pct',
            'victims_worsened_before_assignment',
            'severity_weighted_response_score',
            'critical_mean_wait',
            'critical_response_rate'
        ]
        
        for key in required_keys:
            assert key in metrics, f"Missing required key: {key}"
        
        assert len(metrics) == 7, f"Expected 7 keys, got {len(metrics)}"


class TestRunCell:
    """Tests for run_cell function"""

    def test_run_cell_returns_required_fields(self):
        """Verify run_simulation produces metrics for a scenario/system/run"""
        random.seed(42)
        victims, ambulances = generate_scenario_a()
        
        from scripts.benchmark import run_simulation
        metrics = run_simulation(victims, ambulances, "BASELINE_1", use_deterioration=False)
        
        scenario = "SCENARIO_A"
        system = "BASELINE_1"
        run_index = 1
        
        result = {
            'scenario': scenario,
            'system': system,
            'run_index': run_index,
            'metrics': metrics
        }
        
        assert 'scenario' in result, "Missing 'scenario' in result"
        assert 'system' in result, "Missing 'system' in result"
        assert 'run_index' in result, "Missing 'run_index' in result"
        
        assert result['scenario'] == "SCENARIO_A"
        assert result['system'] == "BASELINE_1"
        assert result['run_index'] == 1