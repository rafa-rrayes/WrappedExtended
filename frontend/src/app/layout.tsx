import type { Metadata } from "next";
import { Syne, Outfit } from "next/font/google";
import { AuthProvider } from "@/lib/context/auth-context";
import { ToastProvider } from "@/lib/context/toast-context";
import { Header } from "@/components/layout/header";
import { MotionProvider } from "@/components/layout/motion-provider";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WrapEx — Spotify Streaming Dashboard",
  description:
    "Upload your Spotify Extended Streaming History and get comprehensive dashboards with visualizations.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${syne.variable} ${outfit.variable}`}>
      <body>
        <AuthProvider>
          <ToastProvider>
            <MotionProvider>
              <Header />
              {children}
            </MotionProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
