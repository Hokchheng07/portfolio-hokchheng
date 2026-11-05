// Single source of truth for personal content. Edit here, not in components.

export const site = {
  name: "Hokchheng",
  // Name of the chat assistant in components/chat/.
  assistant: "YengAI",
  fullName: "Hok Chheng",
  initials: "HC",
  title: "Hokchheng — Portfolio",
  // Shown in the footer. A fixed value, since the pages are prerendered.
  copyrightYear: 2026,
  // Deployed address; makes the Open Graph image URL absolute for link previews.
  url: "https://www.hokchheng.site",
  description: "Personal portfolio and CV of Hokchheng.",
  location: "Phnom Penh · Cambodia",
  roles: ["Full-Stack Web Developer", "UI / UX Enthusiast", "Problem Solver"],
  handle: "@hokchheng",
  status: "Available for work!",
  photo: "/images/Me.png" as string | null,
  // The CV PDF and the file name it downloads as, for the hero "Download Resume" button.
  resumeFile: "/cv/Chhun-Hokchheng-CV.pdf",
  resumeFileName: "Chhun-Hokchheng-CV.pdf",
  workUrl: "/#works",
  email: "hokchheng019@gmail.com",
  socials: {
    github: "https://github.com/Hokchheng07",
    facebook: "https://www.facebook.com/hok.chheng.79/",
    instagram: "https://www.instagram.com/isme_chheng/",
  },
} as const;

// About section copy. Edit freely; the details grid takes any number of rows.
export const about = {
  whoAmI:
    "I'm a full-stack web developer from Phnom Penh who enjoys turning ideas into fast, clean and useful products, from the database all the way to the pixels.",
  approach:
    "I care about readable code, solid back ends built with Java and Spring, and interfaces in React and Tailwind that feel simple to use. Small details matter to me.",
  details: [
    { label: "Name", value: site.fullName },
    { label: "Based in", value: "Phnom Penh, Cambodia" },
    { label: "Email", value: site.email },
    { label: "Focus", value: "Full-stack web development" },
    { label: "Education", value: "2nd-year student at ISTAD" },
    { label: "Languages", value: "Khmer, English" },
    { label: "Open to", value: "Internship, part-time, freelance, full-time" },
    { label: "Work setup", value: "Remote or on-site in Phnom Penh" },
  ],
} as const;

// Education timeline, newest first. Descriptions and tags are drafts to edit.
export type EducationEntry = {
  title: string;
  school: string;
  period: string;
  status: "completed" | "in-progress";
  description: string;
  tags: readonly string[];
};

export const education: readonly EducationEntry[] = [
  {
    title: "Bachelor's Degree",
    school: "ISTAD",
    period: "2026 – Present",
    status: "in-progress",
    description:
      "Second-year student, studying software development in depth and building on the foundation and pre-university programmes with larger, real-world projects.",
    tags: ["Software Development", "Java", "Spring", "React"],
  },
  {
    title: "Foundation · 6th Generation",
    school: "ISTAD",
    period: "2026",
    status: "completed",
    description:
      "Covered front-end and back-end fundamentals, from HTML, CSS and React to Java with JDBC and PostgreSQL, practising through hands-on projects.",
    tags: ["HTML & CSS", "JavaScript", "ReactJS", "UX/UI", "Java", "JDBC", "PostgreSQL"],
  },
  {
    title: "Pre-University · 6th Generation",
    school: "ISTAD",
    period: "2026",
    status: "completed",
    description:
      "Focused on web design: layout, interactivity and working with APIs, building pages from scratch.",
    tags: ["HTML + CSS", "JavaScript", "UX/UI", "Postman"],
  },
  {
    title: "High School",
    school: "USA International School",
    period: "2012 – 2024",
    status: "completed",
    description: "Completed primary and secondary education.",
    tags: ["General Education"],
  },
];

