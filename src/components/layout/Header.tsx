import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight">
            option<span className="text-primary">nerd</span>
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/calculator/long-call" className="hover:text-foreground transition-colors">
            Long Call
          </Link>
          <Link href="/calculator/long-put" className="hover:text-foreground transition-colors">
            Long Put
          </Link>
          <Link href="/calculator/covered-call" className="hover:text-foreground transition-colors">
            Covered Call
          </Link>
        </nav>
      </div>
    </header>
  );
}
