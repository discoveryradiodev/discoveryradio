import Script from "next/script";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
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
    <Script id="microsoft-clarity" strategy="afterInteractive">
  {`
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "vtpe3r0ky");
  `}
</Script>
      <body className="app-root">
        <Navbar />
        <main>
          {children}
        </main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
