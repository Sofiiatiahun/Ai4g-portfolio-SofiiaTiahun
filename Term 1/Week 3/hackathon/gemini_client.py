import json
import urllib.request
import urllib.error
from typing import Dict, Any, Optional, Tuple
from config import GEMINI_API_KEY, DEFAULT_MODEL, FALLBACK_MODELS, API_BASE_URL
from guardrails import scan_critical_values, validate_input_relevance, sanitize_ai_response

SYSTEM_PROMPT = """You are LabBridge, an empathetic, highly skilled health literacy assistant and medical educator.
Your mission is to support UNINSURED, LOW-INCOME, and MARGINALIZED patients who received blood or lab test results but cannot easily afford follow-up doctor appointments or do not understand complex medical jargon (UN Sustainable Development Goal 10: Reduced Inequalities).

COMMUNICATION PRINCIPLES:
1. Speak in clear, warm, 6th-grade reading level English (avoid unnecessary Latin terms; explain terms like 'microcytic' as 'smaller than normal cells').
2. Destigmatize results: reassure the patient that lab numbers fluctuate with stress, hydration, and diet, and one abnormal number does NOT mean catastrophic disease.
3. NEVER issue a definitive medical diagnosis (e.g., do NOT say 'You have chronic kidney disease'). Instead say: 'This number is higher than the standard lab reference range, which doctors commonly evaluate for...'.
4. Emphasize COST-SAVING and ACCESSIBLE next steps: provide specific questions to ask a doctor so the patient doesn't waste time/money during brief appointments, and mention sliding-scale community clinics (FQHCs) and generic medication programs.
5. Always advise immediate emergency care if acute red flags or severe symptoms are present.

OUTPUT FORMAT REQUIREMENTS:
Provide your response formatted cleanly with the following clear markdown sections:
### 1. Simple Summary (What Your Test Shows in Everyday Terms)
(2-3 reassuring, clear paragraphs explaining the big picture)

### 2. Biomarker Breakdown
(A clear bulleted list or table for each biomarker found:
- **Biomarker Name**: [Normal / Elevated / Low] (Your value: X vs Normal range: Y)
  - *What it does*: Simple analogy.
  - *What your result means*: Plain explanation.)

### 3. Doctor Conversation Guide (Questions for Your Clinic Visit)
(3 to 5 high-priority, concrete questions the patient should ask their healthcare provider to maximize a short 15-minute appointment)

### 4. Affordable Next Steps & Community Support
(Practical, low-cost or free actions: dietary/hydration steps, how to find sliding-scale community health centers [FQHCs], and generic prescription assistance)

### 5. Medical Safety Disclaimer
(Clear statement that this analysis is educational and does not replace a licensed medical evaluation.)"""

def generate_offline_fallback(lab_text: str, critical_alerts: list) -> str:
    """
    Deterministic rule-based fallback generator used when the LLM API is unreachable,
    rate-limited, or run in an environment without internet connectivity.
    Ensures the user always receives a safe, meaningful, and actionable response.
    """
    lines = lab_text.lower()
    sections = []
    
    sections.append("### 1. Simple Summary (What Your Test Shows in Everyday Terms)\n")
    if critical_alerts:
        sections.append("> ⚠️ **CRITICAL ATTENTION REQUIRED**: One or more lab values are in an urgent clinical range requiring prompt physician review.\n")
    sections.append("This educational report translates the laboratory markers detected in your paperwork into plain language. Blood tests act like a snapshot of your body's chemistry at a specific moment—many numbers shift due to temporary hydration, fasting status, stress, or diet, and single numbers are rarely evaluated in isolation.\n")
    
    sections.append("### 2. Biomarker Breakdown\n")
    
    detected = []
    if "hemoglobin" in lines or "hgb" in lines:
        detected.append(
            "- **Hemoglobin / Hematocrit**: Oxygen carriers in your red blood cells.\n"
            "  - *What it does*: Acts like tiny delivery trucks carrying oxygen from your lungs to your muscles and brain.\n"
            "  - *Plain explanation*: When this is low, your body gets less oxygen, commonly causing fatigue, pale skin, or dizziness (often related to iron intake or vitamin absorption)."
        )
    if "ferritin" in lines:
        detected.append(
            "- **Ferritin**: Your body's iron storage bank.\n"
            "  - *What it does*: Stores iron so your bone marrow can build fresh red blood cells.\n"
            "  - *Plain explanation*: Low ferritin confirms your iron reserves are running low, supporting an iron-deficiency pattern."
        )
    if "glucose" in lines:
        detected.append(
            "- **Fasting Blood Glucose**: The amount of sugar circulating in your bloodstream.\n"
            "  - *What it does*: Fuel for your brain and muscles.\n"
            "  - *Plain explanation*: A fasting number above 100 mg/dL suggests your body's insulin response is working harder than usual. It is commonly reviewed for pre-diabetes."
        )
    if "cholesterol" in lines or "ldl" in lines:
        detected.append(
            "- **Cholesterol & Lipid Panel (Total, LDL, Triglycerides)**: Blood fats.\n"
            "  - *What it does*: Essential for building cell walls and hormones, but excess amounts can stick to blood vessel walls.\n"
            "  - *Plain explanation*: Elevated LDL ('bad' cholesterol) or triglycerides indicate that dietary fiber, aerobic exercise, or medical evaluation is recommended to protect long-term heart health."
        )
    if "alt" in lines or "ast" in lines:
        detected.append(
            "- **Liver Enzymes (ALT / AST)**: Proteins released when liver cells work under stress.\n"
            "  - *What it does*: Helps process food and filter waste.\n"
            "  - *Plain explanation*: Mild elevations often reflect common, reversible factors such as fatty liver, medications (like Tylenol/acetaminophen), alcohol, or recent intense workouts."
        )
    if "potassium" in lines:
        detected.append(
            "- **Potassium**: An essential electrolyte that regulates heart rhythm and muscle contraction.\n"
            "  - *What it does*: Controls electrical signals across your heart and nerve cells.\n"
            "  - *Plain explanation*: Potassium levels must stay within a strict reference window. High or low values require medical follow-up."
        )
        
    if detected:
        sections.extend(detected)
    else:
        sections.append("- Your test contains general biochemical indicators. We strongly recommend comparing each marked indicator against the printed reference range on your lab slip.")
        
    sections.append("\n### 3. Doctor Conversation Guide (Questions for Your Clinic Visit)\n")
    sections.append("Because medical visits are often rushed (averaging only 15 minutes), bring these exact questions written down:\n")
    sections.append("1. *'Which of these flagged values is the most important for us to address first?'*")
    sections.append("2. *'Could any of my current over-the-counter medications, supplements, or fasting status have influenced these results?'*")
    sections.append("3. *'Are there low-cost lifestyle or dietary adjustments I can try for 3 months before starting prescription drugs?'*")
    sections.append("4. *'If we need a repeat test, can we use a low-cost lab order or community clinic?'*")

    sections.append("\n### 4. Affordable Next Steps & Community Support\n")
    sections.append("- **Federally Qualified Health Centers (FQHCs) & Community Health Clinics**: In the US and many countries, community health centers receive federal grants to provide care on a **sliding-fee discount schedule** based on your household income. Even if uninsured, fees can be as low as $15–$30 per visit.")
    sections.append("- **Affordable Generic Medications**: If prescriptions are recommended, ask your doctor for $4 generic list alternatives (available at major retailers) or utilize discount programs like GoodRx or Cost Plus Drugs.")
    sections.append("- **Everyday Support**: Stay well-hydrated, focus on whole foods, and maintain a written log of any symptoms (fatigue, shortness of breath, dizziness) to share with your clinician.")

    sections.append("\n### 5. Medical Safety Disclaimer\n")
    sections.append("*Disclaimer: LabBridge is an AI-powered health literacy and educational tool designed to support patient understanding. It does not provide medical diagnosis, formal treatment plans, or prescription adjustments. Always consult a qualified medical professional for personal clinical decisions.*")
    
    return "\n".join(sections)


