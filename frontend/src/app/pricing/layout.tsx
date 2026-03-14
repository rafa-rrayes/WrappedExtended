import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "One-time payment, lifetime access. Upload your Spotify Extended Streaming History and get a comprehensive dashboard.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
