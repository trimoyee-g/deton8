import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chain Reaction",
  description: "The classic Chain Reaction board game",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