def call_gemini_api(lab_text: str, api_key: str = GEMINI_API_KEY, model_name: str = DEFAULT_MODEL) -> Tuple[str, Dict[str, Any]]:
    """
    Sends the lab report to the Gemini API and returns the generated plain-language response.
    Includes fallback to alternative Gemini models and deterministic safety fallback.
    """
    # 1. Check input validity
    val_check = validate_input_relevance(lab_text)
    if not val_check["valid"]:
        return val_check["error"], {"status": "validation_error", "source": "guardrail"}

    # 2. Check deterministic clinical safety rules
    critical_alerts = scan_critical_values(lab_text)
    alert_header = ""
    if critical_alerts:
        alert_header = "🚨 **URGENT MEDICAL SAFETY WARNING** 🚨\n\n"
        for alert in critical_alerts:
            alert_header += f"- **{alert['urgency']}**: {alert['guidance']}\n"
        alert_header += "\n*If you are experiencing severe chest pain, shortness of breath, confusion, or severe weakness, call 911 or visit the nearest emergency room immediately.*\n\n---\n\n"

    # 3. Formulate the prompt
    user_content = f"""Please analyze this patient lab test report and explain it clearly according to your instructions:

=== PATIENT LAB REPORT ===
{lab_text}
==========================
"""

    models_to_try = [model_name] + [m for m in FALLBACK_MODELS if m != model_name]
    
    last_error = None
    for model in models_to_try:
        url = f"{API_BASE_URL}/models/{model}:generateContent?key={api_key}"
        headers = {"Content-Type": "application/json"}
        
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": f"{SYSTEM_PROMPT}\n\n{user_content}"}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "topP": 0.8,
                "maxOutputTokens": 2048
            }
        }
        
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers=headers,
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                if resp.status == 200:
                    raw_data = json.loads(resp.read().decode("utf-8"))
                    candidates = raw_data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        text_parts = [p.get("text", "") for p in parts if "text" in p]
                        full_response = "".join(text_parts)
                        
                        # Apply clinical safety sanitization
                        clean_response = sanitize_ai_response(full_response)
                        final_text = alert_header + clean_response
                        
                        return final_text, {
                            "status": "success",
                            "model_used": model,
                            "critical_alerts_count": len(critical_alerts),
                            "source": "live_api"
                        }
        except urllib.error.HTTPError as http_err:
            last_error = f"HTTP {http_err.code}: {http_err.reason}"
            # If 404 model not found, loop to next fallback model
            if http_err.code == 404:
                continue
            # For 400 or other errors, keep note
        except Exception as e:
            last_error = str(e)
            
    # If all live API attempts fail (e.g. offline sandbox or network unreachable),
    # use the robust deterministic fallback engine
    fallback_text = alert_header + generate_offline_fallback(lab_text, critical_alerts)
    return fallback_text, {
        "status": "fallback_offline",
        "reason": last_error or "Network unavailable or model not reachable",
        "critical_alerts_count": len(critical_alerts),
        "source": "deterministic_engine"
    }
