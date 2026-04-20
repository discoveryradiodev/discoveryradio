import type { ReactNode } from "react";
import "./willard.generated.css";
import styles from "./layout.module.css";

export default function FeedLayout({ children }: { children: ReactNode }) {
  return (
    <section className={styles.shell} data-feed-shell="true">
      {children}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/discoveryradio_logo_transparent.png"
        alt=""
        aria-hidden="true"
        className={styles.floatLogo}
      />
    </section>
  );
}