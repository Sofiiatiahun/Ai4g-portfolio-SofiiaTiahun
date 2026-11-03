#!/usr/bin/env python3
import os
import sys
import unittest

# Ensure src/ is always in sys.path regardless of working directory
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(CURRENT_DIR, "src")
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

from guardrails import scan_critical_values, validate_input_relevance, sanitize_ai_response
from samples import SAMPLE_LABS


class TestGuardrails(unittest.TestCase):
    def test_critical_alerts(self):
        # Result before reference range
        text1 = "Potassium 6.8 (3.5 - 5.0) mEq/L CRITICAL"
        alerts1 = scan_critical_values(text1)
        self.assertEqual(len(alerts1), 1, f"Expected 1 alert, got {len(alerts1)}")
        self.assertIn("Hyperkalemia", alerts1[0]["biomarker"])
        self.assertEqual(alerts1[0]["value"], 6.8)

        # Reference range before result
        text2 = "Potassium reference range 3.5 - 5.0, patient result 6.8 mEq/L"
        alerts2 = scan_critical_values(text2)
        self.assertEqual(len(alerts2), 1, f"Expected 1 alert for inverted range order, got {len(alerts2)}")
        self.assertEqual(alerts2[0]["value"], 6.8)

        # Normal potassium should NOT trigger
        text3 = "Potassium 4.2 mmol/L (Reference 3.5 - 5.1)"
        alerts3 = scan_critical_values(text3)
        self.assertEqual(len(alerts3), 0, f"Expected 0 alerts for normal potassium, got {len(alerts3)}")

        # Vitamin K should NOT trigger potassium alert (regression check for \bk\b)
        self.assertEqual(len(scan_critical_values("Vitamine K: 7.2 ug/L")), 0, "Vitamine K must not trigger potassium alert")
        self.assertEqual(len(scan_critical_values("Vitamin K 15.0 ug/L")), 0, "Vitamin K must not trigger potassium alert")

        # Sample ID number should NOT trigger platelet thrombocytopenia alert
        self.assertEqual(len(scan_critical_values("Trombocyten 250 (ID 12000)")), 0, "Specimen ID must not trigger platelet alert")
        self.assertEqual(len(scan_critical_values("Platelets 285 (150 - 450) x10^3/uL NORMAL")), 0)

        # Severe hypoglycemia in mg/dL
        text5 = "Blood Glucose 42 mg/dL (Reference 70 - 99)"
        alerts5 = scan_critical_values(text5)
        self.assertEqual(len(alerts5), 1)
        self.assertIn("Hypoglycemia", alerts5[0]["biomarker"])

        # European / Dutch normal glucose in mmol/L must NOT trigger hypoglycemia
        text_nl_norm = "Glucose 5.5 mmol/L (Reference 4.0 - 7.8)"
        self.assertEqual(len(scan_critical_values(text_nl_norm)), 0, "Normal mmol/L glucose should not trigger alert")

        # European / Dutch hypoglycemia in mmol/L must trigger
        text_nl_hypo = "Glucose 2.2 mmol/L (Reference 4.0 - 7.8)"
        alerts_nl = scan_critical_values(text_nl_hypo)
        self.assertEqual(len(alerts_nl), 1)
        self.assertEqual(alerts_nl[0]["value"], 2.2)

        # European decimal comma notation: Potassium 5,9 must NOT trigger (parsed as 5.9, not 9.0)
        self.assertEqual(len(scan_critical_values("Potassium 5,9 mEq/L")), 0, "5,9 comma decimal should not trigger 9.0")

        # European decimal comma critical: Potassium 6,8 must trigger with 6.8
        alerts_comma = scan_critical_values("Potassium 6,8 mEq/L")
        self.assertEqual(len(alerts_comma), 1)
        self.assertEqual(alerts_comma[0]["value"], 6.8)

        # Reference bound with comparison operator (< 6.0) must not be mistaken for patient value
        self.assertEqual(len(scan_critical_values("Potassium: 4.2 mEq/L (Reference: < 6.0)")), 0)

        # Dangerously high potassium in sample 2 (Kalium 6.9 mmol/L) must trigger emergency alert
        sample2_alerts = scan_critical_values(SAMPLE_LABS["2"]["text"])
        self.assertEqual(len(sample2_alerts), 1, "Sample 2 must trigger critical alert")
        self.assertIn("112", sample2_alerts[0]["guidance"])
        self.assertIn("huisartsenpost", sample2_alerts[0]["guidance"])

        # Student Sample 1 (Winter fatigue & Vitamin D 22 nmol/L) should NOT trigger emergency alerts
        sample1_alerts = scan_critical_values(SAMPLE_LABS["1"]["text"])
        self.assertEqual(len(sample1_alerts), 0, "Sample 1 is non-emergency nutritional deficiency")

        # Student Sample 3 (Iron deficiency anemia with Hb 5.8 mmol/L) should NOT trigger emergency alert (threshold is <= 4.3)
        sample3_alerts = scan_critical_values(SAMPLE_LABS["3"]["text"])
        self.assertEqual(len(sample3_alerts), 0, "Sample 3 contains mild anemia requiring GP prescription, not acute emergency")

        # Student Sample 4 (Pfeiffer / liver enzymes) should NOT trigger emergency alert
        sample4_alerts = scan_critical_values(SAMPLE_LABS["4"]["text"])
        self.assertEqual(len(sample4_alerts), 0, "Sample 4 contains viral liver inflammation, not acute emergency")

        # Hemoglobin in Dutch units (mmol/L): critically low 3.8 mmol/L MUST trigger critical alert
        hb_crit_alerts = scan_critical_values("Hemoglobine 3.8 mmol/L (Ref: 7.5 - 10.0)")
        self.assertEqual(len(hb_crit_alerts), 1)
        self.assertIn("Anemia", hb_crit_alerts[0]["biomarker"])

        # Severe hypertriglyceridemia (>= 10.0 mmol/L) must trigger urgent pancreatitis warning
        trig_alerts = scan_critical_values("Triglycerides 11.2 mmol/L (Ref: < 1.7)")
        self.assertEqual(len(trig_alerts), 1)
        self.assertIn("pancreatitis", trig_alerts[0]["guidance"])

    def test_input_validation(self):
        # Valid sample presets
        for k, sample in SAMPLE_LABS.items():
            self.assertIsNone(validate_input_relevance(sample["text"]), f"Sample {k} failed validation")

        # Single-line patient queries and common abbreviations accepted
        self.assertIsNone(validate_input_relevance("Potassium 6.8"))
        self.assertIsNone(validate_input_relevance("Hb 6.5 g/dL"))
        self.assertIsNone(validate_input_relevance("Kalium: 6.8"))
        self.assertIsNone(validate_input_relevance("Vitamine D 25-OH: 22 nmol/L"))
        self.assertIsNone(validate_input_relevance("Ferritine: 8 ug/L"))

        # Non-medical text with numbers rejected
        self.assertIsNotNone(validate_input_relevance("buy 2 apples and 3 bananas"))
        self.assertIsNotNone(validate_input_relevance("12345 hello world how are you doing"))

        # Short string rejected
        self.assertIsNotNone(validate_input_relevance("test"))

    def test_sanitization(self):
        # Overconfident diagnosis softened
        diag = "Based on this, you have colon cancer."
        sanitized = sanitize_ai_response(diag)
        self.assertIn("your lab patterns may be consistent with colon cancer", sanitized)

        # Screening recommendations preserved without mangling
        screening = "Make sure you have cancer screenings annually."
        self.assertEqual(sanitize_ai_response(screening), screening)

        # Family history questions preserved without mangling
        question = "Do you have diabetes mellitus in your family history?"
        self.assertEqual(sanitize_ai_response(question), question)

        # Innocuous phrasing preserved without mangling
        innocuous = "You have reviewed your results for colon cancer with your doctor."
        self.assertIn("reviewed your results for colon cancer", sanitize_ai_response(innocuous))

        # US emergency / clinic tropes replaced with Dutch healthcare equivalents
        self.assertIn("112", sanitize_ai_response("If pain persists, call 911 immediately."))
        self.assertIn("huisartsenpraktijk", sanitize_ai_response("You can visit a local FQHC for affordable care."))

    def test_gemini_client_key_handling(self):
        # Ensure client handles missing API key cleanly without crashing
        from gemini_client import call_gemini_api
        res_text, meta = call_gemini_api("Glucose: 120 mg/dL", api_key="")
        self.assertEqual(meta["status"], "configuration_error")
        self.assertIn("not configured", res_text)


if __name__ == "__main__":
    suite = unittest.TestLoader().loadTestsFromTestCase(TestGuardrails)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    if result.wasSuccessful():
        print("\nAll guardrails, variation handling, sanitization, and key check tests passed cleanly.")
        sys.exit(0)
    else:
        sys.exit(1)
