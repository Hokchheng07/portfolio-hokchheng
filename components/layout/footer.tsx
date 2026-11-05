import { FacebookIcon, GithubIcon, InstagramIcon, MailIcon } from "@/components/icons";
import { site } from "@/lib/site";

const links = [
  { label: "GitHub", href: site.socials.github, Icon: GithubIcon },
  { label: "Facebook", href: site.socials.facebook, Icon: FacebookIcon },
  { label: "Instagram", href: site.socials.instagram, Icon: InstagramIcon },
  { label: "Email", href: `mailto:${site.email}`, Icon: MailIcon },
];

export function Footer() {
  return (
    <footer className="relative mx-auto w-full max-w-[1760px] px-6 sm:px-10 xl:px-16">
      {/* The padding keeps the links clear of the chat button in the bottom-right corner. */}
      <div className="flex flex-col gap-6 border-t border-foreground/10 pb-28 pt-8 md:flex-row md:items-center md:justify-between md:pb-10 md:pr-24">
        <p className="text-base text-muted">
          © {site.copyrightYear} {site.fullName}. All rights reserved.
        </p>
        <ul className="flex flex-wrap gap-x-7 gap-y-3">
          {links.map(({ label, href, Icon }) => (
            <li key={label}>
              <a
                href={href}
                target={href.startsWith("mailto:") ? undefined : "_blank"}
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-muted transition-colors duration-200 hover:text-foreground"
              >
                <Icon className="size-4" />
                {label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
