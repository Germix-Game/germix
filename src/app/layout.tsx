import type { Metadata } from "next";
import { Fredoka } from "next/font/google";
import "./globals.css";

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Germix — Microbiology Card Game",
  description: "Educational microbiology card game for medical students",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fredoka.className} h-full w-full antialiased`}>
      <body className="min-h-full w-full flex flex-col">{children}</body>
    </html>
  );
}
