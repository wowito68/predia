import sys
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from postlock_policy_analysis import allocation_metrics, capacity_allocation


class CapacityTests(unittest.TestCase):
    def test_budget_exact_with_unequal_weights(self):
        w = np.array([1., 3., 7., 2.])
        for budget in (0, .2, .4, .6, 1):
            allocation = capacity_allocation([2, 2, 1, 0], w, budget)
            self.assertAlmostEqual(np.dot(w, allocation)/sum(w), budget)

    def test_ties_have_equal_probability(self):
        np.testing.assert_allclose(capacity_allocation([2, 2, 1], [1, 3, 6], .2), [.5, .5, 0])

    def test_rank_invariant_under_monotone_transformation(self):
        a = capacity_allocation([1, 2, 3], [3, 4, 5], .4)
        b = capacity_allocation([11, 21, 31], [3, 4, 5], .4)
        np.testing.assert_allclose(a, b)

    def test_permutation_invariant(self):
        scores, weights, order = np.array([3, 3, 1, 2]), np.array([1, 4, 3, 2]), np.array([2, 0, 3, 1])
        a = capacity_allocation(scores, weights, .4)
        b = capacity_allocation(scores[order], weights[order], .4)
        np.testing.assert_allclose(a[order], b)

    def test_mass_balance_and_random_expectation(self):
        m = allocation_metrics([1, 0, 1, 0], [1, 2, 3, 4], [.4]*4)
        self.assertAlmostEqual(m["detected_per_1000"], 160)
        self.assertAlmostEqual(m["missed_per_1000"], 240)
        self.assertAlmostEqual(m["tests_per_1000"], m["detected_per_1000"] + m["negative_tests_per_1000"])
        self.assertAlmostEqual(m["sensitivity"], .4)

    def test_perfect_ranking(self):
        allocation = capacity_allocation([.8, .1, .9, .2], [1]*4, .5)
        self.assertEqual(allocation_metrics([1,0,1,0], [1]*4, allocation)["sensitivity"], 1)

    def test_invalid_inputs_fail(self):
        for scores, weights, budget in (([1],[0],.4), ([np.nan],[1],.4), ([1],[1],1.2), ([1,2],[1],.4)):
            with self.assertRaises(ValueError):
                capacity_allocation(scores, weights, budget)


if __name__ == "__main__":
    unittest.main()
