from __future__ import annotations
import re

# physiological alert thresholds for immediate medical evaluation in dutch clinical practice (mmol/L)
CRITICAL_THRESHOLDS = [
    (
        "Potassium / Kalium (Hyperkalemia)",
        r"(?<!vitamine\s)(?<!vitamin\s)\b(?:potassium|kalium|k\+)\b",
        lambda v, is_mmol: v >= 6.0,
        "CRITICAL EMERGENCY",
        "Potassium (kalium) >= 6.0 mmol/L is dangerously high (hyperkalemia) with immediate risk of severe cardiac arrhythmias. Seek immediate emergency care: call 112 or go to the nearest emergency room (spoedeisende hulp / SEH) or contact the huisartsenpost."
    ),
    (
        "Potassium / Kalium (Severe Hypokalemia)",
        r"(?<!vitamine\s)(?<!vitamin\s)\b(?:potassium|kalium|k\+)\b",
        lambda v, is_mmol: v <= 2.5,
        "CRITICAL EMERGENCY",
        "Potassium (kalium) <= 2.5 mmol/L is critically low (severe hypokalemia) with serious risk of heart rhythm disorders and muscle weakness. Contact your huisarts or the huisartsenpost immediately."
    ),
    (
        "Glucose (Severe Hypoglycemia)",
        r"\b(?:glucose|glu|gluc|bloedsuiker|nuchtere glucose|fasting glucose)\b",
        lambda v, is_mmol: v <= 2.8 if is_mmol else v <= 50.0,
        "CRITICAL EMERGENCY",
        "Blood glucose <= 2.8 mmol/L is life-threateningly low (severe hypoglycemia / hypo). Consume fast-acting sugar immediately (dextrose, fruit juice, sugar cubes) and contact your huisarts or call 112 if confused or drowsy."
    ),
    (
        "Glucose (Severe Hyperglycemia)",
        r"\b(?:glucose|glu|gluc|bloedsuiker|nuchtere glucose|fasting glucose)\b",
        lambda v, is_mmol: v >= 22.2 if is_mmol else v >= 400.0,
        "URGENT MEDICAL ATTENTION",
        "Blood glucose is critically elevated (>= 22.2 mmol/L), carrying high risk of ketoacidosis (DKA) or hyperosmolar state. Contact your huisarts or the huisartsenpost immediately."
    ),
    (
        "Hemoglobin / Hb (Severe Anemia)",
        r"\b(?:hemoglobin|hemoglobine|hgb|hb)\b",
        lambda v, is_mmol: v <= 4.3 if is_mmol else v <= 7.0,
        "URGENT MEDICAL ATTENTION",
        "Hemoglobin <= 4.3 mmol/L (or <= 7.0 g/dL) indicates severe anemia below standard clinical transfusion thresholds. Urgent evaluation by your huisarts or hospital specialist is required."
    ),
    (
        "Platelets / Trombocyten (Severe Thrombocytopenia)",
        r"\b(?:platelets?|plt|thrombocytes?|bloedplaatjes|trombocyten?)\b",
        lambda v, is_mmol: v <= 25.0 or (1000 <= v <= 25000),
        "CRITICAL EMERGENCY",
        "Critically low platelet count (trombocyten <= 25) carries severe risk of spontaneous internal bleeding. Avoid injury and contact your huisarts, visit the emergency room (SEH), or call 112 immediately."
    ),
    (
        "Triglycerides / Lipids (Severe Hypertriglyceridemia)",
        r"\b(?:triglycerides?|triglyceriden?|trig)\b",
        lambda v, is_mmol: v >= 10.0 if is_mmol else v >= 885.0,
        "URGENT MEDICAL ATTENTION",
        "Triglycerides >= 10.0 mmol/L is severely elevated, carrying acute risk of pancreatitis (alvleesklierontsteking). Contact your huisarts promptly for clinical evaluation."
    )
]

# clinical terms and units for input relevance check (o(1) set lookup)
# accepts dutch and international naming conventions
MEDICAL_KEYWORDS = {
    "glucose", "glu", "gluc", "cholesterol", "hemoglobin", "hemoglobine", "hgb", "hb",
    "wbc", "rbc", "platelet", "platelets", "plt", "thrombocyte", "thrombocytes",
    "alt", "ast", "creatinine", "kreatinine", "bun", "ureum", "sodium", "natrium",
    "na", "potassium", "kalium", "k", "k+", "tsh", "lipid", "lipiden", "triglyceride",
    "triglycerides", "triglyceriden", "hba1c", "a1c", "calcium", "ca", "bilirubin",
    "bilirubine", "hematocrit", "hematocriet", "hct", "ht", "mcv", "mch", "mchc",
    "egfr", "gfr", "albumin", "albumine", "protein", "eiwit", "crp", "ferritin",
    "ferritine", "iron", "ijzer", "fe", "vitamin", "vitamine", "vit", "25-oh",
    "d3", "cholecalciferol", "alat", "asat", "bse", "bezinking", "pfeiffer",
    "ebv", "mononucleosis", "b12", "cobalamine", "folate", "foliumzuur",
    # units
    "mg/dl", "mmol/l", "mmol/mol", "umol/l", "µmol/l", "ug/l", "pmol/l", "g/dl",
    "u/l", "iu/l", "mcg/dl", "meq/l", "fl", "l/l",
    # common dutch test names
    "bloedsuiker", "nuchter", "bloedbeeld", "bloedplaatjes", "bezinking"
}

