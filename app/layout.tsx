import type { Metadata } from "next";
import { DM_Sans, Geist_Mono, Google_Sans } from "next/font/google";
import localFont from "next/font/local";
import { SymbioteBackground } from "@/components/background/symbiote-background";
import { ChatWidget } from "@/components/chat/chat-widget";
import { IntroLoader } from "@/components/layout/intro-loader";
import { Navbar } from "@/components/layout/navbar";
import { themeScript } from "@/components/layout/theme-toggle";
import { site } from "@/lib/site";
import "./globals.css";

// Body and UI text.
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

// Headings, titles and the logo.
const googleSans = Google_Sans({
  variable: "--font-google-sans",
  style: ["normal", "italic"],
  subsets: ["latin"],
});

// Small technical labels: eyebrows, tags, counters.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Achievements kanji and seal. Noto Serif JP (OFL), subset to the few characters
// in lib/site.ts, so it stays a few KB instead of megabytes.
const kanji = localFont({
  variable: "--font-noto-serif-jp",
  src: [
    { path: "./fonts/noto-serif-jp-subset-600.woff2", weight: "600" },
    { path: "./fonts/noto-serif-jp-subset-900.woff2", weight: "900" },
  ],
});

// Link previews use app/opengraph-image.jpg and app/twitter-image.jpg, made in
// Figma ("Hokchheng Portfolio — Open Graph").
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.title, template: `%s — ${site.name}` },
  description: site.description,
  openGraph: {
    type: "website",
    url: "/",
    siteName: site.title,
    title: site.title,
    description: site.description,
  },
  twitter: {
    card: "summary_large_image",
    title: site.title,
    description: site.description,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${googleSans.variable} ${geistMono.variable} ${kanji.variable} h-full antialiased`}
      data-intro="loading"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <Navbar />
        {children}
        <ChatWidget />
        <SymbioteBackground />
        <IntroLoader />
      </body>
    </html>
  );
}
