import type { Metadata, Viewport } from "next";
import { Fraunces, Noto_Serif_SC, Noto_Sans_SC } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import Navigation from "./components/Navigation";
import RabbitHoleTransition from "./components/RabbitHoleTransition";
import AuthGateProvider from "./components/AuthGateProvider";
import { LanguageProvider } from "./i18n";

const fraunces = Fraunces({ subsets: ["latin"], axes: ["SOFT", "opsz"], style: ["normal", "italic"], variable: "--font-fraunces", display: "swap" });
const serifSC = Noto_Serif_SC({ weight: ["500", "700"], subsets: ["latin"], variable: "--font-noto-serif-sc", preload: false, display: "swap" });
const sansSC = Noto_Sans_SC({ weight: ["400", "500", "700"], subsets: ["latin"], variable: "--font-noto-sans-sc", preload: false, display: "swap" });

export const metadata: Metadata = {
  title: "C-arot | AI 塔罗与星盘",
  description: "探索塔罗与星盘的奥秘,踏入奇境兔子洞",
};

export const viewport: Viewport = { themeColor: "#0b0a09" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={`h-full ${fraunces.variable} ${serifSC.variable} ${sansSC.variable}`}>
      <body className="min-h-full flex flex-col">
        <LanguageProvider>
        <AuthGateProvider>
        <Suspense fallback={<div className="h-16" />}>
          <Navigation />
        </Suspense>
        <main className="flex-1">{children}</main>
        <Suspense fallback={null}><RabbitHoleTransition /></Suspense>
        </AuthGateProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
