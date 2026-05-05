"use client";

import { useState } from "react";
import styles from "./portfolio.module.css";

interface DraftLeg {
  side: "long" | "short";
  quantity: number;
  type: "call" | "put";
  strike: number;
  expiration_date: string;
  entry_premium: number;
}

interface NewPositionDialogProps {
  onClose: () => void;
  onCreated: () => Promise<void> | void;
}

const STRATEGIES = [
  "long-call",
  "long-put",
  "short-call",
  "short-put",
  "covered-call",
  "bull-call-spread",
  "bear-put-spread",
  "iron-condor",
  "iron-butterfly",
  "long-straddle",
  "long-strangle",
  "calendar-spread",
  "diagonal-spread",
  "custom",
];

function defaultExpiry(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 30);
  return d.toISOString().slice(0, 10);
}

function emptyLeg(): DraftLeg {
  return {
    side: "long",
    quantity: 1,
    type: "call",
    strike: 100,
    expiration_date: defaultExpiry(),
    entry_premium: 1,
  };
}

function inferStrategy(legs: DraftLeg[]): string {
  if (legs.length === 1) {
    const l = legs[0];
    if (l.type === "call") return l.side === "long" ? "long-call" : "short-call";
    return l.side === "long" ? "long-put" : "short-put";
  }
  return "custom";
}

function defaultName(ticker: string, legs: DraftLeg[]): string {
  if (!ticker) return "";
  if (legs.length === 1) {
    const l = legs[0];
    return `${ticker.toUpperCase()} ${l.expiration_date} ${l.strike} ${l.type}`;
  }
  return `${ticker.toUpperCase()} ${legs.length}-leg`;
}

function computeCostBasis(legs: DraftLeg[]): number {
  return legs.reduce((sum, l) => {
    const sign = l.side === "long" ? 1 : -1;
    return sum + sign * l.entry_premium * l.quantity * 100;
  }, 0);
}

