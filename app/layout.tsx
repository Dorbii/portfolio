import type { Metadata } from "next";
import "./globals.css";

const title = "Steven Doris | Engineering Evidence Atlas";
const description =
  "Trace Steven Doris's platform, full-stack, and agent-system work through claims, implementation decisions, measured outcomes, and explicit evidence boundaries.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    images: [
      {
        url: "/og.png",
        width: 1731,
        height: 909,
        alt: "Cyan, lime, coral, and violet evidence fields on a dark graph",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og.png"],
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
