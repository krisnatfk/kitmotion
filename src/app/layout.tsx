import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RegisterSW } from "@/components/pwa/register-sw";

const APP_NAME = "KITMOTION";
const APP_DESCRIPTION =
  "Latihan olahraga panduan visual, analisis pose via kamera, hitung repetisi, skor, dan gamifikasi untuk siswa SMA.";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: "KITMOTION — Latihan olahraga panduan visual",
    template: "%s · KITMOTION",
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
  icons: {
    icon: "/brand/kitmotion-icon-512.png",
    apple: "/brand/kitmotion-icon-512.png",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#111111",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
