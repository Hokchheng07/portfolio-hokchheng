"use client";

import { type FormEvent, useState } from "react";
import { ArrowRightIcon } from "@/components/icons";
import { site } from "@/lib/site";

const field =
  "w-full border border-foreground/10 bg-background px-7 text-xl text-foreground outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-muted/80 focus:border-foreground/40 focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--foreground)_6%,transparent)]";
const label = "font-mono text-sm uppercase tracking-[0.25em] text-muted";

/*
 * No server needed: sending opens the visitor's email app with the message
 * already written to site.email. Swap handleSubmit for a form service
 * (Formspree, Resend, ...) later to send straight from the page.
 */
export function ContactForm() {
  const [sent, setSent] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    const subject = `Portfolio message from ${name}`;
    const body = `${message}\n\n${name}\n${email}`;
    window.location.href = `mailto:${site.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-8">
      <label className="grid gap-3">
        <span className={label}>Full name</span>
        <input
          name="name"
          required
          autoComplete="name"
          placeholder="Your name"
          className={`${field} h-[72px] rounded-full`}
        />
      </label>
      <label className="grid gap-3">
        <span className={label}>Email address</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="your@email.com"
          className={`${field} h-[72px] rounded-full`}
        />
      </label>
      <label className="grid gap-3">
        <span className={label}>Message</span>
        <textarea
          name="message"
          required
          rows={7}
          placeholder="What are you working on?"
          className={`${field} resize-y rounded-[32px] py-6`}
        />
      </label>

      <button
        type="submit"
        className="group mt-2 inline-flex h-[72px] w-full items-center justify-center gap-3 rounded-full bg-accent font-sans text-lg font-semibold tracking-[0.01em] text-on-accent sm:text-xl transition-transform duration-150 ease-out active:scale-[0.98]"
      >
        Send message
        <ArrowRightIcon className="size-5 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
      </button>

      <p aria-live="polite" className="-mt-4 min-h-6 text-center text-base text-muted">
        {sent ? "Your email app should open with the message ready to send." : ""}
      </p>
    </form>
  );
}
