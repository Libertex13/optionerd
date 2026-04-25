"use client";

import { useEffect } from "react";
import type { PortfolioPosition } from "@/lib/portfolio/types";
import { ExpiryCalendar } from "./ExpiryCalendar";

interface ExpiryCalendarDialogProps {
  positions: PortfolioPosition[];
  open: boolean;
  onClose: () => void;
}

export function ExpiryCalendarDialog({
  positions,
  open,
  onClose,
}: ExpiryCalendarDialogProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Expiry calendar"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--card)",
          color: "var(--card-foreground)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          width: "min(960px, 100%)",
          maxHeight: "calc(100vh - 32px)",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Expiry calendar</div>
            <div
              style={{
                fontSize: 11,
                color: "var(--muted-foreground)",
                marginTop: 2,
                fontFamily: "var(--font-mono), monospace",
              }}
            >
              Next 9 weeks · click outside or press Esc to close
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              border: 0,
              background: "transparent",
              color: "var(--muted-foreground)",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: 16 }}>
          <ExpiryCalendar positions={positions} />
        </div>
      </div>
    </div>
  );
}
