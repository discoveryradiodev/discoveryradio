import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { PreviewOnlyShell } from "@/components/styleLab/PreviewOnlyShell";
import { isStyleLabEnabled } from "@/lib/dev/is-style-lab-enabled";
import { isWillardAuthenticated } from "@/lib/dev/style-lab-auth";
import { normalizeWillardPreviewTarget } from "@/lib/dev/willard-preview-sync";

export const metadata = {
  title: "/willard/preview — Style Lab Preview",
  robots: "noindex, nofollow",
};

type WillardPreviewPageProps = {
  searchParams?: Promise<{
    target?: string;
  }>;
};

export default async function WillardPreviewPage({ searchParams }: WillardPreviewPageProps) {
  if (!isStyleLabEnabled()) {
    notFound();
  }

  const cookieStore = await cookies();
  if (!isWillardAuthenticated(cookieStore)) {
    redirect("/willard");
  }

  const resolvedParams = searchParams ? await searchParams : undefined;
  const target = normalizeWillardPreviewTarget(resolvedParams?.target);

  return (
    <>
      <style>{`
        body:has([data-willard-preview-root="true"]) .nav-wrap,
        body:has([data-willard-preview-root="true"]) .footer-wrap {
          display: none !important;
        }

        body:has([data-willard-preview-root="true"]) {
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden;
          background: #0f1419;
        }

        body:has([data-willard-preview-root="true"]) main {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          max-width: none !important;
          height: 100vh;
        }
      `}</style>
      <PreviewOnlyShell initialTarget={target} />
    </>
  );
}
