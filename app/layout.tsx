import type { Metadata } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host")
    ?? requestHeaders.get("host")
    ?? "localhost";
  const protocol = requestHeaders.get("x-forwarded-proto")
    ?? (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");
  const origin = `${protocol}://${host}`;

  return {
    title: "Career World · Steven Doris",
    description:
      "An explorable illustrated career world built on one continuous world plane.",
    openGraph: {
      title: "Career World · Steven Doris",
      description:
        "An explorable illustrated career world built on one continuous world plane.",
      type: "website",
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

