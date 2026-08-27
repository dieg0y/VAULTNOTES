import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "VaultNotes - Tu segundo cerebro de ciberseguridad",
  description:
    "Vault local y offline para estudiar ciberseguridad: apuntes con editor rico, labs SOC/IAM, glosario con flashcards y backups ZIP.",
  keywords: ["ciberseguridad", "SOC", "IAM", "apuntes", "glosario", "labs", "offline", "VaultNotes"],
  authors: [{ name: "dieg0y" }],
  manifest: "/manifest.webmanifest",
  applicationName: "VaultNotes",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VaultNotes",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      // SECURITY (Task 2-b): removed the external CDN icon URL
      // (https://z-cdn.chatglm.cn/z-ai/static/logo.svg). Next.js renders
      // every entry in this array as a <link rel="icon" href="…"> in the
      // HTML head, which the browser fetches automatically on every page
      // load. That is an AUTO external network call that violates the
      // offline-first guarantee (spec #38). The local /icon.svg already
      // covers the favicon use-case with zero network calls. Users who
      // want the platform logo can add it back explicitly in Settings.
    ],
    apple: "/icon.svg",
  },
  openGraph: {
    title: "VaultNotes",
    description: "Segundo cerebro local y offline para ciberseguridad",
    siteName: "VaultNotes",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
      </body>
    </html>
  );
}
