"use client";

import { useMemo, useRef, useState } from "react";
import styles from "./portfolio.module.css";
import {
  parseBrokerPaste,
  type ParsedPositionDraft,
} from "@/lib/portfolio/importParser";

interface ImportDialogProps {
  onClose: () => void;
  onImported: () => void;
}

type Mode = "paste" | "screenshot";

export function ImportDialog({ onClose, onImported }: ImportDialogProps) {
  const [mode, setMode] = useState<Mode>("paste");

  // Paste mode state
  const [text, setText] = useState("");
  const [skipped, setSkipped] = useState<{ line: string; reason: string }[]>([]);

  // Screenshot mode state
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [modelInfo, setModelInfo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Shared state
  const [rows, setRows] = useState<ParsedPositionDraft[]>([]);
  const [parsed, setParsed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalCost = useMemo(
    () => rows.reduce((s, r) => s + r.cost_basis, 0),
    [rows],
  );

  function resetPreview() {
    setRows([]);
    setParsed(false);
    setSkipped([]);
    setModelInfo(null);
    setError(null);
  }

  function switchMode(next: Mode) {
    if (next === mode) return;
    setMode(next);
    resetPreview();
  }

  // ─── Paste mode ──────────────────────────────────────
  function handleParsePaste() {
    setError(null);
    const result = parseBrokerPaste(text);
    setRows(result.rows);
    setSkipped(result.skipped);
    setParsed(true);
  }

  // ─── Screenshot mode ─────────────────────────────────
  function handleFileSelect(next: File | null) {
    resetPreview();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (!next) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    if (!next.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    if (next.size > 10 * 1024 * 1024) {
      setError("File too large (max 10MB)");
      return;
    }
    setFile(next);
    setPreviewUrl(URL.createObjectURL(next));
  }

  async function handleExtract() {
    if (!file) return;
    setExtracting(true);
    setError(null);
    setSkipped([]);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/positions/import/screenshot", {
        method: "POST",
        body: form,
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Extraction failed");
        return;
      }
      setRows(Array.isArray(body.positions) ? body.positions : []);
      setParsed(true);
      if (body.model) setModelInfo(body.model);
    } catch {
      setError("Network error");
    } finally {
      setExtracting(false);
    }
  }

  // ─── Common ──────────────────────────────────────────
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

  const subCopy =
    mode === "paste"
      ? "Paste rows from your broker's positions table (tab-separated)."
      : "Upload a screenshot of your broker's positions table. AI will extract each row.";

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
            <div className={styles.dialogSub}>{subCopy}</div>
          </div>
          <button
            className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className={styles.dialogBody}>
          <div className={styles.importTabs}>
            <button
              className={`${styles.importTab} ${mode === "paste" ? styles.importTabActive : ""}`}
              onClick={() => switchMode("paste")}
            >
              Paste text
            </button>
            <button
              className={`${styles.importTab} ${mode === "screenshot" ? styles.importTabActive : ""}`}
              onClick={() => switchMode("screenshot")}
            >
              Upload screenshot
            </button>
          </div>

          {mode === "paste" && (
            <>
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
                  onClick={handleParsePaste}
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
            </>
          )}

          {mode === "screenshot" && (
            <>
              <label className={styles.microLabel} style={{ display: "block", marginBottom: 6 }}>
                Upload image
              </label>
              <div
                className={`${styles.dropZone} ${dragOver ? styles.dropZoneOver : ""} ${file ? styles.dropZoneFilled : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleFileSelect(f);
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  style={{ display: "none" }}
                  onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
                />
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="screenshot preview"
                    className={styles.dropPreview}
                  />
                ) : (
                  <div className={styles.dropHint}>
                    <div style={{ fontSize: 13, marginBottom: 4 }}>
                      Drop a screenshot here, or click to choose
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.7 }}>
                      PNG, JPG, WebP, GIF · max 10MB
                    </div>
                  </div>
                )}
              </div>
              <div className={styles.importActions}>
                <button
                  className={`${styles.btn}`}
                  onClick={handleExtract}
                  disabled={!file || extracting}
                >
                  {extracting ? "Extracting…" : "Extract positions"}
                </button>
                {file && !extracting && (
                  <button
                    className={`${styles.btn} ${styles.btnGhost}`}
                    onClick={() => handleFileSelect(null)}
                  >
                    Clear
                  </button>
                )}
                {parsed && (
                  <span className={styles.importSummary}>
                    {rows.length} extracted ·{" "}
                    ${totalCost.toLocaleString("en-US", { maximumFractionDigits: 0 })} total cost
                    {modelInfo && ` · ${modelInfo}`}
                  </span>
                )}
              </div>
            </>
          )}

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

          {mode === "paste" && parsed && skipped.length > 0 && (
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

          {mode === "paste" && parsed && rows.length === 0 && skipped.length > 0 && (
            <div className={styles.importHint}>
              Nothing parsed. Make sure your paste includes a description cell like{" "}
              <code>FORM May 15 125 Call</code> followed by a position cell like{" "}
              <code>2 Long</code>, and that columns are tab-separated.
            </div>
          )}

          {mode === "screenshot" && parsed && rows.length === 0 && (
            <div className={styles.importHint}>
              No option positions detected in that screenshot. Make sure the
              table is clearly visible and includes description, quantity, avg
              price, and total cost columns.
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
