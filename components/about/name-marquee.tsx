import { site } from "@/lib/site";
import "./name-marquee.css";

const rows = [
  { text: `Hello I'm ${site.name}`, reverse: false },
  { text: site.roles[0], reverse: true },
];

// Two oversized, faint rows drifting in opposite directions.
export function NameMarquee() {
  return (
    <div aria-hidden className="mt-28 select-none overflow-hidden sm:mt-36">
      {rows.map(({ text, reverse }) => (
        <div key={text} className="marquee-row flex w-max" data-reverse={reverse || undefined}>
          {/* Two identical halves, so shifting by -50% loops seamlessly. */}
          {[0, 1].map((half) => (
            <span key={half} className="flex shrink-0">
              {Array.from({ length: 4 }, (_, n) => (
                <span
                  key={n}
                  className="whitespace-nowrap pr-[0.5em] text-[clamp(3.5rem,9vw,8rem)] font-bold leading-[1.05] tracking-[-0.04em] text-foreground/[0.06]"
                >
                  {text}
                </span>
              ))}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
