import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import { ThemeProvider } from "@/components/ThemeProvider";
import { TintSync } from "@/components/TintSync";
import { AuthProvider } from "@/hooks/useAuth";
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
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var m=localStorage.getItem('theme')||'light';if(m==='system'){m=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}var t=localStorage.getItem('optionerd-tint-'+m)||(m==='dark'?'teal':'neutral');document.documentElement.dataset.tint=t;}catch(e){document.documentElement.dataset.tint='neutral';}`,
          }}
        />
        <Script
          defer
          src="https://plausible.io/js/pa-XJOIrd8jpB1fS90cMEoWo.js"
          strategy="afterInteractive"
        />
        <Script id="plausible-init" strategy="afterInteractive">
          {`window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};plausible.init()`}
        </Script>
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="light">
          <TintSync />
          <AuthProvider>
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
