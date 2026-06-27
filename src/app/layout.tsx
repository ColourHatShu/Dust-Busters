import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
const siteName = "Dust Busters";
const description =
  "Book a trusted, ID-verified home cleaner in Courtenay, BC. Watch us match you with a cleaner in real time, pay securely, and pay the balance only when the job is done right.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Dust Busters — Home Cleaning in Courtenay, BC",
    template: "%s · Dust Busters",
  },
  description,
  applicationName: siteName,
  keywords: [
    "home cleaning",
    "house cleaning",
    "Courtenay",
    "Comox Valley",
    "cleaners",
    "Comox",
    "Cumberland",
    "BC",
  ],
  openGraph: {
    type: "website",
    siteName,
    title: "Dust Busters — Home Cleaning in Courtenay, BC",
    description,
    locale: "en_CA",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "Dust Busters — Home Cleaning in Courtenay, BC",
    description,
  },
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
    >
      <body className="min-h-full flex flex-col">
        <Nav />
        <div className="flex flex-1 flex-col">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
