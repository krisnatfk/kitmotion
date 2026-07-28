import Link from "next/link";
import { cn } from "@/lib/utils";

export type LogoVariant = "mark" | "wordmark" | "lockup";
export type LogoTone = "dark" | "light";
export type LogoSize = "sm" | "md" | "lg";

const markSize: Record<LogoSize, string> = {
  sm: "h-7 w-8",
  md: "h-8 w-9",
  lg: "h-12 w-[55px]",
};

const wordmarkSize: Record<LogoSize, string> = {
  sm: "text-lg",
  md: "text-[1.35rem]",
  lg: "text-3xl",
};

export function Logo({
  className,
  href = "/",
  variant = "lockup",
  tone = "dark",
  size = "md",
}: {
  className?: string;
  href?: string | null;
  variant?: LogoVariant;
  tone?: LogoTone;
  size?: LogoSize;
}) {
  const showMark = variant !== "wordmark";
  const showWordmark = variant !== "mark";
  const markPath = `/brand/kitmotion-mark-${tone}.png`;

  const brand = (
    <span
      className={cn("inline-flex items-center gap-sm", className)}
      role={href === null && variant === "mark" ? "img" : undefined}
      aria-label={href === null && variant === "mark" ? "KITMOTION" : undefined}
      data-logo-variant={variant}
      data-logo-tone={tone}
    >
      {showMark && (
        <span
          className={cn("shrink-0 bg-contain bg-center bg-no-repeat", markSize[size])}
          style={{ backgroundImage: `url(${markPath})` }}
          aria-hidden="true"
          data-logo-part="mark"
        />
      )}
      {showWordmark && (
        <span
          className={cn(
            "font-display uppercase leading-none tracking-[0.06em]",
            wordmarkSize[size],
            tone === "light" ? "text-white" : "text-sport-black",
          )}
          data-logo-part="wordmark"
        >
          KITMOTION
        </span>
      )}
    </span>
  );

  if (href === null) return brand;
  return (
    <Link href={href} aria-label="KITMOTION beranda" className="inline-flex">
      {brand}
    </Link>
  );
}
