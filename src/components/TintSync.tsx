"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

const VALID = ["neutral", "indigo", "teal", "violet"];

export function TintSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (resolvedTheme !== "light" && resolvedTheme !== "dark") return;
    let tint: string | null = null;
    try {
      tint = localStorage.getItem(`optionerd-tint-${resolvedTheme}`);
    } catch {}
    if (!tint || !VALID.includes(tint)) {
      tint = resolvedTheme === "dark" ? "teal" : "neutral";
    }
    document.documentElement.dataset.tint = tint;
  }, [resolvedTheme]);

  return null;
}
