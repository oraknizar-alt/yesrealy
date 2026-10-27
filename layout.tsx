import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YesRealy",
  description: "Block Legends Sohbet",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className="bg-zinc-950 text-white min-h-screen">{children}</body>
    </html>
  );
}
