import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "optioNerd — Free Options Profit Calculator",
    template: "%s | optioNerd",
  },
  description:
    "Free options profit calculator with payoff diagrams, Greeks, and strategy analysis. Calculate options P&L for calls, puts, spreads, iron condors, and more.",
  keywords: [
    "options calculator",
    "options profit calculator",
    "option payoff diagram",
    "options greeks calculator",
    "covered call calculator",
    "options strategy calculator",
  ],
  metadataBase: new URL("https://optionerd.com"),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "optioNerd",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
