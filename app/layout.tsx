import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import RouteChrome from "@/components/site/RouteChrome";
import { Inter, Space_Grotesk } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata = {
  title: "Discovery Radio",
  description: "",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="app-root">
        <RouteChrome>{children}</RouteChrome>
        <Analytics />
      </body>
    </html>
  );
}
