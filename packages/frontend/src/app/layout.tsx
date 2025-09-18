import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/lib/providers/query-provider";
import { OrganizationProvider } from "@/lib/providers/organization-provider";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "OMSMS - Vehicle Accessory Management",
  description: "Modern SaaS platform for managing vehicle accessory installation workflows",
  keywords: ["vehicle", "accessory", "management", "workflow", "SaaS"],
  authors: [{ name: "OMSMS Team" }],
  creator: "OMSMS",
  metadataBase: new URL("https://omsms.com"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://omsms.com",
    title: "OMSMS - Vehicle Accessory Management",
    description: "Modern SaaS platform for managing vehicle accessory installation workflows",
    siteName: "OMSMS",
  },
  twitter: {
    card: "summary_large_image",
    title: "OMSMS - Vehicle Accessory Management",
    description: "Modern SaaS platform for managing vehicle accessory installation workflows",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          inter.variable,
          jetbrainsMono.variable
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <OrganizationProvider>
              {children}
              <Toaster richColors position="top-right" />
            </OrganizationProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
