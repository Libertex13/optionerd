import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Option Nerd — Free Options Profit Calculator",
    template: "%s | Option Nerd",
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
    siteName: "Option Nerd",
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
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
