// Single source of truth for personal content. Edit here, not in components.

export const site = {
  name: "Hokchheng",
  fullName: "Hok Chheng",
  initials: "HC",
  title: "Hokchheng — Portfolio",
  description: "Personal portfolio and CV of Hokchheng.",
  location: "Phnom Penh · Cambodia",
  roles: ["Full-Stack Web Developer", "UI / UX Enthusiast", "Problem Solver"],
  handle: "@hokchheng",
  status: "Available for work!",
  // Drop a portrait at public/images/profile.png and set this to "/images/profile.png".
  photo: null as string | null,
  resumeUrl: "/cv",
  email: "keop1484@gmail.com",
  socials: {
    github: "https://github.com/",
    linkedin: "https://www.linkedin.com/",
    instagram: "https://www.instagram.com/",
  },
} as const;

export const navLinks = [
  { label: "Home", href: "/" },
  { label: "Projects", href: "/projects" },
  { label: "About", href: "/about" },
  { label: "CV", href: "/cv" },
] as const;
