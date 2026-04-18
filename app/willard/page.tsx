import { notFound } from "next/navigation";
import { cookies, headers } from "next/headers";
import { StyleLabShell } from "@/components/styleLab/StyleLabShell";
import { canApplyLocalSourceStyles } from "@/lib/dev/style-lab-apply";
import { isStyleLabEnabled } from "@/lib/dev/is-style-lab-enabled";
import { isWillardAuthenticated } from "@/lib/dev/style-lab-auth";
import styles from "./page.module.css";

export const metadata = {
  title: "/willard — Style Lab",
  robots: "noindex, nofollow",
};

type WillardPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function WillardPage({ searchParams }: WillardPageProps) {
  // Gate the style lab based on environment
  if (!isStyleLabEnabled()) {
    notFound();
  }

  const cookieStore = await cookies();
  const headerStore = await headers();
  const canApplyToSource = canApplyLocalSourceStyles(
    headerStore.get("x-forwarded-host") ?? headerStore.get("host")
  );

  if (!isWillardAuthenticated(cookieStore)) {
    const resolvedSearchParams = searchParams ? await searchParams : undefined;
    const hasError = resolvedSearchParams?.error === "invalid";
    return (
      <main className={styles.gatePage}>
        <section className={styles.gateCard}>
          <h1 className={styles.gateTitle}>Willard Access</h1>
          <p className={styles.gateCopy}>Enter the team password to open the editor.</p>
          <form action="/willard/auth" method="post" className={styles.gateForm}>
            <input type="hidden" name="intent" value="login" />
            <label htmlFor="willard-password" className={styles.gateLabel}>
              Password
            </label>
            <input
              id="willard-password"
              name="password"
              type="password"
              className={styles.gateInput}
              autoComplete="current-password"
              required
            />
            {hasError ? (
              <p className={styles.gateError}>Invalid password. Try again.</p>
            ) : null}
            <button type="submit" className={styles.gateButton}>Enter Willard</button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <>
      <form action="/willard/auth" method="post" className={styles.logoutForm}>
        <input type="hidden" name="intent" value="logout" />
        <button type="submit" className={styles.logoutButton}>Logout</button>
      </form>
      <StyleLabShell canApplyToSource={canApplyToSource} />
    </>
  );
}
