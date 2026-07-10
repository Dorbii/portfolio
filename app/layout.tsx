import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Steven Doris — Systems for controlled work",
  description:
    "Evidence-backed full-stack platform engineering across workflows, data systems, and agent-facing tooling.",
  openGraph: {
    title: "Steven Doris — Systems for controlled work",
    description:
      "Evidence-backed full-stack platform engineering across workflows, data systems, and agent-facing tooling.",
    images: [{ url: "/og.png", width: 1731, height: 909, alt: "Abstract cyan, lime, and coral evidence fields on a dark background" }],
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
