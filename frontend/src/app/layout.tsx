import type { Metadata, Viewport } from "next";
import { Red_Hat_Display } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const display = Red_Hat_Display({
  variable: "--font-display",
  subsets: ["latin"],
});

// DSEG by keshikan, SIL Open Font License 1.1 (see src/fonts/DSEG-LICENSE.txt).
const dseg7 = localFont({
  src: "../fonts/DSEG7Classic-Bold.woff2",
  variable: "--font-dseg7",
  display: "swap",
});
const dseg14 = localFont({
  src: "../fonts/DSEG14Classic-Regular.woff2",
  variable: "--font-dseg14",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Song Detector",
  description: "Tap listen and a CNN identifies which of 10 songs is playing.",
  appleWebApp: { capable: true, title: "Song Detector", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#ebebeb",
  viewportFit: "cover", // lets the page use the safe-area insets around the iPhone notch
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${dseg7.variable} ${dseg14.variable} antialiased`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
