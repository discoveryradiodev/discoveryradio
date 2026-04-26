"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type RouteChromeProps = {
  children: ReactNode;
};

function isWillardRoute(pathname: string | null): boolean {
  if (!pathname) {
    return false;
  }
  return pathname === "/willard" || pathname.startsWith("/willard/");
}

export default function RouteChrome({ children }: RouteChromeProps) {
  const pathname = usePathname();
  const hidePublicChrome = isWillardRoute(pathname);

  if (hidePublicChrome) {
    return <main>{children}</main>;
  }

  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  );
}
