"""Deep-learning sequence model: a PyTorch LSTM that predicts the next artist.

Each listening session is a sequence of artist tokens. We train a word-level language
model (Embedding -> LSTM -> Linear) to predict the next artist given the prefix, then
measure top-1 / top-5 accuracy against a "most-frequent" baseline and generate sample
"you played X -> likely next" predictions.

Ported from `scripts/ml/sequence_model.py`; plotting stripped. torch is NOT part of the
default backend install (see the `ml-deep` extra in pyproject.toml), so in the normal
deployment this returns `{"available": false, "error": ...}` and the frontend hides the
section rather than the task failing.
"""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

VOCAB = 1500  # top-N artists kept; rarer ones map to <unk>
MAX_LEN = 40
EMB = 64
HIDDEN = 128
EPOCHS = 4
BATCH = 256
PAD, UNK = 0, 1
MIN_SESSIONS = 200


def _build(df: pd.DataFrame):
    plays = df["artist_name"].value_counts()
    top = list(plays.index[:VOCAB])
    stoi = {a: i + 2 for i, a in enumerate(top)}  # 0=PAD, 1=UNK
    itos = {i + 2: a for i, a in enumerate(top)}

    seqs = []
    for _, s in df.groupby("session_id")["artist_name"]:
        ids = [stoi.get(a, UNK) for a in s]
        if sum(1 for x in ids if x != UNK) >= 3:
            seqs.append(ids[:MAX_LEN])
    return seqs, stoi, itos, plays


def _pad(seqs) -> np.ndarray:
    x = np.zeros((len(seqs), MAX_LEN), dtype=np.int64)
    for i, s in enumerate(seqs):
        x[i, : len(s)] = s
    return x


def run(df: pd.DataFrame) -> dict:
    try:
        import torch
        import torch.nn as nn
    except Exception as exc:
        logger.info("Skipping next-artist LSTM — torch unavailable: %s", exc)
        return {"available": False, "error": f"torch unavailable: {exc}"}

    torch.manual_seed(42)
    seqs, stoi, itos, plays = _build(df)
    if len(seqs) < MIN_SESSIONS:
        return {"available": False, "error": "too few sessions"}

    rng = np.random.default_rng(42)
    idx = rng.permutation(len(seqs))
    cut = int(0.85 * len(seqs))
    train = _pad([seqs[i] for i in idx[:cut]])
    test = _pad([seqs[i] for i in idx[cut:]])
    vocab_size = VOCAB + 2

    class LSTMNet(nn.Module):
        def __init__(self):
            super().__init__()
            self.emb = nn.Embedding(vocab_size, EMB, padding_idx=PAD)
            self.lstm = nn.LSTM(EMB, HIDDEN, batch_first=True)
            self.fc = nn.Linear(HIDDEN, vocab_size)

        def forward(self, x):
            out, _ = self.lstm(self.emb(x))
            return self.fc(out)

    model = LSTMNet()
    opt = torch.optim.Adam(model.parameters(), lr=2e-3)
    loss_fn = nn.CrossEntropyLoss(ignore_index=PAD)
    x_train = torch.tensor(train)

    losses = []
    for _epoch in range(EPOCHS):
        model.train()
        perm = torch.randperm(len(x_train))
        ep_loss = 0.0
        for i in range(0, len(x_train), BATCH):
            b = x_train[perm[i : i + BATCH]]
            inp, tgt = b[:, :-1], b[:, 1:]
            opt.zero_grad()
            logits = model(inp)
            loss = loss_fn(logits.reshape(-1, vocab_size), tgt.reshape(-1))
            loss.backward()
            opt.step()
            ep_loss += loss.item() * len(b)
        losses.append(round(ep_loss / len(x_train), 4))

    # ── Evaluate top-1 / top-5 on held-out sessions ──────────────────────────
    model.eval()
    x_test = torch.tensor(test)
    top1 = top5 = total = 0
    with torch.no_grad():
        for i in range(0, len(x_test), BATCH):
            b = x_test[i : i + BATCH]
            inp, tgt = b[:, :-1], b[:, 1:]
            logits = model(inp)
            mask = tgt != PAD
            t5 = logits.topk(5, dim=-1).indices
            pred1 = logits.argmax(-1)
            top1 += int(((pred1 == tgt) & mask).sum())
            top5 += int(((t5 == tgt.unsqueeze(-1)).any(-1) & mask).sum())
            total += int(mask.sum())

    baseline = float(plays.iloc[0] / plays.sum())  # always-guess-favorite

    # ── Sample next-artist predictions for the top seeds ─────────────────────
    samples = []
    seeds = [a for a in plays.index if a in stoi][:6]
    with torch.no_grad():
        for seed in seeds:
            x = torch.tensor([[stoi[seed]]])
            logits = model(x)[0, -1]
            probs = torch.softmax(logits, -1)
            top = probs.topk(8).indices.tolist()
            nxt = [itos[i] for i in top if i in itos and itos[i] != seed][:5]
            samples.append({"after": seed, "predicts": nxt})

    return {
        "available": True,
        "params": {"vocab": vocab_size, "emb": EMB, "hidden": HIDDEN, "epochs": EPOCHS},
        "sessions_train": int(cut),
        "sessions_test": int(len(seqs) - cut),
        "next_artist_top1": round(top1 / max(total, 1), 4),
        "next_artist_top5": round(top5 / max(total, 1), 4),
        "baseline_top1": round(baseline, 4),
        "lift_over_baseline": round((top1 / max(total, 1)) / max(baseline, 1e-9), 1),
        "train_loss_curve": losses,
        "sample_predictions": samples,
    }
