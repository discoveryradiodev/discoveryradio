import type { SocialLink } from "@/types/feed";

type Props = {
  links: SocialLink[];
};

export default function SocialLinksCard({ links }: Props) {
  return (
    <section>
      <h3>Social Handles</h3>
      <ul>
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
