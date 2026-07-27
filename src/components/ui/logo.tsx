import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  href = "/",
}: {
  className?: string;
  href?: string | null;
}) {
  const mark = (
    <span className={cn("inline-flex items-center gap-sm", className)}>
      <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-[10px] bg-white" aria-hidden="true">
        <Image
          src="/brand/kitmotion-mark.png"
          alt=""
          width={32}
          height={28}
          className="h-7 w-8 object-contain"
        />
      </span>
      <span className="font-display text-[1.35rem] uppercase leading-none tracking-[0.06em]">
        KITMOTION
      </span>
    </span>
  );

  if (href === null) return mark;
  return (
    <Link href={href} aria-label="KITMOTION beranda">
      {mark}
    </Link>
  );
}
