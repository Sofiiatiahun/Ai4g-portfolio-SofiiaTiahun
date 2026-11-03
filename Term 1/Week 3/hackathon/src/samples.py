# sample lab reports calibrated for international students in the netherlands (dutch clinical format in english)
# units: electrolytes & glucose in mmol/L, hemoglobin in mmol/L, vitamin d in nmol/L, ferritin in ug/L, liver enzymes in U/L

SAMPLE_LABS = {
    "1": {
        "title": "Winter Fatigue & Severe Vitamin D Deficiency (International Student in NL)",
        "text": """PATIENT LAB REPORT: ROUTINE STUDENT WELLBEING PANEL
Patient: Anonymous | Age: 21 | Setting: Student Health Center / Walk-in Diagnostic Lab (Atalmedial / Reinier de Graaf)
Doctor / Request: Walk-in Passantenconsult | Indication: Persistent winter fatigue, brain fog, and low energy during November exams

TEST NAME                       RESULT     REFERENCE RANGE     UNITS       FLAG
---------------------------------------------------------------------------------
Vitamine D (25-OH)              22         > 50                nmol/L      DEFICIENT (< 30)
Hemoglobin (Hb)                 7.6        7.5 - 10.0          mmol/L      NORMAL (Borderline)
Ferritin (iron stores)          38         15 - 150            ug/L        NORMAL
TSH (thyroid function)          2.1        0.4 - 4.0           mU/L        NORMAL
Creatinine                      74         50 - 90             umol/L      NORMAL
eGFR (kidney filtration)        > 90       > 60                mL/min      NORMAL
Glucose, Fasting                4.9        4.0 - 6.0           mmol/L      NORMAL
Notes: Marked 25-OH Vitamin D deficiency common among international students adapting to Dutch winter latitude. Thyroid, kidney, and glucose are completely healthy. Non-urgent GP consultation / dietary supplementation advised."""
    },
    "2": {
        "title": "CRITICAL EMERGENCY TEST — Dangerously High Potassium (Kalium 6.9 mmol/L)",
        "text": """PATIENT LAB REPORT: STAT ELECTROLYTES & RENAL PANEL
Patient: Anonymous | Location: Urgent Walk-in / Huisartsenpost / SEH

TEST NAME                       RESULT     REFERENCE RANGE     UNITS       FLAG
---------------------------------------------------------------------------------
Potassium (Kalium)              6.9        3.5 - 5.0           mmol/L      CRITICAL HIGH
Sodium (Natrium)                138        135 - 145           mmol/L      NORMAL
Chloride                        102        96 - 106            mmol/L      NORMAL
Creatinine                      165        60 - 110            umol/L      HIGH
eGFR (kidney filtration)        38         > 60                mL/min      LOW
Glucose (blood sugar)           6.4        4.0 - 7.8           mmol/L      NORMAL
WARNING: Potassium >= 6.0 mmol/L confirmed by repeat STAT analysis. Acute risk of cardiac arrhythmias. Seek immediate emergency care."""
    },
    "3": {
        "title": "Exhaustion & Iron Deficiency Anemia (Low Ferritin & Low Hb in mmol/L)",
        "text": """PATIENT LAB REPORT: HEMATOLOGY & IRON STATUS
Patient: Anonymous | Gender: Female | Age: 22
Setting: Huisartsenpraktijk / Passantenconsult | Indication: Severe fatigue, shortness of breath on university stairs, pale complexion

TEST NAME                       RESULT     REFERENCE RANGE     UNITS       FLAG
---------------------------------------------------------------------------------
Hemoglobin (Hb)                 5.8        7.5 - 10.0          mmol/L      LOW
Ferritin (iron stores)          7          15 - 150            ug/L        LOW
Hematocrit (Ht)                 0.29       0.36 - 0.46         l/l         LOW
MCV (mean cell volume)          71         80 - 100            fl          LOW
Erythrocytes (RBC)              3.5        3.8 - 5.2           x10^12/L    LOW
BSE (Bezinking / ESR)           24         < 20                mm/h        MILD HIGH
Leukocytes (WBC)                6.4        4.0 - 10.0          x10^9/L     NORMAL
Platelets (Trombocyten)         280        150 - 400           x10^9/L     NORMAL
Notes: Microcytic hypochromic anemia consistent with iron depletion. Non-emergency GP passantenconsult recommended for oral iron prescription (ferrofumaraat)."""
    },
    "4": {
        "title": "Student Mononucleosis (Pfeiffer / Glandular Fever) & Liver Panel",
        "text": """PATIENT LAB REPORT: INFLAMMATORY & HEPATIC WORK-UP
Patient: Anonymous | Age: 20 | Gender: Male
Setting: Student Health Walk-in (GGD / Passantenconsult) | Indication: Swollen lymph nodes, severe sore throat, extreme fatigue after introduction week

TEST NAME                       RESULT     REFERENCE RANGE     UNITS       FLAG
---------------------------------------------------------------------------------
ALAT (GPT - liver enzyme)       84         < 45                U/L         HIGH
ASAT (GOT - liver enzyme)       68         < 35                U/L         HIGH
Leukocytes (WBC)                12.4       4.0 - 10.0          x10^9/L     HIGH
BSE (Bezinking / ESR)           28         < 15                mm/h        HIGH
CRP (C-reactive protein)        18         < 5                 mg/L        HIGH
Bilirubin                       14         < 17                umol/L      NORMAL
Platelets (Trombocyten)         210        150 - 400           x10^9/L     NORMAL
Notes: Reactive inflammatory and liver pattern characteristic of viral infection (such as Epstein-Barr virus / Pfeiffer / mono). Requires rest, avoiding alcohol and contact sports. Non-urgent GP follow-up."""
    }
}

