import argparse
from pathlib import Path
import pandas as pd
import numpy as np
import torch
import torch.nn as nn
from sklearn.preprocessing import StandardScaler
import joblib

class AE(nn.Module):
    def __init__(self, n_in: int):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(n_in, 16),
            nn.ReLU(),
            nn.Linear(16, 8),
            nn.ReLU(),
            nn.Linear(8, 16),
            nn.ReLU(),
            nn.Linear(16, n_in),
        )
    def forward(self, x):
        return self.net(x)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default=str(Path(__file__).resolve().parent / "data" / "train.csv"))
    ap.add_argument("--outdir", default=str(Path(__file__).resolve().parent / "artifacts"))
    ap.add_argument("--epochs", type=int, default=30)
    args = ap.parse_args()

    df = pd.read_csv(args.data)
    # simple numeric features: amount + one-hot category
    cats = sorted(df["category"].unique())
    cat_to_idx = {c:i for i,c in enumerate(cats)}
    X = []
    for _, r in df.iterrows():
        vec = [float(r["amount"])]
        one = [0.0]*len(cats)
        one[cat_to_idx[r["category"]]] = 1.0
        vec += one
        X.append(vec)
    X = np.array(X, dtype=np.float32)

    scaler = StandardScaler()
    Xs = scaler.fit_transform(X).astype(np.float32)

    x = torch.tensor(Xs)
    model = AE(x.shape[1])
    opt = torch.optim.Adam(model.parameters(), lr=1e-3)
    loss_fn = nn.MSELoss()

    model.train()
    for e in range(args.epochs):
        opt.zero_grad()
        out = model(x)
        loss = loss_fn(out, x)
        loss.backward()
        opt.step()
        if (e+1) % 5 == 0:
            print(f"epoch {e+1}/{args.epochs} loss={loss.item():.6f}")

    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)
    joblib.dump({"scaler": scaler, "cats": cats}, outdir / "ae_meta.joblib")
    scripted = torch.jit.script(model.eval())
    scripted.save(str(outdir / "autoencoder.pt"))
    print("Saved autoencoder to", outdir)

if __name__ == "__main__":
    main()
