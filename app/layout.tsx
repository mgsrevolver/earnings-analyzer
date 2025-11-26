import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Earnings Analyzer - Retail Investor Intelligence",
  description: "Synthesize and analyze earnings reports to spot macro trends across tech, biotech, and high-volatility companies",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
