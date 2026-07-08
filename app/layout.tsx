import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "RouteNu - Routeplanner",
  description: "Routes plannen, chauffeurs aansturen en omzet bijhouden",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>
        <header className="topbar">
          <Link href="/" className="logo">
            R<span className="logo-o">o</span>ute<span className="logo-nu">nu</span>
          </Link>
          <nav>
            <Link href="/">Overzicht</Link>
            <Link href="/beschikbaarheid">Beschikbaarheid</Link>
            <Link href="/tarieven">Tarieven</Link>
            <Link href="/boeken">Boeken</Link>
            <Link href="/chauffeur">Chauffeur</Link>
            <Link href="/analytics">Analytics</Link>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
