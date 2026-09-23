from __future__ import annotations

import unittest

import numpy as np
import pandas as pd

from predia_ensanut.metrics import (
    cluster_bootstrap_auc_difference,
    select_threshold_for_sensitivity,
)
from predia_ensanut.score import mexican_screening_score


class MexicanScreeningScoreTests(unittest.TestCase):
    def test_score_bounds_and_missingness(self) -> None:
        frame = pd.DataFrame(
            {
                "female": [0.0, 1.0, 1.0],
                "age": [20.0, 60.0, 60.0],
                "family_diabetes": [0.0, 1.0, np.nan],
                "hypertension_screen": [0.0, 1.0, 1.0],
                "obesity": [0.0, 1.0, 1.0],
                "abdominal_obesity_aha": [0.0, 1.0, 1.0],
            }
        )

        score = mexican_screening_score(frame)

        self.assertEqual(score.iloc[0], 0.0)
        self.assertEqual(score.iloc[1], 49.0)
        self.assertTrue(np.isnan(score.iloc[2]))

    def test_missing_required_column_is_rejected(self) -> None:
        with self.assertRaises(KeyError):
            mexican_screening_score(pd.DataFrame({"age": [50]}))


class WeightedMetricTests(unittest.TestCase):
    def test_threshold_meets_requested_sensitivity(self) -> None:
        y = np.array([0, 0, 0, 1, 1])
        probability = np.array([0.1, 0.2, 0.4, 0.6, 0.9])
        weight = np.ones(5)

        threshold = select_threshold_for_sensitivity(
            y, probability, weight, target_sensitivity=1.0
        )

        self.assertAlmostEqual(threshold, 0.6)

    def test_paired_bootstrap_is_deterministic(self) -> None:
        frame = pd.DataFrame(
            {
                "person_id": [f"p{index}" for index in range(12)],
                "stratum": ["a"] * 6 + ["b"] * 6,
                "psu": [f"u{index // 2}" for index in range(12)],
                "survey_weight": np.ones(12),
                "outcome": [0, 1] * 6,
            }
        )
        score_a = np.array([0.1, 0.9] * 6)
        score_b = np.linspace(0.1, 0.9, 12)

        first = cluster_bootstrap_auc_difference(
            frame, score_a, score_b, "outcome", repetitions=20, seed=7
        )
        second = cluster_bootstrap_auc_difference(
            frame, score_a, score_b, "outcome", repetitions=20, seed=7
        )

        self.assertEqual(first, second)
        self.assertGreater(first["estimate"], 0)


if __name__ == "__main__":
    unittest.main()
