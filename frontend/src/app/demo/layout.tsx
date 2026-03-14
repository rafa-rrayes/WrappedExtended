import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Demo Dashboard",
  description:
    "Explore a sample WrapEx dashboard to see what your Spotify listening data looks like — top artists, tracks, listening patterns, and more.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
