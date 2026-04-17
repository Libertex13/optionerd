"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AuthModal } from "./AuthModal";

export function UserMenu() {
  const { user, loading, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="h-8 w-16 animate-pulse rounded-md bg-muted" />
    );
  }

  if (!user) {
    return (
      <>
        <button
          onClick={() => setShowAuthModal(true)}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
        >
          Sign in
        </button>
        <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </>
    );
  }

  const displayName = user.user_metadata?.full_name
    || user.email?.split("@")[0]
    || "User";

  const initial = (displayName[0] ?? "U").toUpperCase();

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted transition-colors"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {initial}
        </div>
        <span className="hidden sm:inline text-xs font-medium truncate max-w-[120px]">
          {displayName}
        </span>
      </button>

      {showDropdown && (
        <div className="absolute right-0 top-full mt-1 w-48 rounded-md border border-border bg-card shadow-lg py-1 z-50">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-xs font-medium truncate">{displayName}</p>
            <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
          </div>
          <button
            onClick={() => {
              signOut();
              setShowDropdown(false);
            }}
            className="w-full px-3 py-2 text-left text-xs hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
