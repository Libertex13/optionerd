import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/auth/UserMenu";
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
          <Link href="/strategies" className="hover:text-foreground transition-colors">
            Strategies
          </Link>
          <span className="h-4 w-px bg-border" />
          <Link href="/calculator/iron-condor" className="hover:text-foreground transition-colors">
            Iron Condor
          </Link>
          <span className="h-4 w-px bg-border" />
          <Link href="/calculator/bull-call-spread" className="hover:text-foreground transition-colors">
            Spreads
          </Link>
          <span className="h-4 w-px bg-border" />
          <Link href="/calculator/covered-call" className="hover:text-foreground transition-colors">
            Covered Call
          </Link>
          <span className="h-4 w-px bg-border" />
          <Link href="/pricing" className="hover:text-foreground transition-colors">
            Pricing
          </Link>
          <span className="h-4 w-px bg-border" />
          <ThemeToggle />
          <span className="h-4 w-px bg-border" />
          <UserMenu />
        </nav>
        <div className="flex md:hidden items-center gap-3">
          <UserMenu />
          <ThemeToggle />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
