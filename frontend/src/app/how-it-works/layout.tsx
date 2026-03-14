import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "Learn how to request your Spotify Extended Streaming History, download the export, and upload it to WrapEx for a full listening dashboard.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
