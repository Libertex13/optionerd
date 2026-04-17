"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const links = [
  { href: "/calculator/long-call", label: "Long Call" },
  { href: "/calculator/long-put", label: "Long Put" },
  { href: "/calculator/covered-call", label: "Covered Call" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Toggle menu"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      {open && (
        <nav className="absolute top-12 left-0 right-0 border-b border-border bg-card z-50">
          <div className="mx-auto max-w-7xl px-4 py-3 flex flex-col gap-3 font-mono text-sm text-muted-foreground">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </>
  );
}
