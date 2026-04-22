import styles from "./page.module.css";

export default function ContactPage() {
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.moduleCard}>
          <h2 className={styles.heading}>Enter for a chance to be interviewed!</h2>
          <p className={styles.intro}>
            Want to be interviewed? Featured on "The Feed"? Fill out the form and we'll be in touch! 
          </p>
          <p className={`${styles.intro} ${styles.punchy}`}>
            Every Artist goes through the same process, no matter how big or small.
          </p>
          <p className={styles.intro}>
            This form helps us understand your music and how we can best support you. We look forward to hearing from you!
          </p>
          <p className={styles.values}>Submitting does not guarantee placement.</p>
          <div className={styles.ctaRow}>
            <a href="/submit" className={styles.cta}>
              Submit your work
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
