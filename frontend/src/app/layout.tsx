import type { Metadata } from "next";
import { DM_Sans, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  display: "swap",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: {
    default: "TenantSense AI — Lease Renewal Prediction Platform",
    template: "%s | TenantSense AI",
  },
  description:
    "AI-powered platform that predicts lease non-renewal 3–6 months in advance, enabling landlords to act early with personalized retention strategies.",
  keywords: ["tenant management", "lease renewal", "AI prediction", "property management", "churn prediction"],
  authors: [{ name: "TenantSense AI Team" }],
  openGraph: {
    title: "TenantSense AI",
    description: "Predict lease non-renewals before they happen.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${dmSans.variable} ${cormorant.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#faf7f2" />
      </head>
      <body className={dmSans.className}>{children}</body>
    </html>
  );
}
