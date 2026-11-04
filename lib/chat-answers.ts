import { achievements, faq, projects, site, techStack } from "@/lib/site";

export type AnswerLink = { label: string; href: string };

export type PredefinedAnswer = {
  question: string;
  answer: string;
  links?: readonly AnswerLink[];
};

// Button questions answer from here without calling the model, so they are
// instant, exact and still work when Ollama is down. Built from lib/site.ts.
export const predefinedAnswers: readonly PredefinedAnswer[] = [
  {
    question: `How can I contact ${site.name}?`,
    answer: `${site.status} Email ${site.email}, or use the links below.`,
    links: [
      { label: "Email", href: `mailto:${site.email}` },
      { label: "GitHub", href: site.socials.github },
      { label: "Facebook", href: site.socials.facebook },
      { label: "Instagram", href: site.socials.instagram },
    ],
  },
  {
    question: `What does ${site.name} build with?`,
    answer: techStack.map(({ title, items }) => `${title}: ${items.map(({ name }) => name).join(", ")}`).join("\n"),
  },
  {
    question: "Tell me about the projects",
    answer: projects.map(({ title, description }) => `${title}: ${description}`).join("\n\n"),
    links: projects.map(({ title, live }) => ({ label: title, href: live })),
  },
  {
    question: `What awards has ${site.name} won?`,
    answer: achievements
      .filter(({ seal }) => seal)
      .map(({ title, programme, period }) => `${title}: ${programme}, ${period}`)
      .join("\n"),
  },
  ...faq,
];
