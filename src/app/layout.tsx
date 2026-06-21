import "./globals.css";
import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "SysCraft - System Design Learning Platform",
  description: "Interactive system design simulator and learning platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable} scroll-smooth`}>
      <body className="min-h-screen bg-canvas text-ink antialiased font-sans">
        {children}
      </body>
    </html>
  );
}