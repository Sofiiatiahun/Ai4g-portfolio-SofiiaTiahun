"""
Models module for running sentiment analysis on Dutch rail posts.
Primary Model: DTAI-KULeuven/robbert-v2-dutch-sentiment (RoBERTa pre-trained on Dutch)
Secondary Model: cardiffnlp/twitter-roberta-base-sentiment-latest
Baseline: Rule-based Dutch rail lexicon baseline
"""

import os
import re
from typing import Dict, Any, Tuple
from transformers import pipeline

_primary_analyzer = None
_secondary_analyzer = None

ROBBERT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models", "robbert")

# Lexicon baseline for comparison & quick checks
DUTCH_POSITIVE_WORDS = {
    "goed", "fijn", "top", "snel", "bedankt", "prima", "held", "blij", "hulde", "mooi",
    "stipt", "netjes", "compliment", "gelukkig", "handig", "opgelost", "verbetering",
    "good", "great", "nice", "fast", "thanks", "helpful", "perfect", "vriendelijk"
}

DUTCH_NEGATIVE_WORDS = {
    "vertraging", "storing", "uitval", "defect", "kapot", "chaos", "boos", "kut", "klote",
    "wachten", "overvol", "geannuleerd", "drama", "slechter", "duurder", "onacceptabel",
    "schande", "balen", "vreselijk", "hopeloos", "vertragingen", "kou", "vervelend", "ramp",
    "delay", "cancelled", "broken", "late", "horrible", "terrible", "worst", "fail", "storingen"
}

def get_primary_analyzer():
    global _primary_analyzer
    if _primary_analyzer is None:
        model_path = ROBBERT_DIR if os.path.exists(os.path.join(ROBBERT_DIR, "pytorch_model.bin")) else "DTAI-KULeuven/robbert-v2-dutch-sentiment"
        _primary_analyzer = pipeline(
            "sentiment-analysis",
            model=model_path,
            top_k=None,
            truncation=True,
            max_length=512
        )
    return _primary_analyzer

def get_secondary_analyzer():
    global _secondary_analyzer
    if _secondary_analyzer is None:
        _secondary_analyzer = pipeline(
            "sentiment-analysis",
            model="cardiffnlp/twitter-roberta-base-sentiment-latest",
            top_k=None,
            truncation=True,
            max_length=512
        )
    return _secondary_analyzer

def run_lexicon_baseline(text: str) -> Tuple[str, float]:
    """Domain lexicon matching baseline."""
    tokens = set(re.findall(r'\b\w+\b', text.lower()))
    pos_hits = len(tokens & DUTCH_POSITIVE_WORDS)
    neg_hits = len(tokens & DUTCH_NEGATIVE_WORDS)
    
    if neg_hits > pos_hits:
        score = min(0.55 + 0.15 * (neg_hits - pos_hits), 0.98)
        return "negative", round(score, 3)
    elif pos_hits > neg_hits:
        score = min(0.55 + 0.15 * (pos_hits - neg_hits), 0.98)
        return "positive", round(score, 3)
    else:
        return "neutral", 0.500

def analyze_sentiment(text: str, run_secondary: bool = True) -> Dict[str, Any]:
    """
    Analyzes sentiment of text with RobBERT (Dutch Transformer) as primary
    and Cardiff Twitter RoBERTa as secondary.
    Standardized labels: 'positive', 'neutral', 'negative'.
    """
    clean = text.strip()
    if not clean:
        return {
            "primary_sentiment": "neutral",
            "primary_score": 0.5,
            "secondary_sentiment": "neutral",
            "secondary_score": 0.5
        }
    
    # 1. Primary Model: RobBERT Dutch sentiment
    primary = get_primary_analyzer()
    p_preds = primary(clean)[0]
    p_best = max(p_preds, key=lambda x: x["score"])
    p_raw_label = p_best["label"].lower()
    
    if "pos" in p_raw_label:
        norm_p = "positive"
    elif "neg" in p_raw_label:
        norm_p = "negative"
    else:
        norm_p = "neutral"
    p_score = round(float(p_best["score"]), 3)
    
    # 2. Secondary Model or Baseline
    sec_label, sec_score = run_lexicon_baseline(clean)
    if run_secondary:
        try:
            sec_pipe = get_secondary_analyzer()
            s_preds = sec_pipe(clean)[0]
            s_best = max(s_preds, key=lambda x: x["score"])
            s_raw = s_best["label"].lower()
            if "pos" in s_raw:
                sec_label = "positive"
            elif "neg" in s_raw:
                sec_label = "negative"
            else:
                sec_label = "neutral"
            sec_score = round(float(s_best["score"]), 3)
        except Exception:
            pass
            
    return {
        "primary_sentiment": norm_p,
        "primary_score": p_score,
        "secondary_sentiment": sec_label,
        "secondary_score": sec_score
    }
