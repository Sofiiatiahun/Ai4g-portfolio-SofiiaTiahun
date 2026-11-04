# LabBridge Student: Healthcare Navigator and Lab Explainer

> **AI for Good: Hackathon 3 (Equal Access)**  
> **SDG Focus**: Goal 10 (Reduced Inequalities)  
> **Target Group**: International higher education students in the Netherlands  
> **Core Tool**: Google Gemini API (Python native, standard library HTTP server)

[![SDG 10](https://img.shields.io/badge/SDG-10%20Reduced%20Inequalities-DD1367.svg)](https://sdgs.un.org/goals/goal10)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![Demo Video](https://img.shields.io/badge/Demo_Video-Watch_Walkthrough-red?logo=youtube)](https://youtu.be/gy9omRDuFRA)[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Project demonstration

A video walkthrough of the application is available on YouTube: [Watch the project demonstration](https://youtu.be/gy9omRDuFRA).

The recording covers:
1. Entering a Dutch blood report showing low Vitamin D (22 nmol/L) and generating a B1-level English explanation.
2. Generating Dutch and English phrases for speaking with a practice assistant (*doktersassistente*) to request a walk-in consultation.
3. Reviewing official NZa *passantentarief* fees (~€31.86) and reimbursement steps under EHIC and AON Student Insurance.
4. Testing an emergency scenario with critically elevated potassium (6.9 mmol/L) to verify deterministic 112 and *huisartsenpost* warnings.

---

## 1. Problem definition and Dutch healthcare context (SDG 10)

Around 120,000 international students study in the Netherlands, accounting for roughly 15% of the higher education population and up to 25% at institutions like De Haagse Hogeschool (HHS). Despite holding valid insurance, these students encounter practical barriers when they try to access medical care.

Dutch general practice (*huisartsenzorg*) relies on local patient registration and clinic-based gatekeeping. In major university cities such as The Hague, Delft, Rotterdam, and Leiden, high clinic loads create three specific obstacles:

1. **Registration closures (*patiëntenstop*)**: Most primary care clinics in student areas have closed their registration lists. International students frequently move into a municipality without being able to register with a dedicated GP (*huisarts*).
2. **Triage gatekeeping and language**: The clinic assistant (*doktersassistente*) assesses urgency over the phone and frequently recommends observation or paracetamol. Students who do not speak Dutch or who expect direct specialist referrals often struggle to explain their symptoms effectively or to request a *passantenconsult* (an incidental appointment for unregistered patients).
3. **Dutch lab reports and cost uncertainty**: When students receive blood test results from diagnostic centers (such as Atalmedial or Reinier de Graaf) or the municipal health service (GGD), the documents use Dutch clinical terminology and flags (`VERHOOGD`, `DEFICIËNT`). Students on international student plans (AON, Swisscare) or European Health Insurance Cards (EHIC) frequently assume that booking an appointment without a regular GP will trigger high private fees, which leads them to postpone medical evaluations.

### Evidence and sources

* **GP registration shortages**: The Netherlands Court of Audit (*Algemene Rekenkamer*, April 2025) reported in [*Focus on Shortage of General Practitioners*](https://english.rekenkamer.nl/documents/2025/04/02/focus-on-shortage-of-general-practitioners) that roughly 60% of GP practices temporarily halted new registrations in 2024. Between 777,000 and 926,000 residents in the Netherlands (about 1 in 20 people) lack a regular GP or are trying to change doctors.
* **Regulated walk-in tariffs**: Under the Dutch Healthcare Authority (*Nederlandse Zorgautoriteit*, NZa) [*Prestatie- en tariefbeschikking huisartsenzorg 2025*](https://www.lhv.nl/nieuws/wat-zijn-de-nza-tarieven-en-wijzigingen-voor-2025/), fees for unregistered patients (*passantenconsulten*) are legally capped: €15.93 for under 5 minutes, €31.86 for a standard consultation between 5 and 20 minutes, and €63.72 for 20 minutes or longer.
* **Student health and service awareness**: In the national student health monitor (MMMS 2025, conducted by RIVM, the Trimbos Institute, and GGD GHOR across 27,000 students), over half of respondents reported symptoms of emotional exhaustion. Studies synthesized by [Nuffic (2025)](https://www.nuffic.nl/onderzoek-en-cijfers/onderzoeken/welzijn-van-internationale-studenten-en-studenten-met-een) confirm that international students show lower awareness of local healthcare procedures and delay seeking care due to language and administrative confusion.
* **Insurance literacy**: In the Annual International Student Survey (AISS) organized by ISO, LSVb, and ESN, 37% of international students reported that they were uncertain about their health insurance rights and obligations in the Netherlands.
* **Micronutrient deficiencies in northern latitudes**: Data from Dutch population cohorts, including the Lifelines study (Nature/EJCN 2025, PMC6303232), document high rates of Vitamin D deficiency (< 30 nmol/L) and low ferritin levels during Dutch winter months among young adults arriving from sunnier latitudes.

---

## 2. Target user group and boundary conditions

### Target persona: Elena (21, international student in The Hague)

Elena is a second-year student at De Haagse Hogeschool who moved to the Netherlands from abroad. She lives in student housing in The Hague, holds an EHIC card and a private student insurance policy (AON), and has not been able to register with a local GP practice due to clinic waiting lists.

During autumn exam preparation, she experiences persistent tiredness and dizziness. She orders a routine blood test through a walk-in laboratory (Atalmedial) and receives a digital report in Dutch:
* `Vitamine D (25-OH): 22 nmol/L` (Reference: > 50, marked *deficiënt*)
* `Hemoglobine (Hb): 7.6 mmol/L` (Reference: 7.5 to 10.0)
* `Ferritine: 38 ug/L` (Reference: 15 to 150)
* `TSH: 2.1 mU/L` (Reference: 0.4 to 4.0)

Elena does not know how to interpret units like `nmol/L` or abbreviations like `25-OH`. Because she lacks a registered GP and assumes an unregistered consultation will be expensive, she hesitates to seek medical advice.

### How the system assists this case

1. **Clear B1 English explanation**: Translates Dutch terms into everyday language, explaining that low Vitamin D is common during Dutch winter months, while noting that thyroid and hemoglobin markers are within normal limits.
2. **Consultation phrasing**: Provides exact sentences in Dutch and English for booking an appointment as an unregistered patient (*passantenconsult*).
3. **Fee and reimbursement guidance**: Clarifies that the NZa regulates walk-in consultation fees at approximately €31.86 and explains how to submit the invoice to EHIC or AON.
4. **Self-care information**: Points to evidence-based advice on *Thuisarts.nl* and notes that standard Vitamin D supplements can be purchased over the counter at Dutch pharmacies.

### Boundary conditions: who is not the intended user

* **Emergency and trauma cases**: Anyone with severe acute symptoms (such as acute chest pain, suspected poisoning, or breathing difficulty) requires immediate emergency services (112) or the nearest hospital emergency department (*spoedeisende hulp*, SEH).
* **Pediatric patients (under 18)**: Pediatric reference ranges vary by growth stage and age, so adult diagnostic models are not applicable.
* **Healthcare professionals seeking clinical decision support**: The application does not calculate drug dosages, formulate clinical diagnoses, or replace professional medical assessment.
* **Users seeking to bypass medical care**: The application does not encourage unmonitored self-treatment. Outputs guide the user back to an appointment with a general practitioner.

### Language selection

International degree programmes in the Netherlands operate in English, while Dutch healthcare portals and practice staff operate primarily in Dutch. Presenting clinical explanations in B1 English alongside verbatim Dutch phrases allows students to understand their test results and communicate accurately with local clinic staff.

---

## 3. System architecture

LabBridge Student uses procedural Python with standard library components, avoiding heavy agent frameworks or external databases.

```
+-------------------------------------------------------------+
|                      Student Lab Report                     |
|   (e.g., Vitamine D 22 nmol/L, Hb 7.6 mmol/L, or raw slip)  |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|        Step 1: Input Relevance Check (guardrails.py)        |
|   - Regex check verifies presence of clinical biomarkers     |
|   - Rejects non-medical text or prompt injection attempts   |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|        Step 2: Deterministic Emergency Guardrails           |
|   - Scans text BEFORE AI call against safety bounds         |
|   - Potassium >= 6.0 mmol/L -> Critical 112 / HAP Alert     |
|   - Glucose <= 2.8 mmol/L -> Severe Hypoglycemia Alert      |
|   - Strips specimen/patient IDs & chemical prefixes (25-OH) |
|   - Normalizes European decimal commas ('5,9' -> '5.9')     |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|        Step 3: Google Gemini API Call (gemini_client.py)    |
|   - Model: gemini-3.5-flash-lite                            |
|   - Temperature: 0.2 (low randomness for medical accuracy)  |
|   - System Prompt enforces B1 English + Dutch phone scripts |
|     (doktersassistente, passantenconsult, NZa fees, 112)    |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|        Step 4: Output Sanitization (guardrails.py)          |
|   - Softens overconfident diagnostic statements             |
|   - Protects screening recommendations & questions          |
|   - Converts any accidental US terms to Dutch equivalents   |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|        Step 5: Delivery (Lightweight Web UI)                |
|   - Native HTTP server on port 8080                         |
|   - 1-click student presets, responsive mobile interface    |
+------------------------------+------------------------------+
```

### File breakdown

* `src/app.py`: Standard library HTTP server using `http.server`. Serves the web interface and handles JSON analysis requests on port 8080.
* `src/config.py`: Reads settings from `.env` in pure Python and ensures system SSL certificates (`/etc/ssl/cert.pem`) are configured for Google API calls.
* `src/guardrails.py`:
  * `scan_critical_values(text)`: Scans for life-threatening test values before invoking the language model. Filters out document headers, sample identifiers, and reference intervals, and normalizes European decimal commas.
  * `validate_input_relevance(text)`: Checks text against clinical biomarker sets to reject non-medical input.
  * `sanitize_ai_response(text)`: Softens definitive diagnostic assertions while preserving legitimate clinical questions and screening recommendations.
* `src/gemini_client.py`: Calls Google's Gemini REST API via `urllib.request`. Includes verified fallback guides for sample scenarios if the API is unreachable.
* `src/samples.py`: Contains test reports for common student presentations (seasonal Vitamin D deficiency, iron deficiency, mononucleosis, and electrolyte disturbances).
* `test_guardrails.py`: Test suite validating critical threshold detection, comma decimal normalization, specimen ID exclusion, and output sanitization.

---

## 4. Artificial intelligence implementation

* **Model**: Google Gemini 3.5 Flash Lite, selected for fast inference, reliable Markdown formatting, and multimodal vision capabilities (image and PDF lab report understanding).
* **Generation settings**: Temperature set to 0.2 to prioritize consistent clinical explanations; maximum output set to 4096 tokens.
* **System prompt structure**: Constrains language to B1 English and incorporates Dutch healthcare terms (*doktersassistente*, *passantenconsult*, NZa tariffs, *Thuisarts.nl*, and 112).
* **Output format**:
  1. Plain-language health summary using accessible physical analogies.
  2. Structured biomarker table with clinical status flags (`[NORMAL]`, `[MILD_SHIFT]`, `[ATTENTION]`, `[CRITICAL]`).
  3. ASCII range gauges visualizing the student's result relative to target intervals.
  4. Scripted Dutch and English phrases for speaking with clinic staff.
  5. Healthcare access guide summarizing NZa consultation fees and insurance claims.
  6. Triage advice distinguishing self-care, GP consultations, out-of-hours clinics (*huisartsenpost*), and 112 emergency care.
* **Error handling**:
  * Critical values (such as potassium $\ge$ 6.0 mmol/L) trigger deterministic warnings before calling the API.
  * If the network connection drops or the API is unavailable, the application returns verified offline reference guides for standard test scenarios.

---

## 5. Running the application

### Requirements
* Python 3.10 or higher
* `uv` or standard Python 3

### Configuration
Create a `.env` file in the root directory:
```ini
GEMINI_API_KEY=your_gemini_api_key_here
```

### Starting the server
```bash
# Using uv:
uv run python src/app.py

# Or standard Python:
python3 src/app.py
```
Open `http://localhost:8080` in your web browser.

### Running unit tests
```bash
uv run python test_guardrails.py
```

---

## 6. Ethical reflection

### Risks and potential harms

1. **Financial uncertainty and delayed care**: International students living on tight budgets often worry that visiting a doctor in the Netherlands will result in large unexpected bills. If an informational tool leaves costs ambiguous, a student might delay seeking care for treatable conditions such as severe anemia. To mitigate this, LabBridge explicitly cites the regulated NZa *passantentarief* (~€31.86) and clarifies how student insurance policies (such as AON or EHIC) handle consultation claims.
2. **False reassurance**: If an automated tool oversimplifies an abnormal test result, a user might decide not to consult a physician. To limit this risk, the system uses advisory language rather than definitive medical diagnoses. Outputs emphasize that the tool prepares the student for a doctor's appointment rather than replacing one.
3. **Emergency misclassification**: If a language model generates a casual summary for an acute, life-threatening lab result (such as severe hyperkalemia with potassium $\ge$ 6.0 mmol/L), the patient could face cardiac arrest while reading the explanation. To address this, emergency detection runs deterministically outside the AI pipeline. Life-threatening values immediately generate a prominent warning instructing the student to contact 112 or emergency services.
4. **Data privacy**: International students are often cautious about entering personal data into external platforms. The application requires no user accounts, sets no tracking cookies, and processes report text in memory without storing patient records.
