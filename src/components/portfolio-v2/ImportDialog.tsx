"use client";

import { useMemo, useState } from "react";
import styles from "./portfolio.module.css";
import {
  parseBrokerPaste,
  type ParsedPositionDraft,
} from "@/lib/portfolio/importParser";

interface ImportDialogProps {
  onClose: () => void;
  onImported: () => void;
}

export function ImportDialog({ onClose, onImported }: ImportDialogProps) {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<ParsedPositionDraft[]>([]);
  const [skipped, setSkipped] = useState<{ line: string; reason: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState(false);

  const totalCost = useMemo(
    () => rows.reduce((s, r) => s + r.cost_basis, 0),
    [rows],
  );

  function handleParse() {
    setError(null);
    const result = parseBrokerPaste(text);
    setRows(result.rows);
    setSkipped(result.skipped);
    setParsed(true);
  }

  function removeRow(idx: number) {
    setRows(rows.filter((_, i) => i !== idx));
  }

  async function handleImport() {
    if (rows.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/positions/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positions: rows }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Import failed");
        return;
      }
      onImported();
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
      >
        <div className={styles.dialogHdr}>
          <div>
            <div className={styles.dialogTitle}>Import positions</div>
            <div className={styles.dialogSub}>
              Paste rows from your broker&apos;s positions table (tab-separated).
              We&apos;ll parse each line into a position.
            </div>
          </div>
          <button
            className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className={styles.dialogBody}>
          <label className={styles.microLabel} style={{ display: "block", marginBottom: 6 }}>
            Paste broker rows
          </label>
          <textarea
            className={styles.importTextarea}
            placeholder={
              "FORM 260515\tFORM May 15 125 Call\t2 Long\t$2,290.00\t15.25\t24.40\t$1,200.00\t1,145.00\t75.08%\t$3,050.00\t$5,340.00\tApr 29, 2026 PM\t27.90\t53"
            }
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setParsed(false);
            }}
            spellCheck={false}
          />

          <div className={styles.importActions}>
            <button
              className={`${styles.btn}`}
              onClick={handleParse}
              disabled={!text.trim()}
            >
              Parse
            </button>
            {parsed && (
              <span className={styles.importSummary}>
                {rows.length} parsed · {skipped.length} skipped ·{" "}
                ${totalCost.toLocaleString("en-US", { maximumFractionDigits: 0 })} total cost
              </span>
            )}
          </div>

          {parsed && rows.length > 0 && (
            <div className={styles.previewTable}>
              <div className={styles.previewHead}>
                <div>Ticker</div>
                <div>Name</div>
                <div style={{ textAlign: "right" }}>Qty</div>
                <div>Side</div>
                <div>Type</div>
                <div style={{ textAlign: "right" }}>Strike</div>
                <div style={{ textAlign: "right" }}>Premium</div>
                <div>Expiry</div>
                <div style={{ textAlign: "right" }}>Cost</div>
                <div />
              </div>
              {rows.map((r, i) => {
                const leg = r.legs[0];
                return (
                  <div className={styles.previewRow} key={i}>
                    <div className={styles.mono}>{r.ticker}</div>
                    <div>{r.name}</div>
                    <div className={styles.mono} style={{ textAlign: "right" }}>
                      {leg.quantity}
                    </div>
                    <div className={styles.mono}>{leg.side}</div>
                    <div className={styles.mono}>{leg.type}</div>
                    <div className={styles.mono} style={{ textAlign: "right" }}>
                      {leg.strike}
                    </div>
                    <div className={styles.mono} style={{ textAlign: "right" }}>
                      {leg.entry_premium.toFixed(2)}
                    </div>
                    <div className={styles.mono}>{leg.expiration_date}</div>
                    <div className={styles.mono} style={{ textAlign: "right" }}>
                      ${r.cost_basis.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    </div>
                    <button
                      className={styles.previewRm}
                      onClick={() => removeRow(i)}
                      aria-label="Remove"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {parsed && skipped.length > 0 && (
            <details className={styles.skippedBlock}>
              <summary>{skipped.length} line(s) skipped — click to review</summary>
              <ul>
                {skipped.map((s, i) => (
                  <li key={i}>
                    <span className={styles.skipReason}>{s.reason}</span>
                    <span className={styles.skipLine}>{s.line}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}

          {parsed && rows.length === 0 && skipped.length > 0 && (
            <div className={styles.importHint}>
              Nothing parsed. Make sure your paste includes a description cell like{" "}
              <code>FORM May 15 125 Call</code> followed by a position cell like{" "}
              <code>2 Long</code>, and that columns are tab-separated.
            </div>
          )}

          {error && <div className={styles.importError}>{error}</div>}
        </div>

        <div className={styles.dialogFoot}>
          <button className={`${styles.btn} ${styles.btnGhost}`} onClick={onClose}>
            Cancel
          </button>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={handleImport}
            disabled={submitting || rows.length === 0}
          >
            {submitting ? "Importing…" : `Import ${rows.length || ""} position${rows.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
