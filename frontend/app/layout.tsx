import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { LayoutWrapper } from "@/components/layout/LayoutWrapper";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  title: "FDT ARENA — Federação de Clubes",
  description: "Plataforma de gestão para clubes e competições de EA SPORTS FC Pro Clubs.",
  icons: {
    icon: [
      { url: '/branding/fdt-arena-brand.png', type: 'image/png' },
    ],
    shortcut: '/branding/fdt-arena-brand.png',
    apple: { url: '/branding/fdt-arena-brand.png', type: 'image/png' },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <ErrorBoundary>
          <Providers>
            <LayoutWrapper>
              {children}
            </LayoutWrapper>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
