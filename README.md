# CardioAI — Cardiovascular Health Claim Checker

A full-stack AI web application that classifies cardiovascular health claims
as **True**, **False**, or **Uncertain** using a fine-tuned **BioBERT** model.

---

## Project Structure

```
cardio_ai/
├── app.py                    ← Flask backend (main entry point)
├── requirements.txt          ← Python dependencies
├── README.md
│
├── templates/
│   ├── index.html            ← Page 1: Home (input + result)
│   ├── model.html            ← Page 2: Model & Workflow
│   └── about.html            ← Page 3: About the project
│
├── static/
│   ├── css/
│   │   └── main.css          ← Full stylesheet (blue/teal medical theme)
│   └── js/
│       └── main.js           ← Frontend JS (voice, API calls, UI)
│
├── model/
│   ├── train.py              ← BioBERT fine-tuning script
│   ├── predict.py            ← Inference module (imported by app.py)
│   ├── __init__.py
│   └── saved/
│       └── best_model/       ← Created after training (tokenizer + weights)
│
└── data/
    └── cardio_claims.csv     ← Sample dataset (expand for better accuracy)
```

---

## Quick Start

### 1. Clone / Download the project

```bash
cd cardio_ai
```

### 2. Create a virtual environment

```bash
python -m venv venv
source venv/bin/activate        # macOS / Linux
# OR
venv\Scripts\activate           # Windows
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Run without training (demo mode)

The app ships with a **rule-based fallback** so you can see the UI immediately
without training the model:

```bash
python app.py
```

Open http://localhost:5000 in your browser.

---

## Training the BioBERT Model

### Option A — Use the provided sample dataset

```bash
python model/train.py \
    --data data/cardio_claims.csv \
    --epochs 5 \
    --batch-size 16 \
    --output-dir model/saved
```

### Option B — Use your own dataset

Your CSV needs exactly two columns:

| text | label |
|------|-------|
| Regular aerobic exercise reduces heart disease risk. | true |
| Coffee causes heart attacks. | false |
| Low-dose aspirin may help prevent strokes. | uncertain |

Then run:

```bash
python model/train.py --data path/to/your_dataset.csv
```

### Training arguments

| Argument      | Default                  | Description            |
|---------------|--------------------------|------------------------|
| `--data`      | `data/cardio_claims.csv` | Path to CSV dataset    |
| `--output-dir`| `model/saved`            | Save directory         |
| `--epochs`    | `5`                      | Training epochs        |
| `--batch-size`| `16`                     | Batch size             |
| `--lr`        | `2e-5`                   | Learning rate          |

---

## Running with the Trained Model

After training completes, the model is automatically saved to
`model/saved/best_model/`. Restart Flask and it will load BioBERT automatically:

```bash
python app.py
```

The server will log:
```
[CardioAI] Loading BioBERT model from model/saved/best_model on cpu...
[CardioAI] Model loaded successfully.
```

---

## API Endpoints

### `POST /api/predict`

Classify a cardiovascular health claim.

**Request:**
```json
{
  "text": "Regular aerobic exercise reduces heart disease risk."
}
```

**Response:**
```json
{
  "label": "True",
  "confidence": 0.9312,
  "explanation": "This claim is broadly supported by cardiovascular research...",
  "input": "Regular aerobic exercise reduces heart disease risk.",
  "timestamp": "2024-01-15T10:23:45Z"
}
```

**Labels:** `True` | `False` | `Uncertain`

### `GET /api/health`

Returns service health status.

---

## Voice Input

The app uses the **Web Speech API** built into Chrome and Edge.

1. Click the **Voice Input** button (microphone icon)
2. Speak your cardiovascular health claim
3. The transcript appears in the text box automatically
4. Click **Analyze Claim** or press Enter

> Note: Voice input requires microphone permissions and a supported browser
> (Chrome, Edge, or Safari 15+).

---

## Extending the Dataset

To improve model accuracy, add more labeled rows to `data/cardio_claims.csv`.
Recommended sources:
- PubMed abstracts on cardiovascular medicine
- AHA / ACC / ESC clinical guidelines
- Health misinformation databases (e.g., Health Feedback)
- Manually curated cardiology Q&A datasets

Target: **5,000–20,000** rows for production-grade accuracy.

---

## Customization

### Change the model

Edit `MODEL_NAME` in `model/train.py` and `model/predict.py`:

```python
MODEL_NAME = "dmis-lab/biobert-base-cased-v1.2"    # default
MODEL_NAME = "microsoft/BiomedNLP-PubMedBERT-base-uncased-abstract-fulltext"  # alternative
```

### Add new labels

1. Update `LABEL2ID` in both `train.py` and `predict.py`
2. Add new label columns to your CSV
3. Re-train the model

### Deploy to production

```bash
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

---

## Tech Stack

| Layer    | Technology                            |
|----------|---------------------------------------|
| Frontend | HTML5, CSS3, JavaScript, Font Awesome |
| Voice    | Web Speech API                        |
| Backend  | Python 3.10+ / Flask 3.x              |
| NLP      | BioBERT (HuggingFace Transformers)    |
| ML       | PyTorch 2.x                           |
| Data     | Pandas, Scikit-learn                  |

---

## Disclaimer

> **CardioAI is for educational and research purposes only.**
> It is not a substitute for professional medical advice, diagnosis, or treatment.
> Always consult a qualified cardiologist or healthcare provider for medical decisions.

---

© 2024 CardioAI Project
