import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BullRun | Modern Indian Stock Market & Paper-Trading Platform",
  description:
    "Institutional-grade Indian stock market discovery and simulated paper trading platform inspired by modern fintech usability principles.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-[#FFFFFF] text-[#111827] font-sans antialiased selection:bg-[#F97316]/20 selection:text-[#111827]">
        {children}
      </body>
    </html>
  );
}

