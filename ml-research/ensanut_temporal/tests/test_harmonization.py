from __future__ import annotations

import unittest
from pathlib import Path

from predia_ensanut import config
from predia_ensanut.harmonize import load_wave
from predia_ensanut.metrics import evaluate_ranking_score
from predia_ensanut.score import PUBLISHED_SCORE_CUTOFF


RAW_DATA_AVAILABLE = all(
    (config.RAW_DATA_DIR / str(wave)).exists() for wave in config.WAVES
)


@unittest.skipUnless(RAW_DATA_AVAILABLE, "microdatos ENSANUT no disponibles")
class HarmonizationIntegrationTests(unittest.TestCase):
    minimum_cohort_size = {2012: 8_000, 2016: 3_000, 2018: 10_000, 2021: 1_500}

    @classmethod
    def setUpClass(cls) -> None:
        cls.waves = {
            wave: load_wave(wave, Path(config.RAW_DATA_DIR)) for wave in config.WAVES
        }

    def test_cohorts_respect_all_eligibility_rules(self) -> None:
        for wave, result in self.waves.items():
            with self.subTest(wave=wave):
                cohort = result.cohort
                self.assertGreaterEqual(len(cohort), self.minimum_cohort_size[wave])
                self.assertFalse(cohort["person_id"].duplicated().any())
                self.assertTrue(cohort["age"].between(20, 110).all())
                self.assertTrue(cohort["prior_diabetes"].eq(0).all())
                self.assertFalse(cohort["pregnant"].eq(1).any())
                self.assertTrue(cohort["fasting_eligible"].eq(1).all())
                self.assertTrue(cohort["survey_weight"].gt(0).all())
                self.assertTrue(cohort["glucose_mg_dl"].between(30, 700).all())
                self.assertTrue(cohort["dysglycemia_fpg"].isin((0, 1)).all())
                self.assertTrue(
                    cohort["dysglycemia_fpg"].eq(
                        cohort["glucose_mg_dl"].ge(100).astype(int)
                    ).all()
                )

    def test_2018_identifier_normalization_preserves_lab_linkage(self) -> None:
        result = self.waves[2018]
        self.assertGreater(result.flow["biomarker_rows"], 13_000)
        self.assertGreater(result.flow["valid_fasting_glucose"], 10_000)

    def test_published_score_reproduces_expected_2018_signal(self) -> None:
        cohort = self.waves[2018].cohort.dropna(
            subset=["mexican_score", "dysglycemia_composite"]
        )
        metrics = evaluate_ranking_score(
            cohort["dysglycemia_composite"].astype(int),
            cohort["mexican_score"],
            cohort["survey_weight"],
            PUBLISHED_SCORE_CUTOFF,
        )
        self.assertGreater(metrics["roc_auc"], 0.65)
        self.assertLess(metrics["roc_auc"], 0.75)

    def test_biomarkers_are_not_model_features(self) -> None:
        forbidden = {"glucose_mg_dl", "hba1c_pct", "dysglycemia_fpg"}
        self.assertTrue(forbidden.isdisjoint(config.CORE_FEATURES))
        self.assertTrue(forbidden.isdisjoint(config.ENHANCED_FEATURES))


if __name__ == "__main__":
    unittest.main()
