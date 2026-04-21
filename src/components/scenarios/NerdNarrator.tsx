"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type NerdNarratorProps = {
  title: string;
  narrative: string;
  date?: string;
  summary?: string;
  speaking?: boolean;
  className?: string;
};

type NerdSaysProps = {
  children: ReactNode;
  size?: "sm" | "md";
  tone?: "default" | "quote";
  className?: string;
};

/**
 * Compact "the nerd is talking" — avatar + speech bubble, content is whatever
 * the caller passes in. Drop into any spot where the trader's voice fits:
 * a moment's narrative, a pull-quote one-liner, an inline aside.
 */
export function NerdSays({
  children,
  size = "md",
  tone = "default",
  className,
}: NerdSaysProps) {
  const avatarSize = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const iconSize = size === "sm" ? 24 : 30;
  const tailOffset = size === "sm" ? "top-3" : "top-4";
  const bubblePad = size === "sm" ? "p-3" : "p-3.5 md:p-4";
  const bubbleTone =
    tone === "quote"
      ? "border-amber-500/40 bg-amber-500/5"
      : "border-border bg-card";
  const tailTone =
    tone === "quote"
      ? "border-amber-500/40 bg-amber-500/5"
      : "border-border bg-card";

  return (
    <div className={cn("flex items-start gap-3", className)}>
      <div
        className={cn(
          "shrink-0 flex items-center justify-center rounded-full border border-border bg-card",
          avatarSize,
        )}
      >
        <Image
          src="/icon-dark.svg"
          alt="optionerd"
          width={iconSize}
          height={iconSize}
          className="invert dark:invert-0"
        />
      </div>
      <div className="relative flex-1 min-w-0">
        <div
          aria-hidden
          className={cn(
            "absolute -left-1.5 h-3 w-3 rotate-45 border-b border-l",
            tailOffset,
            tailTone,
          )}
        />
        <div
          className={cn("rounded-lg border", bubblePad, bubbleTone)}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function NerdNarrator({
  title,
  narrative,
  date,
  summary,
  speaking = false,
  className,
}: NerdNarratorProps) {
  return (
    <div className={cn("flex items-start gap-3 md:gap-4", className)}>
      <div className="relative shrink-0">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card md:h-14 md:w-14",
            speaking && "ring-2 ring-primary/60 animate-[nerd-pulse_1.6s_ease-in-out_infinite]",
          )}
        >
          <Image
            src="/icon-dark.svg"
            alt="optionerd"
            width={40}
            height={40}
            className="dark:invert-0 invert"
          />
        </div>
      </div>

      <div className="relative flex-1 min-w-0">
        <div
          aria-hidden
          className="absolute -left-2 top-4 h-3 w-3 rotate-45 border-b border-l border-border bg-card"
        />
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-baseline justify-between gap-3 mb-2">
            <div className="text-sm font-semibold tracking-tight">{title}</div>
            {date ? (
              <div className="font-mono text-xs text-muted-foreground shrink-0">
                {date}
              </div>
            ) : null}
          </div>
          {summary ? (
            <div className="font-mono text-xs text-muted-foreground mb-3 uppercase tracking-wider">
              {summary}
            </div>
          ) : null}
          <p className="text-sm leading-relaxed text-foreground/90">
            {narrative}
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes nerd-pulse {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(96, 165, 250, 0.35);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(96, 165, 250, 0);
          }
        }
      `}</style>
    </div>
  );
}
