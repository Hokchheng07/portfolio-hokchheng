import type { Metadata } from "next";
import { DM_Sans, Geist_Mono, Google_Sans } from "next/font/google";
import { SymbioteBackground } from "@/components/background/symbiote-background";
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

export const metadata: Metadata = {
  title: { default: site.title, template: `%s — ${site.name}` },
  description: site.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${googleSans.variable} ${geistMono.variable} h-full antialiased`}
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
        <SymbioteBackground />
        <IntroLoader />
      </body>
    </html>
  );
}
