import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Header() {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-10 max-w-7xl items-center justify-between px-3">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo-light.svg"
            alt="optionerd"
            width={120}
            height={18}
            className="block dark:hidden"
            priority
          />
          <Image
            src="/logo-dark.svg"
            alt="optionerd"
            width={120}
            height={18}
            className="hidden dark:block"
            priority
          />
        </Link>
        <nav className="flex items-center gap-4 font-mono text-xs text-muted-foreground">
          <Link href="/calculator/long-call" className="hover:text-foreground transition-colors">
            Long Call
          </Link>
          <span className="h-3 w-px bg-border" />
          <Link href="/calculator/long-put" className="hover:text-foreground transition-colors">
            Long Put
          </Link>
          <span className="h-3 w-px bg-border" />
          <Link href="/calculator/covered-call" className="hover:text-foreground transition-colors">
            Covered Call
          </Link>
          <span className="h-3 w-px bg-border" />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
