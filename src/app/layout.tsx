import type { Metadata, Viewport } from "next";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ASE — Made in Georgia, direct from manufacturers", template: "%s · ASE" },
  description:
    "Marketplace for products manufactured in Georgia. Buy direct from Georgian manufacturers or source wholesale and custom products for your business.",
};

export const viewport: Viewport = { themeColor: "#faf8f4" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body className="flex min-h-dvh flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 btn btn-dark">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
