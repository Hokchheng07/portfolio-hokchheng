import type { Metadata } from "next";
import { PageShell } from "@/components/layout/page-shell";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <PageShell eyebrow="Who I am" title="About">
      <p>About section coming soon.</p>
    </PageShell>
  );
}
