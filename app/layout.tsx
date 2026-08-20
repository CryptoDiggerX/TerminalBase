import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["400", "500", "600", "700", "900"],
  style: ["normal", "italic"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "700"],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://base-terminal.vercel.app";

export const metadata: Metadata = {
  title: "Base Terminal | $TBASE Airdrop Registration",
  description: "Register your wallet for the $TBASE airdrop. Allocation is scored by your Neynar Score.",
  other: {
    "fc:miniapp": JSON.stringify({
      version: "1",
      imageUrl: `${APP_URL}/og-image.png`,
      button: {
        title: "Register for $TBASE",
        action: {
          type: "launch_miniapp",
          url: APP_URL,
          name: "Base Terminal",
          splashImageUrl: `${APP_URL}/splash.png`,
          splashBackgroundColor: "#F8F3E8",
        },
      },
    }),
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} ${mono.variable}`}>
      <body className="font-body noise-bg min-h-screen">{children}</body>
    </html>
  );
}
