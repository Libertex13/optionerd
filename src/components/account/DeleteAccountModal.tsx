"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

const REASONS = [
  "I don't use it enough",
  "Too expensive",
  "Missing features I need",
  "Found a better alternative",
  "Privacy concerns",
  "Other",
];

interface DeleteAccountModalProps {
  open: boolean;
  onClose: () => void;
}

export function DeleteAccountModal({ open, onClose }: DeleteAccountModalProps) {
  const { signOut } = useAuth();
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const canDelete = confirmText === "DELETE";

  const handleDelete = async () => {
    if (!canDelete) return;
    setDeleting(true);
    setError("");

    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, feedback }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Something went wrong");
        setDeleting(false);
        return;
      }

      await signOut();
      router.push("/?deleted=true");
    } catch {
      setError("Something went wrong. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-md border border-border bg-card p-5 shadow-lg mx-3">
        <h2 className="text-lg font-bold text-destructive">Delete account</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This will permanently delete your account, all saved trades, and
          cancel any active subscription. This cannot be undone.
        </p>

        {/* Reason */}
        <div className="mt-4">
          <label className="block text-sm font-medium mb-1.5">
            Why are you leaving?
          </label>
          <div className="space-y-1.5">
            {REASONS.map((r) => (
              <label
                key={r}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <input
                  type="radio"
                  name="reason"
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  className="accent-destructive"
                />
                {r}
              </label>
            ))}
          </div>
        </div>

        {/* Feedback */}
        <div className="mt-4">
          <label className="block text-sm font-medium mb-1.5">
            Anything else you&apos;d like us to know?{" "}
            <span className="text-muted-foreground font-normal">
              (optional)
            </span>
          </label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="What could we have done differently?"
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          />
        </div>

        {/* Confirmation */}
        <div className="mt-4">
          <label className="block text-sm font-medium mb-1.5">
            Type <span className="font-mono font-bold text-destructive">DELETE</span> to
            confirm
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        {error && (
          <p className="mt-3 text-sm text-destructive">{error}</p>
        )}

        {/* Actions */}
        <div className="mt-5 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 h-8 text-sm font-medium hover:bg-muted transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={!canDelete || deleting}
            className="inline-flex items-center justify-center rounded-md bg-destructive/10 text-destructive px-3 h-8 text-sm font-medium hover:bg-destructive/20 transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {deleting ? "Deleting..." : "Delete my account"}
          </button>
        </div>
      </div>
    </div>
  );
}
