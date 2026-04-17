import Image from "next/image";
import Link from "next/link";
import { Menu } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MobileNav } from "@/components/layout/MobileNav";

export function Header() {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo-light.svg"
            alt="optionerd"
            width={140}
            height={22}
            className="block dark:hidden"
            priority
          />
          <Image
            src="/logo-dark.svg"
            alt="optionerd"
            width={140}
            height={22}
            className="hidden dark:block"
            priority
          />
        </Link>
        <nav className="hidden md:flex items-center gap-5 font-mono text-sm text-muted-foreground">
          <Link href="/calculator/long-call" className="hover:text-foreground transition-colors">
            Long Call
          </Link>
          <span className="h-4 w-px bg-border" />
          <Link href="/calculator/long-put" className="hover:text-foreground transition-colors">
            Long Put
          </Link>
          <span className="h-4 w-px bg-border" />
          <Link href="/calculator/covered-call" className="hover:text-foreground transition-colors">
            Covered Call
          </Link>
          <span className="h-4 w-px bg-border" />
          <ThemeToggle />
        </nav>
        <div className="flex md:hidden items-center gap-3">
          <ThemeToggle />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
