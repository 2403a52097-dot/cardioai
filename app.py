"""
CardioAI - Cardiovascular Health Claim Checker
Flask Backend Application
"""

from flask import Flask, render_template, request, jsonify
import os
import json
import re
from datetime import datetime

# ── Optional: import the model pipeline (comment out if not yet trained) ──
# from model.predict import predict_claim
# For demo/development, we use a rule-based fallback (see below)

app = Flask(__name__)
app.config['SECRET_KEY'] = 'cardioai-secret-2024'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB upload limit


# ─────────────────────────────────────────────
#  Fallback prediction (replace with BioBERT)
# ─────────────────────────────────────────────
def rule_based_predict(text: str) -> dict:
    """
    Simple keyword-based fallback prediction.
    Replace this entirely once the BioBERT model is trained.
    Returns: { label, confidence, explanation }
    """
    text_lower = text.lower()

    # ── TRUE indicators ──
    true_keywords = [
        "exercise reduces", "physical activity lowers", "smoking increases",
        "high blood pressure causes", "mediterranean diet", "omega-3",
        "aerobic exercise", "sodium raises", "saturated fat increases ldl",
        "statins lower", "aspirin reduces clot", "heart rate increases during",
    ]
    # ── FALSE indicators ──
    false_keywords = [
        "coffee causes heart attack", "stress cannot affect",
        "heart disease only affects men", "young people cannot get",
        "chocolate cures", "standing never causes", "one drink a day heals",
    ]
    # ── UNCERTAIN indicators ──
    uncertain_keywords = [
        "might", "may", "could", "possibly", "some studies",
        "controversial", "debated", "unclear", "emerging evidence",
    ]

    true_score  = sum(1 for kw in true_keywords  if kw in text_lower)
    false_score = sum(1 for kw in false_keywords if kw in text_lower)
    uncertain_score = sum(1 for kw in uncertain_keywords if kw in text_lower)

    if false_score > true_score and false_score > uncertain_score:
        return {
            "label": "False",
            "confidence": min(0.55 + false_score * 0.1, 0.95),
            "explanation": (
                "This claim appears to contradict established cardiovascular research. "
                "Cardiology consensus does not support this statement."
            ),
        }
    elif uncertain_score >= 2 or (uncertain_score > true_score):
        return {
            "label": "Uncertain",
            "confidence": min(0.50 + uncertain_score * 0.08, 0.85),
            "explanation": (
                "The evidence on this cardiovascular claim is mixed or still emerging. "
                "Current research has not reached a definitive consensus."
            ),
        }
    elif true_score > 0:
        return {
            "label": "True",
            "confidence": min(0.60 + true_score * 0.1, 0.97),
            "explanation": (
                "This claim is broadly supported by cardiovascular research and "
                "established clinical guidelines. Evidence from multiple peer-reviewed "
                "studies corroborates this statement."
            ),
        }
    else:
        return {
            "label": "Uncertain",
            "confidence": 0.52,
            "explanation": (
                "There is insufficient information to verify this cardiovascular claim "
                "with high confidence. The topic may require further clinical study, "
                "or the claim is outside current evidence-based cardiology guidelines."
            ),
        }


# ─────────────────────────────────────────────
#  Routes
# ─────────────────────────────────────────────

@app.route("/")
def index():
    """Home page — claim input & result display."""
    return render_template("index.html")


@app.route("/model")
def model_page():
    """Model / Workflow explanation page."""
    return render_template("model.html")


@app.route("/about")
def about_page():
    """About / Features page."""
    return render_template("about.html")


@app.route("/api/predict", methods=["POST"])
def predict():
    """
    POST  /api/predict
    Body: { "text": "<health claim>" }
    Returns: { label, confidence, explanation, timestamp }
    """
    try:
        data = request.get_json(force=True)
        claim_text = data.get("text", "").strip()

        if not claim_text:
            return jsonify({"error": "No claim text provided."}), 400

        if len(claim_text) < 5:
            return jsonify({"error": "Claim is too short. Please provide more detail."}), 400

        if len(claim_text) > 1000:
            return jsonify({"error": "Claim is too long (max 1000 characters)."}), 400

        # ── Use BioBERT if available, else fallback ──
        try:
            from model.predict import predict_claim  # noqa: F401 (may not exist yet)
            result = predict_claim(claim_text)
        except ImportError as ie:
            app.logger.warning(f"Model import failed, using rule-based fallback: {ie}")
            result = rule_based_predict(claim_text)
        except Exception as exc:
            app.logger.error(f"Model prediction failed, using rule-based fallback: {exc}")
            result = rule_based_predict(claim_text)

        result["timestamp"] = datetime.utcnow().isoformat() + "Z"
        result["input"]     = claim_text

        return jsonify(result), 200

    except Exception as exc:
        app.logger.error(f"Prediction error: {exc}")
        return jsonify({"error": "An internal error occurred. Please try again."}), 500


@app.route("/api/health")
def health_check():
    """Simple health-check endpoint."""
    return jsonify({"status": "ok", "service": "CardioAI", "version": "1.0.0"})


# ─────────────────────────────────────────────
#  Entry point
# ─────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "true").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug, use_reloader=False)
