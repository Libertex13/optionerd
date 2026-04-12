import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card py-8">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} optionerd.com — Free options calculator
          </div>
          <nav className="flex gap-6 text-sm text-muted-foreground">
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
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Options involve risk. This calculator is for educational purposes only and does not constitute financial advice.
        </p>
      </div>
    </footer>
  );
}
