import type { Metadata } from "next";
import "./globals.css";

const title = "Steven Doris | Career World";
const description =
  "Navigate Steven Doris's engineering portfolio through an illustrative career world with factual project evidence kept separate.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
  },
  twitter: {
    card: "summary",
    title,
    description,
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
