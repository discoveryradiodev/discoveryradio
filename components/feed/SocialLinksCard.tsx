import type { SocialLink } from "@/types/feed";
import { SiGmail, SiInstagram, SiTiktok, SiYoutube } from "react-icons/si";
import styles from "./feed.module.css";

type Props = {
  links: SocialLink[];
};

export default function SocialLinksCard({ links }: Props) {
  const iconByLabel: Record<string, React.ComponentType<{ className?: string }>> = {
    instagram: SiInstagram,
    tiktok: SiTiktok,
    youtube: SiYoutube,
    gmail: SiGmail,
  };

  const labelByKey: Record<string, string> = {
    instagram: "Follow us on Instagram",
    tiktok: "Catch us on TikTok",
    youtube: "Watch the full interviews",
    gmail: "Get in touch",
  };

  return (
    <section className={`${styles.card} ${styles.socialCard}`}>
      <h3 data-style-target="socials-title">Social Handles</h3>
      <ul className={styles.socialList} data-style-target="socials-links">
        {links.map((link) => {
          const key = link.label.toLowerCase();
          const Icon = iconByLabel[key];
          const label = labelByKey[key] ?? link.label;
          if (!Icon) return null;

          return (
            <li key={link.href}>
              <a
                href={link.href}
                target={link.href.startsWith("mailto:") ? undefined : "_blank"}
                rel={link.href.startsWith("mailto:") ? undefined : "noreferrer"}
                className={styles.socialItem}
              >
                <Icon className={styles.socialIcon} aria-hidden="true" />
                <span className={styles.socialLabel}>{label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
