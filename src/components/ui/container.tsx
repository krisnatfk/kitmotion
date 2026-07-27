import { cn } from "@/lib/utils";

/** Page container: max 1440px content area with growing edge gutters (design.md). */
export function Container({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[1440px] px-lg tablet-narrow:px-xl desktop-large:px-section",
        className,
      )}
    >
      {children}
    </div>
  );
}