# pre-generated verified clinical explanations for instant offline fallback and demo reliability
SAMPLE_EXPLANATIONS = {
    "1": """### 1. Plain-English Health Picture & Student Context
> **Overview**: Your blood test confirms severe Vitamin D deficiency (22 nmol/L), which directly explains your winter fatigue and low energy, while your thyroid, kidneys, and blood sugar are completely healthy.

Moving to the Netherlands between October and April exposes international students to northern latitude winter light conditions where the human skin cannot synthesize sufficient Vitamin D from sunlight. 

Think of Vitamin D as your body's solar battery recharge current. When your battery dips to 22 nmol/L (target is > 50 nmol/L), muscle energy metabolism slows down, causing brain fog and physical exhaustion during exam periods. The reassuring news is that your thyroid (TSH 2.1) and kidneys (eGFR > 90) are completely normal—your body is metabolically healthy, but simply needs a seasonal Vitamin D supplement.

### 2. At-a-Glance Lab Scorecard
| Biomarker | Your Value | Target Range | Status | Clinical Summary |
| --- | --- | --- | --- | --- |
| Vitamine D (25-OH) | 22 nmol/L | > 50 | [ATTENTION] | Deficient; primary cause of seasonal winter fatigue and low mood |
| Hemoglobin (Hb) | 7.6 mmol/L | 7.5 - 10.0 | [NORMAL] | Lower baseline of normal; oxygen-carrying capacity is stable |
| Ferritin (iron stores) | 38 ug/L | 15 - 150 | [NORMAL] | Tissue iron stores are intact; anemia is ruled out |
| TSH (thyroid function) | 2.1 mU/L | 0.4 - 4.0 | [NORMAL] | Thyroid hormone regulation is running smoothly |
| Creatinine | 74 umol/L | 50 - 90 | [NORMAL] | Kidney filtration is fully healthy |
| eGFR (kidney filtration) | > 90 mL/min | > 60 | [NORMAL] | Optimal kidney function |
| Glucose, Fasting | 4.9 mmol/L | 4.0 - 6.0 | [NORMAL] | Fasting blood sugar is completely normal |

### 3. Visual Spectrum Range Gauges
Vitamine D (25-OH): * (22) <---- [ 50 === Target === 120 ] [ATTENTION]
Hemoglobin (Hb): [ 7.5 === Target === 10.0 ] * (7.6) [NORMAL]
Ferritin: [ 15 === Target === 150 ] * (38) [NORMAL]

### 4. Doctor Phone Script (Getting Past the Doktersassistente Gatekeeper)
1. **Requesting a Passantenconsult (If Not Registered with a GP)**
- *Say in Dutch*: "Goedemorgen, ik ben een internationale student en ik sta nog niet ingeschreven bij een huisarts. Mijn bloedtest toont een vitamine D-tekort (22 nmol/L). Kan ik een afspraak maken als passant voor advies over een receptdosering?"
- *Say in English*: "Good morning, I am an international student not yet registered with a GP. My blood work shows a Vitamin D deficiency (22 nmol/L). Can I book an appointment as a passant for advice on prescription dosage?"
- *Purpose*: Uses the magic term **passant** so the assistant knows you need incidental care under the NZa walk-in rate.

2. **Dosage & Follow-Up Question**
- *Say to doctor*: "Mijn vitamine D is 22 nmol/L. Heeft een wekelijkse stootkuur (bijv. cholecalciferol drank of capsules) de voorkeur boven een dagelijkse drogisterijdosering?"
- *Purpose*: Asks if a high-dose loading prescription is needed or standard daily pharmacy drops (d3).

### 5. Healthcare Access, Insurance & Costs (NZa & Student Insurance)
- **Consultation Cost (NZa Passantentarief)**: Under Dutch Healthcare Authority regulations (NZa 2025), a standard walk-in GP consultation (< 20 min) for an unregistered patient costs approximately **€31.86** (or ~€15.93 for < 5 min). You pay by pin at the practice counter.
- **Insurance Reimbursement**:
  - **EU Students (EHIC)**: Keep the pin receipt and GP invoice; submit it to your home country EHIC insurer or Zilveren Kruis buitenland.
  - **Non-EU Students (AON / Swisscare)**: AON Student Insurance covers medically necessary GP consults; upload the invoice PDF to your AON portal for reimbursement.
  - **Basisverzekering (Working Students)**: 100% covered with €0 eigen risico for GP visits.
- **Self-Care & Thuisarts.nl**: You can also purchase Vitamin D3 drops (10–20 ug / 400–800 IU) directly at Dutch pharmacies or drugstores (Kruidvat, Etos) for €3–€5 without a prescription. Search "vitamine D" on Thuisarts.nl.

### 6. Clinical Triage & Safety Guidance
- Routine Care: Book a passantenconsult within 1–2 weeks, or pick up over-the-counter Vitamin D3.
- Urgent Daytime Concerns: Contact a GP practice if experiencing bone pain, severe muscle twitching, or tingling sensations.
- Evenings & Weekends (Huisartsenpost / HAP): Contact HAP only for acute, severe symptoms outside office hours.
- Immediate Emergency (112): Call 112 immediately for sudden chest pain or fainting.""",

    "2": """### 1. Plain-English Health Picture & Student Context
> **Overview**: Your blood test shows a critically dangerous level of potassium (kalium 6.9 mmol/L) and acute kidney stress, requiring immediate emergency medical evaluation today.

Potassium acts as the delicate electrical current regulating heart muscle contractions. With potassium at 6.9 mmol/L, the electrical current is overflowing dangerously, carrying immediate risk of heart rhythm disorders. Furthermore, your kidneys are under acute strain (eGFR 38 mL/min, creatinine 165 umol/L), meaning your body cannot filter excess potassium out safely. Immediate emergency hospital care is required.

### 2. At-a-Glance Lab Scorecard
| Biomarker | Your Value | Target Range | Status | Clinical Summary |
| --- | --- | --- | --- | --- |
| Potassium (Kalium) | 6.9 mmol/L | 3.5 - 5.0 | [CRITICAL] | Dangerously high; acute risk of cardiac arrhythmias |
| Creatinine | 165 umol/L | 60 - 110 | [ATTENTION] | Significant elevation indicates acute kidney stress |
| eGFR (filtration rate) | 38 mL/min | > 60 | [CRITICAL] | Substantially reduced kidney filtration |
| Glucose (blood sugar) | 6.4 mmol/L | 4.0 - 7.8 | [NORMAL] | Blood sugar is within non-emergency limits |
| Sodium (Natrium) | 138 mmol/L | 135 - 145 | [NORMAL] | Water balance electrolyte is stable |
| Chloride | 102 mmol/L | 96 - 106 | [NORMAL] | Acid-base electrolyte is within range |

### 3. Visual Spectrum Range Gauges
Potassium (Kalium): [ 3.5 === Target === 5.0 ] -----------------* (6.9) [CRITICAL]
Creatinine: [ 60 === Target === 110 ] --------* (165) [ATTENTION]
eGFR: * (38) <-------- [ 60 === Target === 120 ] [CRITICAL]

### 4. Doctor Phone Script (Getting Past the Doktersassistente Gatekeeper)
1. **Immediate Emergency STAT Notice**
- *Say in Dutch*: "Spoed! Mijn kaliumwaarde is 6,9 mmol/L en eGFR is 38. Ik heb met spoed een herhaaltest en een ECG nodig bij de spoedeisende hulp."
- *Say in English*: "Emergency! My potassium is 6.9 mmol/L and eGFR is 38. I need an urgent repeat test and ECG at the emergency department."
- *Purpose*: Bypasses standard waiting lists and alerts medical triage immediately.

### 5. Healthcare Access, Insurance & Costs (NZa & Student Insurance)
- **Do Not Worry About Costs Right Now**: Under Dutch law, acute emergency stabilization is mandatory regardless of insurance registration status. EHIC, AON, and basic insurance cover emergency hospitalization.
- **Where to Go**: Go to the nearest Hospital Emergency Department (Spoedeisende Hulp / SEH) or call the regional Huisartsenpost (HAP) emergency line.

### 6. Clinical Triage & Safety Guidance
- Immediate Action: Call 112 or have someone accompany you to the nearest Emergency Room (SEH) immediately.""",

    "3": """### 1. Plain-English Health Picture & Student Context
> **Overview**: Your blood test confirms iron deficiency anemia with low hemoglobin (5.8 mmol/L) and severely depleted iron stores (ferritin 7 ug/L), explaining your chronic fatigue and breathlessness on campus.

In your bloodstream, red blood cells and hemoglobin act as transport barges that carry oxygen to your brain and muscles. Iron (ferritin) is the essential construction material used to build these oxygen-carrying barges.

With ferritin at 7 ug/L and hemoglobin at 5.8 mmol/L, your body has run out of iron reserves. As a result, fewer red cells are produced, and they are smaller than normal (low MCV 71 fl). Your muscles and brain are receiving less oxygen, leading to persistent fatigue and dizziness when climbing university stairs. White blood cells (6.4) and platelets (280) are normal, meaning your immune and clotting systems are healthy.

### 2. At-a-Glance Lab Scorecard
| Biomarker | Your Value | Target Range | Status | Clinical Summary |
| --- | --- | --- | --- | --- |
| Hemoglobin (Hb) | 5.8 mmol/L | 7.5 - 10.0 | [ATTENTION] | Below target for women; indicates iron deficiency anemia |
| Ferritin (iron stores) | 7 ug/L | 15 - 150 | [ATTENTION] | Depleted iron reserves; indicates need for oral iron |
| Hematocrit (Ht) | 0.29 l/l | 0.36 - 0.46 | [ATTENTION] | Low red blood cell proportion |
| MCV (cell volume) | 71 fl | 80 - 100 | [ATTENTION] | Microcytic red blood cells typical of iron deficiency |
| Erythrocytes (RBC) | 3.5 x10^12/L | 3.8 - 5.2 | [ATTENTION] | Total red blood cell count is slightly depressed |
| BSE (Bezinking / ESR) | 24 mm/h | < 20 | [MILD_SHIFT] | Mild inflammatory response |
| Leukocytes (WBC) | 6.4 x10^9/L | 4.0 - 10.0 | [NORMAL] | Immune cell count is normal |
| Platelets (Trombocyten) | 280 x10^9/L | 150 - 400 | [NORMAL] | Clotting platelets are completely healthy |

### 3. Visual Spectrum Range Gauges
Hemoglobin (Hb): * (5.8) <--- [ 7.5 === Target === 10.0 ] [ATTENTION]
Ferritin: * (7) <---- [ 15 === Target === 150 ] [ATTENTION]
MCV: * (71) <--- [ 80 === Target === 100 ] [ATTENTION]

### 4. Doctor Phone Script (Getting Past the Doktersassistente Gatekeeper)
1. **Booking as a Passant for Iron Prescription**
- *Say in Dutch*: "Goedemiddag, ik ben een internationale student zonder vaste huisarts. Uit mijn bloedonderzoek blijkt bloedarmoede met een ferritine van 7 ug/L en Hb 5,8. Kan ik op het spreekuur komen als passant voor een recept ferrofumaraat?"
- *Say in English*: "Good afternoon, I am an international student without a registered GP. My blood test shows anemia with ferritin 7 ug/L and Hb 5.8. Can I book a passantenconsult for a prescription of iron tablets?"
- *Purpose*: Communicates exact clinical numbers so the assistant grants a quick appointment.

2. **Investigating Underlying Cause**
- *Say to doctor*: "Is deze bloedarmoede gerelateerd aan een tekort in mijn voeding of moeten we kijken naar hevig bloedverlies bij mijn menstruatie?"
- *Purpose*: Identifies the root cause of iron depletion.

### 5. Healthcare Access, Insurance & Costs (NZa & Student Insurance)
- **Passanten Tariff**: Regulated standard consult (< 20 min) costs ~€31.86 under NZa 2025 guidelines. Pay at the clinic desk and retain the invoice.
- **Prescription Iron (Ferrofumaraat)**: Costs ~€10–€15 at the Dutch apotheek; covered by AON / EHIC upon claim submission.
- **Absorption Tips**: Take iron tablets with Vitamin C (orange juice) on an empty stomach. Avoid tea, coffee, or milk for 1 hour before and after.

### 6. Clinical Triage & Safety Guidance
- Routine Care: Schedule a passantenconsult within 3 to 7 days for prescription iron.
- Urgent Daytime Concerns: Contact a GP practice if experiencing sudden dizziness when standing up or palpitations.
- Immediate Emergency (112): Call 112 for fainting episodes (syncope) or chest tightness.""",

    "4": """### 1. Plain-English Health Picture & Student Context
> **Overview**: Your blood test shows elevated liver enzymes (ALAT 84 U/L, ASAT 68 U/L) and inflammatory markers (BSE 28 mm/h, Leukocytes 12.4), characteristic of a reactive viral infection like Mononucleosis (Pfeiffer / Glandular Fever).

Infectious Mononucleosis (known in the Netherlands as the *ziekte van Pfeiffer*, caused by the Epstein-Barr virus) is extremely prevalent among university students following intensive social periods like orientation weeks.

The Epstein-Barr virus temporarily activates your liver's metabolic filters, causing enzymes like ALAT and ASAT to leak mildly into your bloodstream. This is a common and self-limiting viral reaction, not permanent liver damage. Your bilirubin (14 umol/L) and clotting platelets (210) remain normal, showing your liver is still performing its core filtering and synthesis jobs. Recovery requires adequate rest, hydration, and avoiding alcohol and heavy contact sports while your spleen and liver recover.

### 2. At-a-Glance Lab Scorecard
| Biomarker | Your Value | Target Range | Status | Clinical Summary |
| --- | --- | --- | --- | --- |
| ALAT (GPT - liver enzyme) | 84 U/L | < 45 | [ATTENTION] | Mild liver inflammation characteristic of Pfeiffer / mono |
| ASAT (GOT - liver enzyme) | 68 U/L | < 35 | [ATTENTION] | Accompanies ALAT elevation during viral immune response |
| Leukocytes (WBC) | 12.4 x10^9/L | 4.0 - 10.0 | [ATTENTION] | Elevated immune white cells fighting viral infection |
| BSE (Bezinking / ESR) | 28 mm/h | < 15 | [ATTENTION] | Elevated inflammatory marker |
| CRP (C-reactive protein) | 18 mg/L | < 5 | [MILD_SHIFT] | Mild inflammatory elevation |
| Bilirubin | 14 umol/L | < 17 | [NORMAL] | Bilirubin clearance is completely healthy; no jaundice |
| Platelets (Trombocyten) | 210 x10^9/L | 150 - 400 | [NORMAL] | Blood clotting cells are in safe range |

### 3. Visual Spectrum Range Gauges
ALAT: [ 0 === Target === 45 ] --------* (84) [ATTENTION]
ASAT: [ 0 === Target === 35 ] ------* (68) [ATTENTION]
Leukocytes: [ 4.0 === Target === 10.0 ] --* (12.4) [ATTENTION]

### 4. Doctor Phone Script (Getting Past the Doktersassistente Gatekeeper)
1. **Passantenconsult for Pfeiffer Assessment**
- *Say in Dutch*: "Goedemorgen, ik ben een student zonder vaste huisarts. Ik heb aanhoudende keelpijn, opgezette klieren en verhoogde leverwaarden (ALAT 84). Kan ik als passant worden gezien om de ziekte van Pfeiffer te beoordelen?"
- *Say in English*: "Good morning, I am a student without a registered GP. I have persistent sore throat, swollen glands, and elevated liver enzymes (ALAT 84). Can I be seen as a passant to assess for mono / Pfeiffer?"
- *Purpose*: Fast-tracks a physical examination to palpate the spleen and throat.

2. **Activity & Alcohol Restriction Guidance**
- *Say to doctor*: "Mijn leverwaarden zijn verhoogd. Hoe lang moet ik alcohol vermijden en mag ik sporten met het oog op een eventueel vergrote milt?"
- *Purpose*: Checks spleen enlargement to prevent splenic injury in sports.

### 5. Healthcare Access, Insurance & Costs (NZa & Student Insurance)
- **Consultation Tariff**: Standard NZa passanten fee (~€31.86).
- **Treatment Reality**: Pfeiffer is viral; antibiotics (like amoxicillin) are ineffective and can cause severe skin rashes. Rest and paracetamol are the standard Dutch medical recommendation.
- **Thuisarts.nl Guidance**: Search "ziekte van Pfeiffer" on Thuisarts.nl for the Dutch College of General Practitioners (NHG) self-care protocol.

### 6. Clinical Triage & Safety Guidance
- Routine Care: Book a passantenconsult within 2–5 days for a physical check-up.
- Urgent Daytime Concerns: Contact GP if experiencing severe difficulty swallowing saliva or drinking fluids.
- Immediate Emergency (112): Call 112 immediately for sudden severe upper-left abdominal pain (risk of spleen injury) or breathing obstruction."""
}
