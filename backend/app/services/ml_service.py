from __future__ import annotations
from pathlib import Path
import pandas as pd
import numpy as np
import joblib

from ..core.config import settings

class ExpenseCategorizer:
    def __init__(self):
        self.baseline_path = settings.ARTIFACTS_DIR / "baseline.joblib"
        self.labels_path = settings.ARTIFACTS_DIR / "labels.joblib"
        self.dl_dir = settings.ARTIFACTS_DIR / "dl_model"

        self._baseline = None
        self._labels = None
        self._tokenizer = None
        self._dl_model = None

    def load_baseline(self):
        if self._baseline is None:
            if self.baseline_path.exists() and self.labels_path.exists():
                self._baseline = joblib.load(self.baseline_path)
                self._labels = joblib.load(self.labels_path)
        return self._baseline

    def load_dl(self):
        if self._dl_model is None:
            if self.dl_dir.exists():
                from transformers import AutoTokenizer, AutoModelForSequenceClassification

                self._tokenizer = AutoTokenizer.from_pretrained(str(self.dl_dir))
                self._dl_model = AutoModelForSequenceClassification.from_pretrained(str(self.dl_dir))
                self._dl_model.eval()
        return self._dl_model

    def predict(self, text: str, amount: float | None = None):
        # prefer DL if available
        if self.load_dl() is not None and self._tokenizer is not None:
            import torch

            inputs = self._tokenizer(text, truncation=True, padding=True, return_tensors="pt")
            with torch.no_grad():
                logits = self._dl_model(**inputs).logits
                probs = torch.softmax(logits, dim=-1).cpu().numpy()[0]
            idx = int(np.argmax(probs))
            label = self._dl_model.config.id2label.get(idx, str(idx))
            conf = float(probs[idx])
            top = np.argsort(-probs)[:5]
            candidates = [{"category": self._dl_model.config.id2label.get(int(i), str(i)), "score": float(probs[int(i)])} for i in top]
            return label, conf, "dl", candidates

        # fallback baseline
        if self.load_baseline() is None or self._labels is None:
            # last-resort: heuristic
            return "Lainnya", 0.2, "heuristic", [{"category":"Lainnya","score":0.2}]
        proba = self._baseline.predict_proba([text])[0]
        idx = int(np.argmax(proba))
        label = self._labels[idx]
        conf = float(proba[idx])
        top = np.argsort(-proba)[:5]
        candidates = [{"category": self._labels[int(i)], "score": float(proba[int(i)])} for i in top]
        return label, conf, "baseline", candidates

categorizer = ExpenseCategorizer()

def append_feedback(text: str, amount: float, category: str):
    settings.ML_DIR.mkdir(parents=True, exist_ok=True)
    settings.TRAIN_CSV.parent.mkdir(parents=True, exist_ok=True)
    row = {"text": text, "amount": amount, "category": category}
    if settings.TRAIN_CSV.exists():
        df = pd.read_csv(settings.TRAIN_CSV)
        df = pd.concat([df, pd.DataFrame([row])], ignore_index=True)
    else:
        df = pd.DataFrame([row])
    df.to_csv(settings.TRAIN_CSV, index=False)
