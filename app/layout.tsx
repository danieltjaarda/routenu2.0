import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "RouteNu - Routeplanner",
  description: "Routes plannen, chauffeurs aansturen en omzet bijhouden",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>
        <SiteHeader />
        <main>{children}</main>
      </body>
    </html>
  );
}
