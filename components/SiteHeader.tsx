"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SiteHeader() {
  const pathname = usePathname();

  // klantenpagina: geen navigatie naar de rest van de app
  if (pathname?.startsWith("/boeken")) {
    return (
      <header className="topbar customer-theme">
        <span className="logo">
          R<span className="logo-o">o</span>ute<span className="logo-nu">nu</span>
        </span>
        <span className="customer-tag">Fatbike reparatie aan huis</span>
      </header>
    );
  }

  return (
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
  );
}
