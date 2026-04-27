"use client";

import { useMemo, useRef, useState } from "react";
import styles from "./portfolio.module.css";
import type { ParsedPositionDraft } from "@/lib/portfolio/importParser";

interface ImportDialogProps {
  onClose: () => void;
  onImported: () => void;
}

type Mode = "tradestation" | "paste" | "screenshot";

export function ImportDialog({ onClose, onImported }: ImportDialogProps) {
  const [mode, setMode] = useState<Mode>("tradestation");

  // Paste mode state (now AI-parsed — accepts any broker statement format)
  const [text, setText] = useState("");
  const [parsingText, setParsingText] = useState(false);

  // Screenshot mode state
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Shared state
  const [rows, setRows] = useState<ParsedPositionDraft[]>([]);
  const [parsed, setParsed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fetchingBroker, setFetchingBroker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelInfo, setModelInfo] = useState<string | null>(null);
  const [skippedCount, setSkippedCount] = useState(0);
  const [skippedRows, setSkippedRows] = useState<Array<{ symbol: string; reason: string }>>([]);
  const [accountSummary, setAccountSummary] = useState<string | null>(null);

  const totalCost = useMemo(
    () => rows.reduce((s, r) => s + (r.cost_basis ?? 0), 0),
    [rows],
  );

  function resetPreview() {
    setRows([]);
    setParsed(false);
    setSkippedCount(0);
    setSkippedRows([]);
    setModelInfo(null);
    setAccountSummary(null);
    setError(null);
  }

  function switchMode(next: Mode) {
    if (next === mode) return;
    setMode(next);
    resetPreview();
  }

  async function handleFetchTradeStation() {
    setFetchingBroker(true);
    setError(null);
    try {
      const res = await fetch("/api/brokerage/tradestation/positions");
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "TradeStation import failed");
        return;
      }

      setRows(Array.isArray(body.positions) ? body.positions : []);
      const skipped = Array.isArray(body.skipped) ? body.skipped : [];
      setSkippedRows(skipped);
      setSkippedCount(skipped.length);
      setParsed(true);

      const accountCount = Array.isArray(body.accounts) ? body.accounts.length : 0;
      const rawCount = typeof body.rawCount === "number" ? body.rawCount : 0;
      setAccountSummary(
        `${accountCount} account${accountCount === 1 ? "" : "s"} - ${rawCount} broker row${rawCount === 1 ? "" : "s"}`,
      );
    } catch {
      setError("Network error");
    } finally {
      setFetchingBroker(false);
    }
  }

  // ─── Paste mode (AI-parsed) ──────────────────────────
  async function handleParsePaste() {
    if (!text.trim() || parsingText) return;
    setParsingText(true);
    setError(null);
    try {
      const res = await fetch("/api/positions/import/statement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Parse failed");
        return;
      }
      setRows(Array.isArray(body.positions) ? body.positions : []);
      setSkippedCount(typeof body.skipped === "number" ? body.skipped : 0);
      setParsed(true);
      if (body.model) setModelInfo(body.model);
    } catch {
      setError("Network error");
    } finally {
      setParsingText(false);
    }
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
      setSkippedCount(typeof body.skipped === "number" ? body.skipped : 0);
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
      const res = await fetch(
        mode === "tradestation"
          ? "/api/brokerage/tradestation/import"
          : "/api/positions/bulk",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ positions: rows }),
        },
      );
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
    mode === "tradestation"
      ? "Pull positions from your connected TradeStation account and review them before saving."
      : mode === "paste"
        ? "Paste anything from your broker — positions table, CSV, statement text. AI figures out the format."
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
              className={`${styles.importTab} ${mode === "tradestation" ? styles.importTabActive : ""}`}
              onClick={() => switchMode("tradestation")}
            >
              TradeStation
            </button>
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

          {mode === "tradestation" && (
            <>
              <div className={styles.importHint}>
                TradeStation import is read-only. Option rows must have standard OCC symbols; unsupported rows are skipped and reported.
              </div>
              <div className={styles.importActions}>
                <button
                  className={`${styles.btn}`}
                  onClick={handleFetchTradeStation}
                  disabled={fetchingBroker}
                >
                  {fetchingBroker ? "Fetching..." : parsed ? "Refresh preview" : "Fetch from TradeStation"}
                </button>
                {parsed && (
                  <span className={styles.importSummary}>
                    {rows.length} ready
                    {skippedCount > 0 ? ` - ${skippedCount} skipped` : ""} -{" "}
                    {accountSummary ?? "TradeStation"}
                  </span>
                )}
              </div>
            </>
          )}

          {mode === "paste" && (
            <>
              <label className={styles.microLabel} style={{ display: "block", marginBottom: 6 }}>
                Paste broker statement
              </label>
              <textarea
                className={styles.importTextarea}
                placeholder={
                  "Paste rows from TradeStation, IBKR, Schwab, Fidelity, tastytrade — or any CSV/text export. Multi-leg spreads, calendars, and condors are grouped automatically."
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
                  disabled={!text.trim() || parsingText}
                >
                  {parsingText ? "Parsing…" : "Parse"}
                </button>
                {text && !parsingText && (
                  <button
                    className={`${styles.btn} ${styles.btnGhost}`}
                    onClick={() => {
                      setText("");
                      resetPreview();
                    }}
                  >
                    Clear
                  </button>
                )}
                {parsed && (
                  <span className={styles.importSummary}>
                    {rows.length} parsed
                    {skippedCount > 0 ? ` · ${skippedCount} skipped` : ""} ·{" "}
                    {rows.some((r) => r.cost_basis == null)
                      ? "risk auto-calculated on import"
                      : `$${totalCost.toLocaleString("en-US", { maximumFractionDigits: 0 })} total cost`}
                    {modelInfo && ` · ${modelInfo}`}
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
                    {rows.length} extracted
                    {skippedCount > 0 ? ` · ${skippedCount} skipped` : ""} ·{" "}
                    {rows.some((r) => r.cost_basis == null)
                      ? "risk auto-calculated on import"
                      : `$${totalCost.toLocaleString("en-US", { maximumFractionDigits: 0 })} total cost`}
                    {modelInfo && ` · ${modelInfo}`}
                  </span>
                )}
              </div>
            </>
          )}

          {parsed && rows.length > 0 && (
            <div className={styles.previewTable}>
              {rows.map((r, i) => (
                <div className={styles.previewCard} key={i}>
                  <div className={styles.previewCardHdr}>
                    <div className={styles.mono}>{r.ticker}</div>
                    <div className={styles.previewCardName}>
                      {r.name}
                      {r.stock_leg && r.legs.length === 0 && (
                        <span className={styles.previewLegCount}>
                          shares · {r.strategy}
                        </span>
                      )}
                      {r.legs.length > 1 && (
                        <span className={styles.previewLegCount}>
                          {r.legs.length} legs · {r.strategy}
                        </span>
                      )}
                    </div>
                    <div
                      className={styles.mono}
                      style={{ textAlign: "right", fontWeight: 600 }}
                    >
                      {r.cost_basis == null
                        ? "Auto"
                        : `$${r.cost_basis.toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
                    </div>
                    <button
                      className={styles.previewRm}
                      onClick={() => removeRow(i)}
                      aria-label="Remove"
                    >
                      ✕
                    </button>
                  </div>
                  <div className={styles.previewLegList}>
                    {r.stock_leg && (
                      <div className={styles.previewLegRow}>
                        <span
                          className={`${styles.previewLegSide} ${r.stock_leg.side === "long" ? styles.previewLegLong : styles.previewLegShort}`}
                        >
                          {r.stock_leg.side === "long" ? "B" : "S"}
                        </span>
                        <span className={styles.mono}>{r.stock_leg.quantity} SH</span>
                        <span className={styles.mono} style={{ color: "var(--muted-foreground)" }}>
                          shares
                        </span>
                        <span className={styles.mono} style={{ color: "var(--muted-foreground)" }}>
                          @ ${r.stock_leg.entry_price.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {r.legs.map((leg, li) => (
                      <div className={styles.previewLegRow} key={li}>
                        <span
                          className={`${styles.previewLegSide} ${leg.side === "long" ? styles.previewLegLong : styles.previewLegShort}`}
                        >
                          {leg.side === "long" ? "B" : "S"}
                        </span>
                        <span className={styles.mono}>
                          {leg.quantity}
                          {leg.type === "call" ? "C" : "P"} {leg.strike}
                        </span>
                        <span className={styles.mono} style={{ color: "var(--muted-foreground)" }}>
                          exp {leg.expiration_date}
                        </span>
                        <span className={styles.mono} style={{ color: "var(--muted-foreground)" }}>
                          @ ${leg.entry_premium.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {mode === "paste" && parsed && rows.length === 0 && (
            <div className={styles.importHint}>
              No positions detected in that paste. Include ticker, quantity,
              and entry price for shares, or contract details for options
              (expiration, strike, call/put).
            </div>
          )}

          {mode === "screenshot" && parsed && rows.length === 0 && (
            <div className={styles.importHint}>
              No positions detected in that screenshot. Make sure the table is
              clearly visible and includes ticker/description, quantity, avg
              price, and total cost columns.
            </div>
          )}

          {mode === "tradestation" && parsed && rows.length === 0 && (
            <div className={styles.importHint}>
              No supported TradeStation positions were found. If you hold options, check whether their symbols are standard OCC/OSI format.
            </div>
          )}

          {mode === "tradestation" && skippedRows.length > 0 && (
            <div className={styles.importHint}>
              {skippedRows.slice(0, 6).map((row, idx) => (
                <div key={`${row.symbol}-${idx}`} className={styles.mono}>
                  {row.symbol}: {row.reason}
                </div>
              ))}
              {skippedRows.length > 6 && (
                <div className={styles.mono}>
                  +{skippedRows.length - 6} more skipped
                </div>
              )}
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
            title={
              rows.length === 0
                ? mode === "tradestation"
                  ? "Fetch TradeStation positions first"
                  : mode === "paste"
                    ? "Paste rows and click Parse first"
                    : "Upload a screenshot and click Extract positions first"
                : undefined
            }
          >
            {submitting
              ? "Importing…"
              : rows.length === 0
                ? mode === "tradestation"
                  ? "Fetch first"
                  : mode === "paste"
                    ? "Parse rows first"
                    : "Extract first"
                : `Import ${rows.length} position${rows.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
