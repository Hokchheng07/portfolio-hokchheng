import Image from "next/image";
import { site } from "@/lib/site";

export function ProfileCard() {
  return (
    <div className="group relative mx-auto w-full max-w-[540px] xl:mr-0 [perspective:1200px]">
      <div className="relative aspect-[4/5] rotate-[1.5deg] overflow-hidden rounded-[28px] bg-gradient-to-b from-neutral-800 via-neutral-900 to-black shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)] ring-1 ring-foreground/10 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-0">
        {/* Top hairline */}
        <div className="absolute inset-x-6 top-6 h-px bg-white/10" />

        {/* Decorative code glyphs */}
        <span
          aria-hidden
          className="absolute left-6 top-14 font-mono text-5xl text-white/10"
        >
          {"</>"}
        </span>
        <span
          aria-hidden
          className="absolute right-6 top-14 font-mono text-6xl text-white/10"
        >
          {"</>"}
        </span>

        {site.photo ? (
          <Image
            src={site.photo}
            alt={`Portrait of ${site.name}`}
            fill
            priority
            sizes="(min-width: 1024px) 540px, 90vw"
            className="object-cover object-top grayscale"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-serif text-[9rem] italic leading-none text-white/15">
              {site.initials}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
