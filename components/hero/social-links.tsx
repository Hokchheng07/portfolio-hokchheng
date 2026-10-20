import { GithubIcon, InstagramIcon, LinkedinIcon, MailIcon } from "@/components/icons";
import { site } from "@/lib/site";

const links = [
  { label: "GitHub", href: site.socials.github, Icon: GithubIcon },
  { label: "LinkedIn", href: site.socials.linkedin, Icon: LinkedinIcon },
  { label: "Instagram", href: site.socials.instagram, Icon: InstagramIcon },
  { label: "Email", href: `mailto:${site.email}`, Icon: MailIcon },
];

export function SocialLinks() {
  return (
    <ul className="flex items-center gap-5">
      {links.map(({ label, href, Icon }) => (
        <li key={label}>
          <a
            href={href}
            aria-label={label}
            target={href.startsWith("mailto:") ? undefined : "_blank"}
            rel="noopener noreferrer"
            className="block text-muted transition-colors hover:text-foreground"
          >
            <Icon className="size-[19px]" />
          </a>
        </li>
      ))}
    </ul>
  );
}
