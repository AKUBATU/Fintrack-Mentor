import argparse
from pathlib import Path
import pandas as pd
import numpy as np
import torch
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score
from transformers import (
    AutoTokenizer, AutoModelForSequenceClassification,
    TrainingArguments, Trainer
)

def compute_metrics(eval_pred):
    logits, labels = eval_pred
    preds = np.argmax(logits, axis=-1)
    return {
        "accuracy": accuracy_score(labels, preds),
        "f1_macro": f1_score(labels, preds, average="macro"),
    }

class Ds(torch.utils.data.Dataset):
    def __init__(self, enc, labels):
        self.enc = enc
        self.labels = labels
    def __len__(self):
        return len(self.labels)
    def __getitem__(self, idx):
        item = {k: torch.tensor(v[idx]) for k,v in self.enc.items()}
        item["labels"] = torch.tensor(self.labels[idx])
        return item

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default=str(Path(__file__).resolve().parent / "data" / "train.csv"))
    ap.add_argument("--model", default="distilbert-base-multilingual-cased")
    ap.add_argument("--outdir", default=str(Path(__file__).resolve().parent / "artifacts" / "dl_model"))
    ap.add_argument("--epochs", type=int, default=2)
    ap.add_argument("--batch", type=int, default=8)
    args = ap.parse_args()

    df = pd.read_csv(args.data)
    X = df["text"].astype(str).tolist()
    y = df["category"].astype(str).tolist()
    labels = sorted(set(y))
    label_to_idx = {l:i for i,l in enumerate(labels)}
    y_idx = [label_to_idx[v] for v in y]

    X_train, X_val, y_train, y_val = train_test_split(X, y_idx, test_size=0.2, random_state=42, stratify=y_idx)

    tok = AutoTokenizer.from_pretrained(args.model)
    train_enc = tok(X_train, truncation=True, padding=True, max_length=64)
    val_enc = tok(X_val, truncation=True, padding=True, max_length=64)

    train_ds = Ds(train_enc, y_train)
    val_ds = Ds(val_enc, y_val)

    model = AutoModelForSequenceClassification.from_pretrained(
        args.model,
        num_labels=len(labels),
        id2label={i:l for i,l in enumerate(labels)},
        label2id={l:i for i,l in enumerate(labels)},
    )

    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)

    targs = TrainingArguments(
        output_dir=str(outdir / "_runs"),
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch,
        per_device_eval_batch_size=args.batch,
        evaluation_strategy="epoch",
        save_strategy="epoch",
        logging_steps=20,
        load_best_model_at_end=True,
        metric_for_best_model="f1_macro",
        fp16=torch.cuda.is_available(),
    )

    trainer = Trainer(
        model=model,
        args=targs,
        train_dataset=train_ds,
        eval_dataset=val_ds,
        tokenizer=tok,
        compute_metrics=compute_metrics,
    )

    trainer.train()
    trainer.evaluate()

    # Save final model to outdir (used for inference)
    model.save_pretrained(str(outdir))
    tok.save_pretrained(str(outdir))
    print("Saved DL model to", outdir)

if __name__ == "__main__":
    main()
