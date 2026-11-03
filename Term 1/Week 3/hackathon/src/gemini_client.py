import ssl
import json
import urllib.request
from config import GEMINI_API_KEY, DEFAULT_MODEL, API_BASE_URL
from guardrails import scan_critical_values, validate_input_relevance, sanitize_ai_response
from samples import SAMPLE_LABS, SAMPLE_EXPLANATIONS

# system prompt tailored for international students in the netherlands (sdg 10: reduced inequalities)
# communication calibrated at b1 plain english, fully grounded in the dutch healthcare system
SYSTEM_PROMPT = """You are LabBridge Student, an empathetic clinical explainer and healthcare navigator for international students in the Netherlands (SDG 10: Reduced Inequalities).
Calibrate communication at B1 plain English grounded in the Dutch healthcare ecosystem (huisarts, doktersassistente gatekeeping, passantenconsult, NZa tariffs, EHIC/AON student insurance, Thuisarts.nl, 112).
Strictly NO emojis anywhere. Explain the student's lab report using these exact Markdown sections:

### 1. Plain-English Health Picture & Student Context
> **Overview**: 1 clear, reassuring sentence summarizing the general health picture.
2 short paragraphs explaining bodily systems using accessible analogies (e.g. transport barges for hemoglobin/oxygen, solar recharge battery for Vitamin D, liver filtration for viral immune response) tailored to student lifestyle (exam stress, Dutch winter light, dietary shifts).

### 2. At-a-Glance Lab Scorecard
Markdown table with columns:
| Biomarker | Your Value | Target Range | Status | Clinical Summary |
Status must be one of: [NORMAL], [MILD_SHIFT], [ATTENTION], [CRITICAL].

### 3. Visual Spectrum Range Gauges
ASCII text gauges for any attention/critical markers showing target band and student result.

### 4. Doctor Phone Script (Getting Past the Doktersassistente Gatekeeper)
2-3 numbered cards designed to help unregistered international students book care or communicate with Dutch clinics:
- *Say in Dutch*: exact Dutch phrase to say to the doktersassistente
- *Say in English*: English translation
- *Purpose*: concise explanation of why to say this (e.g. explicitly requesting a 'passantenconsult' or stating key clinical values)

### 5. Healthcare Access, Insurance & Costs (NZa & Student Insurance)
- Consultation Costs (NZa Passantentarief): Explain standard regulated fees for unregistered patients (~€31.86 for 5-20 min consult under NZa 2025 tariffs).
- Insurance Reimbursement: Specific guidance for EU students with EHIC, non-EU students with private insurance (AON / Swisscare), and students with Dutch basisverzekering.
- Self-Care & Thuisarts.nl: Relevant over-the-counter advice (apotheek/drogist) and official Thuisarts.nl search query.

### 6. Clinical Triage & Safety Guidance
- Routine Care: When to book a non-urgent passantenconsult (or university health clinic).
- Urgent Daytime Concerns: Symptoms that require immediate same-day GP contact.
- Evenings & Weekends (Huisartsenpost / HAP): When to call regional HAP for urgent care outside office hours.
- Immediate Emergency (112): Call 112 for severe chest pain, breathing collapse, or loss of consciousness."""

def call_gemini_api(lab_text: str, api_key: str = GEMINI_API_KEY, model_name: str = DEFAULT_MODEL) -> tuple[str, dict]:
    # step 1: check if input contains medical biomarkers; reject junk or irrelevant text
    val_err = validate_input_relevance(lab_text)
    if val_err:
        return val_err, {"status": "validation_error", "source": "guardrail"}

    # step 2: scan deterministic emergency thresholds (e.g. potassium >= 6.0, glucose <= 2.8)
    critical_alerts = scan_critical_values(lab_text)
    alert_header = ""
    if critical_alerts:
        alert_header = "### CRITICAL MEDICAL SAFETY NOTICE\n\n"
        for alert in critical_alerts:
            alert_header += f"- **{alert['urgency']} ({alert['biomarker']})**: {alert['guidance']}\n"
        alert_header += (
            "\n*If you are experiencing severe acute symptoms (such as shortness of breath, severe chest pain, acute confusion, or loss of function): "
            "call 112 immediately or contact the huisartsenpost / emergency room.*\n\n---\n\n"
        )

    # step 3: guard against missing api keys
    if not api_key:
        msg = alert_header + "Gemini API key is not configured. Set GEMINI_API_KEY in .env or pass a valid key."
        return msg, {"status": "configuration_error", "source": "guardrail", "critical_alerts_count": len(critical_alerts)}

    # step 4: construct gemini rest api payload
    url = f"{API_BASE_URL}/models/{model_name}:generateContent?key={api_key}"
    payload = {
        "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": [{"parts": [{"text": f"Extract and explain this patient lab test report:\n\n=== PATIENT LAB REPORT ===\n{lab_text}\n=========================="}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 4096
        }
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    # step 5: send http request
    ctx = ssl.create_default_context()
    try:
        with urllib.request.urlopen(req, timeout=60, context=ctx) as resp:
            raw_data = json.loads(resp.read().decode("utf-8"))
        candidates = raw_data.get("candidates", [])
        if not candidates:
            return alert_header + "Gemini API returned no response candidates.", {"status": "api_error", "source": "gemini", "critical_alerts_count": len(critical_alerts)}
        parts = candidates[0].get("content", {}).get("parts", [])
        raw_text = "".join(p.get("text", "") for p in parts if "text" in p)
    except Exception as e:
        # deterministic clinical fallback for presets if network or api times out
        for k, sample in SAMPLE_LABS.items():
            if sample["text"].strip() == lab_text.strip() and k in SAMPLE_EXPLANATIONS:
                return alert_header + SAMPLE_EXPLANATIONS[k], {
                    "status": "success",
                    "model_used": "preset_fallback",
                    "critical_alerts_count": len(critical_alerts),
                    "source": "verified_preset"
                }
        fallback = (
            alert_header +
            "### Clinical Explanation Notice\n\n"
            "The AI detailed narrative generator is temporarily unreachable (connection timeout). "
            "Please review the laboratory test values with your huisarts, praktijkondersteuner (POH), or contact the huisartsenpost if urgent."
        )
        return fallback, {"status": "api_error", "source": "gemini", "error_detail": str(e), "critical_alerts_count": len(critical_alerts)}

    # step 6: sanitize ai output to strip overconfident diagnoses and enforce safety standards
    clean_text = sanitize_ai_response(raw_text)
    return alert_header + clean_text, {
        "status": "success",
        "model_used": model_name,
        "critical_alerts_count": len(critical_alerts),
        "source": "live_api"
    }