// Achievements gallery, one frame per photo, newest programme first. `photo` is a
// path under public/; `alt` describes what the photo shows. `seal` stamps the red
// hanko on the frame, so real awards only. `kanji` is decorative: its characters
// must be in the subset font in app/fonts/, which also holds the alternatives
// 雄弁賞, 演説賞, 同期 and 優等.
export const achievements = [
  {
    title: "Top Student",
    seal: true,
    kanji: "首席",
    programme: "Foundation",
    period: "2026",
    photo: "/education/FoundationPictures/TopStudent.jpeg",
    alt: "Hokchheng holding a framed certificate beside a presenter on a red stage, in front of an ISTAD awards banner and balloons.",
    text: "Recognised as a top student of the Foundation programme and awarded a Certificate of Achievement at the 2025–2026 awards ceremony. The course took me from HTML & CSS, JavaScript and ReactJS to UX/UI design, then on to Java back ends with JDBC and PostgreSQL.",
  },
  {
    title: "Silver Award",
    seal: true,
    kanji: "銀賞",
    programme: "Foundation",
    period: "2026",
    photo: "/education/FoundationPictures/SilverTeam.jpeg",
    alt: "A project team in white uniforms holding a banner that reads Silver Award for Top 2 Project Team.",
    text: "Our team's project won the Silver Award for the top 2 project team at the programme's project competition: the result of weeks spent planning, designing and building it together.",
  },
  {
    title: "My Class",
    seal: false,
    kanji: "学友",
    programme: "Foundation",
    period: "2026",
    photo: "/education/FoundationPictures/Team.jpeg",
    alt: "Classmates in white ISTAD polo shirts posing together in a doorway.",
    text: "The 6th generation: the classmates I learned, debugged and built alongside every day. A lot of what I took from Foundation came from working with them.",
  },
  {
    title: "Bronze Award",
    seal: true,
    kanji: "銅賞",
    programme: "Pre-University",
    period: "2026",
    photo: "/education/PreUniPictures/BronzePreUni.jpg",
    alt: "A project team and staff on a red stage holding a banner that reads Bronze Award for Top 3 Project Team.",
    text: "Our team earned the Bronze Award for the top 3 project team, putting what we learned in HTML and CSS, JavaScript and UX/UI into one finished project.",
  },
  {
    title: "Best Speaking",
    seal: true,
    kanji: "弁論賞",
    programme: "Pre-University",
    period: "2026",
    photo: "/education/PreUniPictures/BestSpeaking.jpg",
    alt: "Hokchheng receiving a framed certificate from a presenter on a red stage at the ISTAD awards ceremony.",
    text: "Recognised for Best Speaking at the Pre-University awards ceremony in April 2026.",
  },
  {
    title: "On Stage",
    seal: false,
    kanji: "登壇",
    programme: "Pre-University",
    period: "2026",
    photo: "/education/PreUniPictures/Speaker.jpeg",
    alt: "Hokchheng speaking into a microphone at the front of a room, facing seated judges, beside a projected slide titled Research.",
    text: "Presenting our team's project and research to the judges and audience, walking them through the problem, our process and what we built.",
  },
] as const;

// Selected Works section. `image` is a screenshot under public/projects/.
export const projects = [
  {
    title: "Visora",
    description:
      "A design platform for event backdrops, posters and presentations, with Khmer elements, countdown timers and ready-made templates.",
    image: "/projects/visora.jpg",
    tags: ["React", "Redux", "Tailwind CSS", "Firebase"],
    live: "https://visora-mauve.vercel.app",
    source: "https://github.com/Hokchheng07/Visora",
  },
  {
    title: "Arom",
    description:
      "A wellness space for a calmer mind: daily plans, mood check-ins, guided meditation and progress you can see over time.",
    image: "/projects/arom.jpg",
    tags: ["Next.js", "TypeScript", "Tailwind CSS", "Motion"],
    live: "https://arom-teal.vercel.app",
    source: "https://github.com/Hokchheng07/Arom",
  },
  {
    title: "Avenor",
    description:
      "A book discovery site for searching stories, following the authors behind them and saving the books worth keeping.",
    image: "/projects/avenor.jpg",
    tags: ["Next.js", "TypeScript", "shadcn/ui", "SWR"],
    live: "https://avenor-woad.vercel.app",
    source: "https://github.com/Hokchheng07/Avenor",
  },
] as const;

