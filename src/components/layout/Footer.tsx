import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border py-4">
      <div className="mx-auto max-w-7xl px-3">
        <div className="flex flex-col items-center justify-between gap-2 md:flex-row">
          <div className="font-mono text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} optionerd.com
          </div>
          <nav className="flex gap-4 font-mono text-xs text-muted-foreground">
            <Link href="/calculator/long-call" className="hover:text-foreground transition-colors">
              Long Call
            </Link>
            <Link href="/calculator/long-put" className="hover:text-foreground transition-colors">
              Long Put
            </Link>
            <Link href="/calculator/covered-call" className="hover:text-foreground transition-colors">
              Covered Call
            </Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">
              Contact
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link href="/disclaimer" className="hover:text-foreground transition-colors">
              Disclaimer
            </Link>
          </nav>
        </div>
        <p className="mt-2 text-center font-mono text-[10px] text-muted-foreground">
          optionerd is an analytics tool, not investment advice. Options carry significant risk
          and may not be suitable for all investors. Calculations are theoretical and based on
          delayed market data. See{" "}
          <Link href="/disclaimer" className="underline underline-offset-2 hover:text-foreground">
            full disclaimer
          </Link>
          .
        </p>
      </div>
    </footer>
  );
}
