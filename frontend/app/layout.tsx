import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TradeX | Modern Stock Market & Paper-Trading Platform",
  description:
    "High-performance, institutional-grade paper trading platform foundation inspired by modern fintech usability principles.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#080C14] text-slate-100 font-sans antialiased selection:bg-emerald-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}
