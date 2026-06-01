import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PrefixMigrationGate } from "@/components/PrefixMigrationGate";
import { SrsMigrationGate } from "@/components/SrsMigrationGate";
import { NotesObsidianSyncGate } from "@/components/NotesObsidianSyncGate";
import { CloudSyncGate } from "@/components/CloudSyncGate";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Patterns",
  description: "Interactive algorithm & system design pattern visualizer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#13131a]">
        <PrefixMigrationGate />
        <SrsMigrationGate />
        <NotesObsidianSyncGate />
        <CloudSyncGate />
        {children}
      </body>
    </html>
  );
}
