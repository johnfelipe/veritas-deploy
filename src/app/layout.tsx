import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { ChatWidget } from "@/components/ChatWidget";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Veritas - Claridad y Verdad para la Vida Universitaria",
  description: "Motor de claridad y herramienta de reporte de incidencias para la Universidad de Antioquia - Colombia",
  keywords: ["Universidad de Antioquia", "UdeA", "campus", "servicios universitarios", "reporte de incidencias"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className={inter.className}>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Providers>
          <div id="main-content">
            {children}
          </div>
          <ChatWidget />
        </Providers>
      </body>
    </html>
  );
}
