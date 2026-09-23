import sys
import unittest
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from postlock_design_sensitivity import (auc_linearization, design_variance, domain_df,
                                        interval, jackknife_variance, ratio_linearization)


class DesignSensitivityTests(unittest.TestCase):
    def test_ratio_weight_derivatives(self):
        a, b, w = np.array([1.,0.,2.,0.]), np.array([1.,1.,1.,0.]), np.array([1.,3.,2.,8.])
        _, u = ratio_linearization(a,b,w)
        for i in range(len(w)):
            wp, wm = w.copy(), w.copy()
            wp[i] *= np.exp(1e-6); wm[i] *= np.exp(-1e-6)
            observed = (ratio_linearization(a,b,wp)[0]-ratio_linearization(a,b,wm)[0])/2e-6
            self.assertAlmostEqual(u[i],observed,places=8)
        self.assertAlmostEqual(u.sum(),0)

    def test_auc_matches_sklearn_with_ties_and_zero_weights(self):
        y, p, w = [1,0,1,0,1,0], [.4,.4,.8,.2,.3,.7], [2.,4.,1.,3.,0.,1.]
        estimate, u = auc_linearization(y,p,w)
        self.assertAlmostEqual(estimate,roc_auc_score(y,p,sample_weight=w))
        self.assertAlmostEqual(u.sum(),0)

    def test_auc_weight_derivatives(self):
        y, p, w = [1,0,1,0,1,0], [.4,.4,.8,.2,.3,.7], np.array([2.,4.,1.,3.,2.,1.])
        _, u = auc_linearization(y,p,w)
        for i in range(len(w)):
            wp, wm = w.copy(), w.copy()
            wp[i] *= np.exp(1e-6); wm[i] *= np.exp(-1e-6)
            observed = (roc_auc_score(y,p,sample_weight=wp)-roc_auc_score(y,p,sample_weight=wm))/2e-6
            self.assertAlmostEqual(u[i],observed,places=8)

    def test_srs_mean_variance_and_jackknife(self):
        x = np.array([1.,2.,5.,8.]); w = np.ones(4)
        d = pd.DataFrame({"stratum":[0]*4,"psu":range(4)})
        _, u = ratio_linearization(x,np.ones(4),w)
        expected = np.var(x,ddof=1)/4
        self.assertAlmostEqual(design_variance(u,d),expected)
        _, variance, reps = jackknife_variance(d,w,lambda rw: np.average(x,weights=rw))
        self.assertAlmostEqual(float(variance),expected)
        self.assertEqual(reps,4)

    def test_domain_retains_zero_contribution_psu(self):
        d = pd.DataFrame({"stratum":[0,0,0],"psu":[0,1,2]})
        _, u = ratio_linearization([1,3,0],[1,1,0],[1,1,1])
        self.assertAlmostEqual(design_variance(u,d),.75)
        self.assertAlmostEqual(design_variance(u[:2],d.iloc[:2]),1.)
        self.assertEqual(domain_df(d,[True,True,False]),1)

    def test_singleton_treatments(self):
        d = pd.DataFrame({"stratum":[0,0,1],"psu":[0,1,2]})
        u = [-.1,.2,-.1]
        self.assertAlmostEqual(design_variance(u,d,"omit"),.09)
        self.assertAlmostEqual(design_variance(u,d,"center"),.10)
        self.assertAlmostEqual(design_variance(u,d,"average"),.18)

    def test_weight_scaling_and_permutation_invariance(self):
        y, p, w = np.array([0,1,0,1]), np.array([.3,.8,.6,.5]), np.array([1.,2.,3.,4.])
        a,u = auc_linearization(y,p,w); b,v = auc_linearization(y,p,w*10)
        np.testing.assert_allclose(u,v); self.assertAlmostEqual(a,b)
        order = [3,1,2,0]; c,z = auc_linearization(y[order],p[order],w[order])
        np.testing.assert_allclose(u[order],z); self.assertAlmostEqual(a,c)

    def test_psu_identifiers_nested_in_strata(self):
        d = pd.DataFrame({"stratum":[0,0,1,1],"psu":[0,1,0,1]})
        self.assertAlmostEqual(design_variance([-.1,.1,-.2,.2],d),.20)
        self.assertEqual(domain_df(d,[True]*4),2)

    def test_invalid_inputs_fail(self):
        with self.assertRaises(ValueError): ratio_linearization([1],[0],[1])
        with self.assertRaises(ValueError): ratio_linearization([np.nan],[1],[1])
        with self.assertRaises(ValueError): auc_linearization([1,1],[.1,.2],[1,1])
        with self.assertRaises(ValueError): auc_linearization([1,0],[.1,.2],[1,-1])
        with self.assertRaises(ValueError): design_variance([0],pd.DataFrame({"stratum":[0],"psu":[0]}))


if __name__ == "__main__":
    unittest.main()
