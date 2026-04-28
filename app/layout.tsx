import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { SCHOOL_NAME } from "@/lib/site-config";

export const metadata: Metadata = {
  title: `${SCHOOL_NAME} LINE OA 系統`,
  description: `${SCHOOL_NAME} LINE Official Account 整合系統 — 帳號綁定與推播通知`,
};

import { LiffProvider } from "@/components/liff/LiffProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-TW"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LiffProvider>{children}</LiffProvider>
      </body>
    </html>
  );
}