export function NewPositionDialog({ onClose, onCreated }: NewPositionDialogProps) {
  const [ticker, setTicker] = useState("");
  const [name, setName] = useState("");
  const [legs, setLegs] = useState<DraftLeg[]>([emptyLeg()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inferredStrategy = inferStrategy(legs);
  const [strategy, setStrategy] = useState<string>(inferredStrategy);
  const [strategyTouched, setStrategyTouched] = useState(false);
  const effectiveStrategy = strategyTouched ? strategy : inferredStrategy;

  const inferredName = defaultName(ticker, legs);
  const effectiveName = name.trim() || inferredName;
  const costBasis = computeCostBasis(legs);

  function updateLeg(idx: number, patch: Partial<DraftLeg>) {
    setLegs((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function addLeg() {
    setLegs((prev) => [...prev, emptyLeg()]);
  }

  function removeLeg(idx: number) {
    setLegs((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
  }

  async function submit() {
    setError(null);
    const tk = ticker.trim().toUpperCase();
    if (!tk) {
      setError("Ticker is required");
      return;
    }
    if (legs.length === 0) {
      setError("Add at least one leg");
      return;
    }
    for (const l of legs) {
      if (!Number.isFinite(l.strike) || l.strike <= 0) {
        setError("Each leg needs a valid strike");
        return;
      }
      if (!Number.isFinite(l.entry_premium) || l.entry_premium < 0) {
        setError("Each leg needs a valid premium");
        return;
      }
      if (!l.expiration_date) {
        setError("Each leg needs an expiration date");
        return;
      }
      if (!Number.isInteger(l.quantity) || l.quantity < 1) {
        setError("Quantity must be a positive integer");
        return;
      }
    }

    const payload = {
      name: effectiveName,
      ticker: tk,
      strategy: effectiveStrategy,
      entry_date: new Date().toISOString().slice(0, 10),
      cost_basis: costBasis,
      legs,
      state: "open",
    };

    setSubmitting(true);
    try {
      const res = await fetch("/api/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Failed to create position");
        return;
      }
      await onCreated();
      onClose();
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.dialogBackdrop} onClick={onClose}>
      <div
        className={styles.dialog}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Add new position"
      >
        <div className={styles.dialogHdr}>
          <div>
            <div className={styles.dialogTitle}>New position</div>
            <div className={styles.dialogSub}>
              Add a position manually. For multi-leg strategies, click &quot;Add leg&quot;.
            </div>
          </div>
          <button
            className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`}
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className={styles.dialogBody}>
          <div className={styles.npdGrid}>
            <div>
              <label className={styles.microLabel}>Ticker</label>
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                placeholder="AAPL"
                className={styles.npdInput}
                autoFocus
              />
            </div>
            <div>
              <label className={styles.microLabel}>Strategy</label>
              <select
                value={effectiveStrategy}
                onChange={(e) => {
                  setStrategy(e.target.value);
                  setStrategyTouched(true);
                }}
                className={styles.npdInput}
              >
                {STRATEGIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.npdNameCell}>
              <label className={styles.microLabel}>Display name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={inferredName || "auto from ticker + legs"}
                className={styles.npdInput}
              />
            </div>
          </div>

          <div className={styles.npdLegsHd}>
            <span className={styles.microLabel}>Legs</span>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`}
              onClick={addLeg}
            >
              + Add leg
            </button>
          </div>

          <div className={styles.npdLegList}>
            {legs.map((leg, i) => (
              <div className={styles.npdLegRow} key={i}>
                <select
                  value={leg.side}
                  onChange={(e) =>
                    updateLeg(i, { side: e.target.value as "long" | "short" })
                  }
                  className={styles.npdInputSm}
                  aria-label="Side"
                >
                  <option value="long">Long</option>
                  <option value="short">Short</option>
                </select>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={leg.quantity}
                  onChange={(e) =>
                    updateLeg(i, { quantity: parseInt(e.target.value, 10) || 1 })
                  }
                  className={styles.npdInputSm}
                  aria-label="Quantity"
                />
                <select
                  value={leg.type}
                  onChange={(e) =>
                    updateLeg(i, { type: e.target.value as "call" | "put" })
                  }
                  className={styles.npdInputSm}
                  aria-label="Type"
                >
                  <option value="call">Call</option>
                  <option value="put">Put</option>
                </select>
                <input
                  type="number"
                  step="0.5"
                  min={0}
                  value={leg.strike}
                  onChange={(e) =>
                    updateLeg(i, { strike: parseFloat(e.target.value) || 0 })
                  }
                  className={styles.npdInputSm}
                  aria-label="Strike"
                  placeholder="Strike"
                />
                <input
                  type="date"
                  value={leg.expiration_date}
                  onChange={(e) =>
                    updateLeg(i, { expiration_date: e.target.value })
                  }
                  className={styles.npdInputSm}
                  aria-label="Expiration"
                />
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={leg.entry_premium}
                  onChange={(e) =>
                    updateLeg(i, { entry_premium: parseFloat(e.target.value) || 0 })
                  }
                  className={styles.npdInputSm}
                  aria-label="Entry premium"
                  placeholder="Premium"
                />
                <button
                  type="button"
                  className={styles.previewRm}
                  onClick={() => removeLeg(i)}
                  aria-label="Remove leg"
                  disabled={legs.length <= 1}
                  title={legs.length <= 1 ? "At least one leg is required" : "Remove leg"}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className={styles.npdSummary}>
            <span>
              Cost basis (auto):{" "}
              <strong className={styles.mono}>
                {costBasis >= 0 ? "+" : "−"}$
                {Math.abs(costBasis).toLocaleString("en-US", {
                  maximumFractionDigits: 0,
                })}
              </strong>{" "}
              <span style={{ color: "var(--muted-foreground)" }}>
                ({costBasis >= 0 ? "debit" : "credit"})
              </span>
            </span>
          </div>

          {error && <div className={styles.importError}>{error}</div>}
        </div>

        <div className={styles.dialogFoot}>
          <button className={`${styles.btn} ${styles.btnGhost}`} onClick={onClose}>
            Cancel
          </button>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={submit}
            disabled={submitting || !ticker.trim()}
          >
            {submitting ? "Saving…" : "Save position"}
          </button>
        </div>
      </div>
    </div>
  );
}
