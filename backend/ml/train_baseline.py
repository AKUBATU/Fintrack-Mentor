import argparse
from pathlib import Path
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, accuracy_score
import joblib

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default=str(Path(__file__).resolve().parent / "data" / "train.csv"))
    ap.add_argument("--outdir", default=str(Path(__file__).resolve().parent / "artifacts"))
    args = ap.parse_args()

    df = pd.read_csv(args.data)
    X = df["text"].astype(str).tolist()
    y = df["category"].astype(str).tolist()
    labels = sorted(set(y))
    label_to_idx = {l:i for i,l in enumerate(labels)}
    y_idx = [label_to_idx[v] for v in y]

    X_train, X_test, y_train, y_test = train_test_split(X, y_idx, test_size=0.2, random_state=42, stratify=y_idx)

    pipe = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1,2), min_df=2)),
        ("clf", LogisticRegression(max_iter=2000))
    ])
    pipe.fit(X_train, y_train)
    pred = pipe.predict(X_test)

    print("Accuracy:", accuracy_score(y_test, pred))
    print(classification_report(y_test, pred, target_names=labels))

    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipe, outdir / "baseline.joblib")
    joblib.dump(labels, outdir / "labels.joblib")
    print("Saved baseline artifacts to", outdir)

if __name__ == "__main__":
    main()
