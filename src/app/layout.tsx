import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { RegisterSW } from "@/components/pwa/register-sw";

const APP_NAME = "KITMOTION";
const APP_DESCRIPTION =
  "Latihan olahraga panduan visual, analisis pose via kamera, hitung repetisi, skor, dan gamifikasi untuk siswa SMA.";

/**
 * Bitdefender's browser extension adds `bis_skin_checked` to arbitrary DOM
 * elements before React hydrates them. Remove only that non-standard attribute
 * until hydration has had time to finish; application-owned attributes remain
 * untouched. The observer disconnects automatically and never runs forever.
 */
const EXTENSION_HYDRATION_GUARD = `
(() => {
  const attribute = "bis_skin_checked";
  const clean = (root) => {
    if (root instanceof Element && root.hasAttribute(attribute)) {
      root.removeAttribute(attribute);
    }
    root.querySelectorAll?.("[" + attribute + "]").forEach((element) => {
      element.removeAttribute(attribute);
    });
  };

  clean(document);

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === "attributes") {
        record.target.removeAttribute?.(attribute);
        continue;
      }
      record.addedNodes.forEach(clean);
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [attribute],
    childList: true,
    subtree: true,
  });

  window.addEventListener("load", () => {
    window.setTimeout(() => observer.disconnect(), 3000);
  }, { once: true });
})();
`;

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
        <Script id="extension-hydration-guard" strategy="beforeInteractive">
          {EXTENSION_HYDRATION_GUARD}
        </Script>
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
