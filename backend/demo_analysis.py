from __future__ import annotations

import re
from typing import Any, Dict, Optional, Tuple

RULES = [
    {"issue_key": "duplicate-checkout-charge", "category": "Payments", "keywords": ["charged twice", "duplicate charge", "paid again"], "severity": "high"},
    {"issue_key": "wallet-payment-failure", "category": "Payments", "keywords": ["apple pay", "google pay", "wallet"], "severity": "high"},
    {"issue_key": "upi-pending-hang", "category": "Payments", "keywords": ["upi"], "severity": "high"},
    {"issue_key": "card-authorization-failure", "category": "Payments", "keywords": ["card", "visa", "debit", "payment failed", "payment unsuccessful"], "severity": "high"},
    {"issue_key": "slow-refund", "category": "Payments", "keywords": ["refund"], "severity": "high"},
    {"issue_key": "promo-code-mismatch", "category": "Payments", "keywords": ["promo", "discount code", "coupon"], "severity": "medium"},
    {"issue_key": "late-delivery", "category": "Delivery", "keywords": ["late", "delayed", "still waiting", "arrived on day"], "severity": "high"},
    {"issue_key": "false-delivered", "category": "Delivery", "keywords": ["marked delivered", "missing"], "severity": "high"},
    {"issue_key": "wrong-item-shipped", "category": "Delivery", "keywords": ["wrong size", "wrong item"], "severity": "high"},
    {"issue_key": "poor-package-handling", "category": "Delivery", "keywords": ["damaged", "soaked", "rain"], "severity": "high"},
    {"issue_key": "fabric-quality", "category": "Product quality", "keywords": ["pilled", "fabric", "cheap"], "severity": "medium"},
    {"issue_key": "zipper-failure", "category": "Product quality", "keywords": ["zipper"], "severity": "high"},
    {"issue_key": "doa-accessory", "category": "Product quality", "keywords": ["dead on arrival", "charger"], "severity": "high"},
    {"issue_key": "slow-support-response", "category": "Customer service", "keywords": ["waited", "chat", "no one", "closed the chat"], "severity": "medium"},
    {"issue_key": "missed-follow-up", "category": "Customer service", "keywords": ["called back", "follow"], "severity": "high"},
    {"issue_key": "checkout-freeze", "category": "App performance", "keywords": ["freezes", "freeze", "spinner"], "severity": "high"},
    {"issue_key": "coupon-crash-android", "category": "App performance", "keywords": ["crash", "android"], "severity": "high"},
    {"issue_key": "stale-search-results", "category": "App performance", "keywords": ["search", "slow"], "severity": "medium"},
]

POSITIVE = ["love", "excellent", "happy", "smooth", "comfortable", "instant", "sorted", "premium", "great", "fast", "polite", "good", "helpful"]
NEGATIVE = ["fail", "failed", "late", "crash", "missing", "damaged", "slow", "never", "unusable", "angry", "worst", "bug", "broken", "freeze", "freezes", "timeout", "timed out", "stuck", "error", "problem"]


def analyze_text_rules(text: str, rating: Optional[float] = None) -> Dict[str, Any]:
    lower = text.lower()
    pos = sum(1 for w in POSITIVE if w in lower)
    neg = sum(1 for w in NEGATIVE if w in lower)

    matched_rule = None
    matched_keyword = None
    for rule in RULES:
        for kw in rule["keywords"]:
            if kw in lower:
                matched_rule = rule
                matched_keyword = kw
                break
        if matched_rule:
            break

    # If payments or checkout mentioned with negative indicators
    if not matched_rule and ("payment" in lower or "checkout" in lower or "gateway" in lower):
        matched_rule = {"issue_key": "payment-gateway-issue", "category": "Payments", "severity": "high"}
        matched_keyword = "payment/checkout issue"

    if rating is not None and rating <= 2.0:
        sentiment = "negative"
    elif rating is not None and rating >= 4.0:
        sentiment = "positive"
    elif neg > pos or (matched_rule and any(w in lower for w in ["fail", "late", "crash", "missing", "damaged", "timeout", "timed out", "error"])):
        sentiment = "negative"
    elif pos > neg:
        sentiment = "positive"
    else:
        sentiment = "neutral"

    if matched_rule:
        category = matched_rule["category"]
        issue_key = matched_rule["issue_key"]
        severity = matched_rule["severity"]
        confidence = 0.82
        analysis_reason = f"Demo rules matched “{matched_keyword}” in customer feedback."
        suggested_action = f"Investigate {issue_key.replace('-', ' ')} using this feedback as evidence."
    else:
        category = "Other"
        issue_key = f"{category.lower()}-general"
        severity = "medium" if sentiment == "negative" else "low"
        confidence = 0.65
        analysis_reason = "Demo rules classified based on general sentiment indicators."
        suggested_action = "Review submission and assign a domain owner."

    return {
        "sentiment": sentiment,
        "category": category,
        "issue_key": issue_key,
        "severity": severity,
        "confidence": confidence,
        "analysis_reason": analysis_reason,
        "suggested_action": suggested_action,
        "analysis_mode": "demo-rules",
    }
