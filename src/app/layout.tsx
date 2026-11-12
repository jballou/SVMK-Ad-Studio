import type { Metadata } from "next";
import { AppShell } from "@/components/shell/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ad Studio",
  description: "Remix, preview, track and score paid ads from Figma templates and a copy deck.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        {/* National 2, the same face and files as Brand Creative Hub (declared in globals.css). */}
        <link rel="preload" as="font" type="font/woff2" crossOrigin="anonymous" href="https://prod.smassets.net/assets/static/fonts/national2/regular.woff2" />
        <link rel="preload" as="font" type="font/woff2" crossOrigin="anonymous" href="https://prod.smassets.net/assets/static/fonts/national2/bold.woff2" />
      </head>
      <body className="min-h-full"><AppShell>{children}</AppShell></body>
    </html>
  );
}