def scan_critical_values(text: str) -> list[dict]:
    # pre-screen test text for life-threatening values before calling gemini
    alerts = []
    lines = text.splitlines()
    doc_has_mmol = bool(re.search(r"\bmmol\b", text, re.IGNORECASE))

    for name, keyword, check, urgency, action in CRITICAL_THRESHOLDS:
        for line in lines:
            # skip header metadata and clinical notes lines that contain narrative free text
            if re.match(r"^\s*(?:notes?|opmerking(?:en)?|indicati(?:e|on)|setting|patient|doctor|advies|conclusie)\b", line, re.IGNORECASE):
                continue

            if not re.search(keyword, line, re.IGNORECASE):
                continue

            # normalize dutch/european decimal commas: '5,9' -> '5.9'
            cleaned = re.sub(r"(\d+),(\d+)", r"\1.\2", line)
            # strip chemical name prefixes like 25-OH
            cleaned = re.sub(r"\b\d+-(?:oh|hydroxy)\b", " ", cleaned, flags=re.IGNORECASE)
            # strip sample/specimen ids, order numbers, barcode numbers: 'ID 12000' or '#12345'
            cleaned = re.sub(r"\b(?:id|sample|specimen|ordernr|buisje)\s*[:#]?\s*\d+\b", " ", cleaned, flags=re.IGNORECASE)
            # strip reference clauses, ranges, bounds, and scientific units
            cleaned = re.sub(r"\([^)]*(?:ref|referentie|range|norm|streefwaarde)[^)]*\)", " ", cleaned, flags=re.IGNORECASE)
            cleaned = re.sub(r"\b\d+\.?\d*\s*(?:-|to|tot)\s*\d+\.?\d*\b", " ", cleaned)
            cleaned = re.sub(r"(?:ref|referentie|norm|normaal|range|streefwaarde)\s*[:=]?\s*[<>=]?\s*\d+\.?\d*", " ", cleaned, flags=re.IGNORECASE)
            cleaned = re.sub(r"(?:x|\*|\b)?10\s*[\^e]\s*\d+(?:/\w+)?", " ", cleaned, flags=re.IGNORECASE)

            is_mmol = bool(re.search(r"\bmmol\b", line, re.IGNORECASE)) or (doc_has_mmol and not re.search(r"\bmg/dl\b", line, re.IGNORECASE))

            numbers = re.findall(r"\b\d+\.?\d*\b", cleaned)
            matched = False
            for num_str in numbers:
                try:
                    val = float(num_str)
                    if check(val, is_mmol):
                        alerts.append({
                            "biomarker": name,
                            "value": val,
                            "urgency": urgency,
                            "guidance": action
                        })
                        matched = True
                        break
                except ValueError:
                    continue
            if matched:
                break

    return alerts

def validate_input_relevance(text: str) -> str | None:
    # returns error message if input lacks medical biomarkers/numbers, or None if valid
    cleaned = text.strip()
    if len(cleaned) < 5 or not any(c.isdigit() for c in cleaned):
        return "The input does not appear to contain recognizable laboratory test markers or numeric values. Please paste your lab report numbers and reference ranges."

    if not (set(re.findall(r"[a-z0-9\+\/]+", cleaned.lower())) & MEDICAL_KEYWORDS):
        return "No medical biomarkers or laboratory terms were detected. Please enter valid test markers (such as HbA1c, glucose, cholesterol, or potassium)."
    return None

def sanitize_ai_response(response_text: str) -> str:
    # post-processing safety guard: softens overconfident diagnostic statements
    # and replaces any accidentally generated us healthcare tropes with dutch equivalents
    sanitized = response_text

    # guard against runaway repeating markdown table separator hyphens
    sanitized = re.sub(r"-{10,}", "---", sanitized)

    patterns = [
        (
            r"(?i)(?<!do\s)(?<!if\s)(?<!whether\s)(?<!for\s)\byou have ((?:(?:stage\s+\d+|acute|chronic|early|advanced|terminal|breast|colon|lung|prostate|skin)\s+)?cancer|leukemia|diabetes mellitus|kidney failure)(?!\s+screenings?|\s+tests?)\b",
            r"your lab patterns may be consistent with \1, which must be formally assessed by your huisarts"
        ),
        (
            r"(?i)\bthis confirms you suffer from\b",
            r"this result points toward the possibility of"
        ),
        (
            r"(?i)\byou are diagnosed with\b",
            r"your results suggest discussing with your doctor the possibility of"
        ),
        (
            r"(?i)\bstop taking your medications?\b",
            r"discuss your medications with your prescribing doctor or huisarts before making any changes"
        ),
        # replace any us emergency or healthcare references with dutch equivalents
        (
            r"(?i)\b(?:call\s+)?911\b",
            r"call 112 (or contact the huisartsenpost)"
        ),
        (
            r"(?i)\b(?:fqhc|fqhcs|community health center|sliding-scale clinics?)\b",
            r"huisartsenpraktijk or praktijkondersteuner (POH)"
        ),
        (
            r"(?i)\b(?:\$4 generic|prescription discount card|walmart prescription)\b",
            r"standard coverage through your Dutch basic health insurance (basisverzekering) via your huisarts or apotheek"
        )
    ]

    for pat, rep in patterns:
        sanitized = re.sub(pat, rep, sanitized)

    return sanitized
