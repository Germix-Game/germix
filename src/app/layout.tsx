import type { Metadata, Viewport } from "next";
import { Fredoka } from "next/font/google";
import "./globals.css";
import { NavigationLoader } from "@/components/NavigationLoader";
import { PortraitGuard } from "@/components/PortraitGuard";

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Germix — Microbiology Card Game",
  description: "Educational microbiology card game for medical students",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fredoka.className} h-full w-full antialiased`}>
      <body className="min-h-full w-full flex flex-col">
        <NavigationLoader />
        <PortraitGuard>{children}</PortraitGuard>
      </body>
    </html>
  );
}
