import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account",
  description:
    "Create a WrapEx account to upload your Spotify Extended Streaming History and generate your listening dashboard.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
