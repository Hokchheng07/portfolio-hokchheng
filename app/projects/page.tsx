import type { Metadata } from "next";
import { PageShell } from "@/components/layout/page-shell";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return (
    <PageShell eyebrow="Selected work" title="Projects">
      <p>Project list coming soon.</p>
    </PageShell>
  );
}