export const moreProjectsUrl = "https://github.com/Hokchheng07?tab=repositories";

// Tech Stack section, one row per group. Add an item (and its SVG in
// public/tech/, e.g. from devicon.dev) and the grid makes room for it.
export const techStack = [
  {
    title: "Frontend",
    description: "Languages and frameworks I use to build responsive, interactive interfaces.",
    items: [
      { name: "HTML", icon: "/tech/html5.svg" },
      { name: "CSS", icon: "/tech/css3.svg" },
      { name: "JavaScript", icon: "/tech/javascript.svg" },
      { name: "TypeScript", icon: "/tech/typescript.svg" },
      { name: "React", icon: "/tech/react.svg" },
      { name: "Next.js", icon: "/tech/nextjs.svg" },
      { name: "Redux", icon: "/tech/redux.svg" },
      { name: "Tailwind CSS", icon: "/tech/tailwindcss.svg" },
      { name: "React Hook Form", icon: "/tech/react-hook-form.svg" },
      { name: "Zod", icon: "/tech/zod.svg" },
    ],
  },
  {
    title: "Backend & DevOps",
    description: "The foundations behind the apps: server logic, APIs, data, and the environments they run in.",
    items: [
      { name: "Java", icon: "/tech/java.svg" },
      { name: "C++", icon: "/tech/cplusplus.svg" },
      { name: "Spring", icon: "/tech/spring.svg" },
      { name: "PostgreSQL", icon: "/tech/postgresql.svg" },
      { name: "Firebase", icon: "/tech/firebase.svg" },
      { name: "Linux", icon: "/tech/linux.svg" },
      { name: "Docker", icon: "/tech/docker.svg" },
    ],
  },
  {
    title: "Tools & Design",
    description: "What I use to design, test and ship: from UX/UI mock-ups to API testing.",
    items: [
      { name: "Figma", icon: "/tech/figma.svg" },
      { name: "Postman", icon: "/tech/postman.svg" },
      { name: "Git", icon: "/tech/git.svg" },
    ],
  },
] as const;

// Tiles orbiting the hero rings. Add an entry (and its SVG in public/tech/) to
// add a tile; the rings space them out evenly on their own.
export const stack = [
  { name: "Java", icon: "/tech/java.svg" },
  { name: "Spring", icon: "/tech/spring.svg" },
  { name: "Tailwind CSS", icon: "/tech/tailwindcss.svg" },
  { name: "React", icon: "/tech/react.svg" },
] as const;

// Links with a `section` scroll to that section of the home page and light up
// while it is on screen.
export const navLinks = [
  { label: "Home", href: "/#home", section: "home" },
  { label: "About Me", href: "/#about", section: "about" },
  { label: "Education", href: "/#education", section: "education" },
  { label: "Projects", href: "/#works", section: "works" },
  { label: "Contact", href: "/#contact", section: "contact" },
] as const;

export const navSections = navLinks.flatMap((link) => ("section" in link ? [link.section] : []));

// Facts for the chat assistant that the CV does not cover. Each entry becomes a
// button with this exact answer, and the assistant can use it for typed questions.
// e.g. { question: "Is Hokchheng open to remote work?", answer: "Yes, ..." },
export const faq: readonly { question: string; answer: string }[] = [
  {
    question: `What work is ${site.name} open to?`,
    answer: "Internships, part-time, freelance and full-time roles, either remote or on-site in Phnom Penh.",
  },
  {
    question: `When can ${site.name} start?`,
    answer: `Right away. ${site.name} is a second-year student at ISTAD, so hours are flexible and fit around classes, in the evenings and on weekends.`,
  },
  {
    question: `Does ${site.name} have work experience?`,
    answer: `No professional roles yet. ${site.name}'s experience comes from school projects at ISTAD, which earned Silver and Bronze team awards.`,
  },
  {
    question: `What languages does ${site.name} speak?`,
    answer: "Khmer and English.",
  },
];
