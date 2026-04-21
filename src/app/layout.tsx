import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AppSidebar } from "@/components/app-sidebar";
import { ShortcutsProvider } from "@/components/shortcuts-provider";
import { OfflineBanner, PWAUpdateWatcher } from "@/components/pwa-ui";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Beatcraft",
  description: "A writing planner that knows your format and methodology.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Beatcraft",
  },
  icons: {
    apple: "/apple-touch-icon.png",
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex h-full flex-col overflow-hidden">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <TooltipProvider>
            <ShortcutsProvider>
              <OfflineBanner />
              <div className="flex flex-1 overflow-hidden">
                <AppSidebar />
                <main id="main-content" className="flex-1 overflow-y-auto" tabIndex={-1}>
                  {children}
                </main>
              </div>
              <Toaster richColors />
              <PWAUpdateWatcher />
            </ShortcutsProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
