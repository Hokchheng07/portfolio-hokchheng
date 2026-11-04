import Image from "next/image";

/*
 * YengAI's profile picture. The PNG has a transparent backdrop, so bg-accent shows
 * through and blends into the accent launcher in both themes. Next.js must not
 * re-encode it, because resampling would blur the pixel art.
 */
export function BotAvatar({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/images/yengai.png"
      alt=""
      width={200}
      height={200}
      unoptimized
      className={`bg-accent ${className}`}
    />
  );
}
