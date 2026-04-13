import type { SocialLink } from "@/types/feed";
import styles from "./feed.module.css";

type Props = {
  links: SocialLink[];
};

export default function SocialLinksCard({ links }: Props) {
  return (
    <section className={`${styles.card} ${styles.socialCard}`}>
      <h3 data-style-target="socials-title">Social Handles</h3>
      <ul className={styles.socialList} data-style-target="socials-links">
        {links.map((link) => (
          <li key={link.href}>
            <a href={link.href} target="_blank" rel="noreferrer">
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
