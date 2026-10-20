import type { Metadata } from "next";
import { PageShell } from "@/components/layout/page-shell";

export const metadata: Metadata = { title: "CV" };

export default function CvPage() {
  return (
    <PageShell eyebrow="Curriculum vitae" title="CV">
      <p>CV coming soon. Put the PDF at public/cv.pdf and link it here.</p>
    </PageShell>
  );
}
