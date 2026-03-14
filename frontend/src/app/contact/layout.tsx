import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the WrapEx team for questions, feedback, or support.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
