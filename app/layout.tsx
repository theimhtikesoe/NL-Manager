import type { Metadata } from "next";
import { LayoutClient } from "./layout-client";
import "./globals.css";

export const metadata: Metadata = {
  title: "NL Manager",
  description: "Workforce and Machine Management Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-zinc-950 text-zinc-100 antialiased">
        <LayoutClient>{children}</LayoutClient>
      </body>
    </html>
  );
}
