"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function ScrollReveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (prefersReducedMotion || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      setVisible(true);
      observer.disconnect();
    }, { rootMargin: "0px 0px -8%", threshold: 0.08 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn("scroll-reveal", visible && "is-visible", className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
