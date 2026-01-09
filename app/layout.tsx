import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ErrorHandler } from "@/components/ErrorHandler";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { QueryProvider } from "@/lib/providers/QueryProvider";
import { ThemeProvider } from "next-themes";
import { GlobalBodyFix } from "@/components/GlobalBodyFix";
import { Toaster } from "@/components/ui/sonner";
import { SettingsProvider } from "@/context/SettingsContext";
import { BranchProviderV2 } from "@/lib/context/BranchContextV2";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "POS System",
  description: "Point of Sale System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <GlobalBodyFix />
        <ErrorBoundary>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
            <QueryProvider>
              <BranchProviderV2>
                <SettingsProvider>
                  <ErrorHandler />
                  {children}
                  <Toaster position="top-right" richColors closeButton />
                </SettingsProvider>
              </BranchProviderV2>
            </QueryProvider>
          </ThemeProvider>
        </ErrorBoundary>
        
        {/* Global script to hide icons on input focus/value */}
        <Script
          src="/hide-icons-on-input.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
