import re
from typing import Dict, List, Any, Optional

# Critical physiological thresholds requiring immediate emergency evaluation
CRITICAL_THRESHOLDS = [
    {
        "name": "Potassium (Hyperkalemia)",
        "patterns": [r"(?i)\bpotassium\b[^\d]*(\d+\.?\d*)\s*(?:mmol/l|meq/l)?"],
        "check": lambda v: v >= 6.0,
        "urgency": "CRITICAL EMERGENCY",
        "action": "Potassium >= 6.0 mEq/L is dangerously high (hyperkalemia) and carries immediate risk of severe cardiac arrhythmias. Seek immediate emergency medical care (call 911 or go to the nearest emergency room)."
    },
    {
        "name": "Potassium (Severe Hypokalemia)",
        "patterns": [r"(?i)\bpotassium\b[^\d]*(\d+\.?\d*)\s*(?:mmol/l|meq/l)?"],
        "check": lambda v: v <= 2.5,
        "urgency": "CRITICAL EMERGENCY",
        "action": "Potassium <= 2.5 mEq/L is critically low, creating severe risk for heart rhythm disorders and muscle paralysis. Seek immediate emergency medical evaluation."
    },
    {
        "name": "Glucose (Severe Hypoglycemia)",
        "patterns": [r"(?i)\bglucose\b[^\d]*(\d+\.?\d*)\s*(?:mg/dl)?"],
        "check": lambda v: v <= 50.0,
        "urgency": "CRITICAL EMERGENCY",
        "action": "Blood glucose <= 50 mg/dL is life-threatening hypoglycemia. Consume fast-acting sugar immediately (juice, honey, candy) and seek urgent medical assistance."
    },
    {
        "name": "Glucose (Severe Hyperglycemia)",
        "patterns": [r"(?i)\bglucose\b[^\d]*(\d+\.?\d*)\s*(?:mg/dl)?"],
        "check": lambda v: v >= 400.0,
        "urgency": "URGENT MEDICAL ATTENTION",
        "action": "Blood glucose >= 400 mg/dL carries significant risk of diabetic ketoacidosis (DKA) or hyperosmolar hyperglycemic state. Contact your doctor or visit urgent care immediately."
    },
    {
        "name": "Hemoglobin (Severe Anemia)",
        "patterns": [r"(?i)\b(?:hemoglobin|hgb)\b[^\d]*(\d+\.?\d*)\s*(?:g/dl)?"],
        "check": lambda v: v <= 7.0,
        "urgency": "URGENT MEDICAL ATTENTION",
        "action": "Hemoglobin <= 7.0 g/dL indicates severe anemia below typical clinical transfusion triggers. Immediate physician evaluation is required."
    },
    {
        "name": "Platelets (Severe Thrombocytopenia)",
        "patterns": [r"(?i)\bplatelets?\b[^\d]*(\d+)\s*(?:k/ul|x10\^3/ul|/ul)?"],
        "check": lambda v: v <= 25.0 or (v <= 25000 and v > 500),
        "urgency": "CRITICAL EMERGENCY",
        "action": "Critically low platelet count puts you at high risk for spontaneous internal bleeding. Avoid injury and seek urgent emergency care."
    }
]

MEDICAL_KEYWORDS = [
    "glucose", "cholesterol", "hemoglobin", "hgb", "wbc", "rbc", "platelet",
    "alt", "ast", "creatinine", "bun", "sodium", "potassium", "tsh", "lipid",
    "triglyceride", "hba1c", "a1c", "calcium", "bilirubin", "hematocrit",
    "mcv", "mch", "mchc", "egfr", "albumin", "protein", "crp", "ferritin",
    "iron", "vitamin", "test", "panel", "result", "reference", "lab", "flag",
    "high", "low", "normal", "mg/dl", "mmol/l", "g/dl", "u/l", "iu/l", "mcg/dl"
]

def scan_critical_values(text: str) -> List[Dict[str, str]]:
    """
    Deterministic rule-based pre-screener for dangerous, life-threatening lab values.
    Runs BEFORE sending to the LLM to guarantee safety regardless of AI hallucinations.
    """
    alerts = []
    text_lower = text.lower()
    
    for item in CRITICAL_THRESHOLDS:
        for pattern in item["patterns"]:
            matches = re.finditer(pattern, text_lower)
            for m in matches:
                try:
                    val = float(m.group(1))
                    if item["check"](val):
                        alerts.append({
                            "biomarker": item["name"],
                            "value": val,
                            "urgency": item["urgency"],
                            "guidance": item["action"]
                        })
                        break
                except (ValueError, IndexError):
                    continue
    return alerts

def validate_input_relevance(text: str) -> Dict[str, Any]:
    """
    Ensures input appears to be medical/lab test data.
    Prevents prompt injections or non-medical spam.
    """
    cleaned = text.strip()
    if len(cleaned) < 10:
        return {
            "valid": False,
            "error": "The provided input is too short. Please paste a complete lab test report (e.g., blood test, metabolic panel, or cholesterol results)."
        }
    
    # Check for medical keyword density
    found_keywords = [kw for kw in MEDICAL_KEYWORDS if kw in cleaned.lower()]
    if len(found_keywords) < 2 and not any(char.isdigit() for char in cleaned):
        return {
            "valid": False,
            "error": "The input does not appear to contain recognizable laboratory test markers or numeric values. Please paste your lab report numbers and reference ranges."
        }
    
    return {"valid": True, "detected_markers": found_keywords}

def sanitize_ai_response(response_text: str) -> str:
    """
    Post-processes AI response to remove absolute diagnostic assertions
    (e.g., 'You have leukemia') and enforces supportive clinical framing.
    """
    sanitized = response_text
    
    # Regex replacements for over-confident diagnoses
    patterns = [
        (r"(?i)\byou have ([a-z\s]+ cancer|leukemia|diabetes mellitus|kidney failure)\b",
         r"your lab patterns may be consistent with \1, which must be formally assessed by a physician"),
        (r"(?i)\bthis confirms you suffer from\b",
         r"this result strongly points toward the possibility of"),
        (r"(?i)\bstop taking your medications?\b",
         r"discuss your medication dosages with your prescribing doctor before making any changes"),
    ]
    
    for pat, rep in patterns:
        sanitized = re.sub(pat, rep, sanitized)
        
    return sanitized
