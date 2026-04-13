import styles from "./styleLab.module.css";

interface PreviewTarget {
  id: string;
  label: string;
  description: string;
}

const PREVIEW_TARGETS: PreviewTarget[] = [
  {
    id: "feed-homepage",
    label: "Feed Homepage",
    description: "Spotlight card on /the-feed",
  },
  {
    id: "live-spotlight",
    label: "Live Spotlight Page",
    description: "Full article on /the-feed/spotlight/[slug]",
  },
  {
    id: "live-blog",
    label: "Live Blog Page",
    description: "Weekly blog on /the-feed/blog/[slug]",
  },
];

interface PreviewSwitcherProps {
  activeTarget: string;
  onTargetChange: (targetId: string) => void;
}

export function PreviewSwitcher({
  activeTarget,
  onTargetChange,
}: PreviewSwitcherProps) {
  return (
    <div className={styles.previewSwitcher}>
      <label className={styles.switcherLabel}>Preview Target:</label>
      <div className={styles.switcherButtons}>
        {PREVIEW_TARGETS.map((target) => (
          <button
            key={target.id}
            className={`${styles.switcherButton} ${
              activeTarget === target.id ? styles.active : ""
            }`}
            onClick={() => onTargetChange(target.id)}
            title={target.description}
          >
            {target.label}
          </button>
        ))}
      </div>
    </div>
  );
}
