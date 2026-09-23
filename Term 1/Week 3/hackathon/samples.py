"""
Realistic sample lab reports for demonstration and testing.
"""

SAMPLE_LABS = {
    "1": {
        "title": "Complete Blood Count (CBC) — Fatigue & Mild Anemia",
        "description": "Common blood test showing low hemoglobin and iron deficiency indicators.",
        "text": """PATIENT LAB REPORT: ROUTINE HEMATOLOGY PANEL
Patient: Anonymous | Gender: Female | Age: 34
Specimen: Whole Blood EDTA

TEST NAME                    RESULT    REFERENCE RANGE    UNITS    FLAG
-------------------------------------------------------------------------
White Blood Cell Count (WBC)   6.4       4.5 - 11.0         x10^3/uL  NORMAL
Red Blood Cell Count (RBC)     3.82      3.80 - 5.10        x10^6/uL  NORMAL
Hemoglobin (Hgb)              10.1      11.7 - 15.5        g/dL      LOW
Hematocrit (Hct)              31.2      35.0 - 45.0        %         LOW
Mean Corpuscular Vol (MCV)    74.5      80.0 - 100.0       fL        LOW
Mean Corpuscular Hgb (MCH)    24.2      27.0 - 33.0        pg        LOW
MCHC                          31.8      32.0 - 36.0        g/dL      LOW
Platelets                     285       150 - 450          x10^3/uL  NORMAL
Ferritin                      9.2       15.0 - 150.0       ng/mL     LOW
Notes: Microcytic hypochromic red blood cell morphology observed."""
    },
    "2": {
        "title": "Comprehensive Metabolic Panel (CMP) — Prediabetes & Liver Enzymes",
        "description": "Routine metabolic check showing elevated fasting glucose and borderline liver markers.",
        "text": """PATIENT LAB REPORT: COMPREHENSIVE METABOLIC PANEL (CMP)
Patient: Anonymous | Gender: Male | Age: 48
Specimen: Serum Fasting (12 hrs)

TEST NAME                    RESULT    REFERENCE RANGE    UNITS    FLAG
-------------------------------------------------------------------------
Glucose, Fasting              118       70 - 99            mg/dL    HIGH
Blood Urea Nitrogen (BUN)     16        7 - 20             mg/dL    NORMAL
Creatinine, Serum             0.95      0.70 - 1.30        mg/dL    NORMAL
eGFR                          92        > 60               mL/min   NORMAL
Sodium                        140       136 - 145          mmol/L   NORMAL
Potassium                     4.4       3.5 - 5.1          mmol/L   NORMAL
Chloride                      102       98 - 107           mmol/L   NORMAL
Carbon Dioxide (CO2)          24        22 - 29            mmol/L   NORMAL
Calcium                       9.3       8.5 - 10.5         mg/dL    NORMAL
Total Protein                 7.1       6.3 - 8.2          g/dL     NORMAL
Albumin                       4.3       3.5 - 5.0          g/dL     NORMAL
Bilirubin, Total              0.8       0.2 - 1.2          mg/dL    NORMAL
Alkaline Phosphatase (ALP)    68        44 - 121           U/L      NORMAL
AST (SGOT)                    32        10 - 40            U/L      NORMAL
ALT (SGPT)                    54        7 - 45             U/L      HIGH
Notes: Fasting state verified. Mild transaminase elevation noted."""
    },
    "3": {
        "title": "Lipid Panel — Cardiovascular & Cholesterol Assessment",
        "description": "Shows elevated LDL 'bad' cholesterol and triglycerides requiring lifestyle or statin review.",
        "text": """PATIENT LAB REPORT: STANDARD LIPID PROFILE
Patient: Anonymous | Gender: Male | Age: 52
Fasting Duration: 14 hours

TEST NAME                    RESULT    REFERENCE RANGE    UNITS    FLAG
-------------------------------------------------------------------------
Total Cholesterol             242       < 200              mg/dL    HIGH
Triglycerides                 215       < 150              mg/dL    HIGH
HDL Cholesterol ('Good')      39        > 40               mg/dL    LOW
LDL Cholesterol ('Bad')       160       < 100              mg/dL    HIGH
Cholesterol / HDL Ratio       6.2       < 5.0                       HIGH
Non-HDL Cholesterol           203       < 130              mg/dL    HIGH
Notes: Patient reports dietary history of fast food and limited weekly aerobic activity."""
    },
    "4": {
        "title": "CRITICAL EMERGENCY TEST: Severe Hyperkalemia",
        "description": "Edge case demonstrating immediate emergency intercept and critical value guardrails.",
        "text": """PATIENT LAB REPORT: STAT ELECTROLYTES PANEL
Specimen ID: #STAT-89412 | Location: Urgent Walk-In Clinic

TEST NAME                    RESULT    REFERENCE RANGE    UNITS    FLAG
-------------------------------------------------------------------------
Sodium                        138       135 - 145          mEq/L    NORMAL
Potassium                     6.8       3.5 - 5.0          mEq/L    CRITICAL HIGH
Chloride                      104       96 - 106           mEq/L    NORMAL
Bicarbonate                   18        22 - 29            mEq/L    LOW
Blood Glucose                 140       70 - 99            mg/dL    HIGH
WARNING: Specimen Potassium verified by repeat stat analysis. Critical alert threshold exceeded."""
    }
}
