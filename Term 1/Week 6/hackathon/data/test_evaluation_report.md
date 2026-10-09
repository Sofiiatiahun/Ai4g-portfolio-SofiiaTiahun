# Model Evaluation & Benchmark Report

- **Golden Test Set Size**: 52 manually verified items
- **Primary Model (DTAI-KULeuven/robbert-v2-dutch-sentiment)**: **59.6% Accuracy**
- **Secondary Model (cardiffnlp/twitter-roberta-base-sentiment-latest)**: **34.6% Accuracy**
- **Baseline (Rule-based Dutch Lexicon)**: **48.1% Accuracy**

## Detailed Disagreement & Failure Analysis

### Failure Mode 1: Resolution & Negation in Operational Alerts ('Storing voorbij')
- **Example**: `Storing voorbij: defecte trein Utrecht - Amersfoort`
- **Human Label**: `neutral` (operational restoration of service)
- **Model Output**: `negative` (0.994)
- **Why it failed**: The token 'defecte trein' heavily outweighs 'voorbij' in RoBERTa embedding space, triggering strong negative classification even when the incident has resolved.

### Failure Mode 2: Official Outage Format Lacking Subjective Adjectives
- **Example**: `STORING: overwegstoring 's-Hertogenbosch - Oss #storing #ns`
- **Human Label**: `negative` (passenger disruption)
- **Model Output**: `positive` (0.992 in raw RoBBERT without fine-tuning)
- **Why it failed**: Factual infrastructure status announcements lack emotional modifiers (e.g., 'vreselijk', 'boos'). Pre-trained models trained on general reviews misattribute the formal tone as positive/neutral unless fine-tuned.

### Failure Mode 3: Sarcasm, Irony & Dutch Rail Slang
- **Example**: `morgen de hele dag geen openbaar vervoer 😟 Ze gaan staken, ik snap de woede maar reizigers zijn de dupe`
- **Human Label**: `negative`
- **Secondary Model Output**: `neutral` (0.64)
- **Why it failed**: Multilingual Twitter RoBERTa dilutes Dutch nuance and emojis when mixed with empathetic phrases ('ik snap de woede').

