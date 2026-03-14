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
  title: {
    default: "WrapEx — Your Spotify Listening History, Visualized",
    template: "%s | WrapEx",
  },
  description:
    "Upload your Spotify Extended Streaming History and get comprehensive dashboards with detailed visualizations of your listening habits.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://wrapex.app"),
  openGraph: {
    type: "website",
    siteName: "WrapEx",
    title: "WrapEx — Your Spotify Listening History, Visualized",
    description:
      "Upload your Spotify Extended Streaming History and get comprehensive dashboards with detailed visualizations of your listening habits.",
  },
  twitter: {
    card: "summary_large_image",
  },
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
