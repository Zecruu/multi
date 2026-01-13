import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://multielectricsupply.com"),
  title: {
    default: "MultiElectric Supply - Quality Electrical Supplies",
    template: "%s | MultiElectric Supply",
  },
  description: "Your trusted source for professional-grade electrical supplies. Shop wiring, outlets, panels, lighting, and more.",
  keywords: ["electrical supplies", "wiring", "outlets", "panels", "lighting", "electrical equipment", "professional electrical"],
  authors: [{ name: "MultiElectric Supply" }],
  creator: "MultiElectric Supply",
  publisher: "MultiElectric Supply",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { rel: "mask-icon", url: "/favicon.svg", color: "#1a1a1a" },
    ],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://multielectricsupply.com",
    siteName: "MultiElectric Supply",
    title: "MultiElectric Supply - Quality Electrical Supplies",
    description: "Your trusted source for professional-grade electrical supplies. Shop wiring, outlets, panels, lighting, and more.",
    images: [
      {
        url: "/logo.jpg",
        width: 1200,
        height: 630,
        alt: "MultiElectric Supply Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MultiElectric Supply - Quality Electrical Supplies",
    description: "Your trusted source for professional-grade electrical supplies. Shop wiring, outlets, panels, lighting, and more.",
    images: ["/logo.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
