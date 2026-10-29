import { AboutSection } from "@/components/about/about-section";
import { EducationSection } from "@/components/education/education-section";
import { Hero } from "@/components/hero/hero";
import { StackSection } from "@/components/stack/stack-section";
import { WorksSection } from "@/components/works/works-section";

export default function Home() {
  return (
    <main className="flex-1">
      <Hero />
      <AboutSection />
      <EducationSection />
      <StackSection />
      <WorksSection />
      {/* Next sections (projects, contact, etc.) go here. */}
    </main>
  );
}
