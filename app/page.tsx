import { Hero } from "@/components/hero/hero";

export default function Home() {
  return (
    <main className="flex-1">
      <Hero />
      {/* Next sections (featured projects, skills, etc.) go here. */}
      <section className="min-h-[50vh] bg-ink" />
    </main>
  );
}
