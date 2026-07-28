"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, type ButtonVariant } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { logoutAction } from "./actions";

export function SignOutButton({
  variant = "secondary",
  className,
  containerClassName,
  onSignedOut,
}: {
  variant?: ButtonVariant;
  className?: string;
  containerClassName?: string;
  onSignedOut?: () => void;
} = {}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSignOut() {
    setError(null);
    startTransition(async () => {
      const result = await logoutAction();
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.redirectTo) {
        onSignedOut?.();
        router.push(result.redirectTo);
        router.refresh();
      }
    });
  }

  return (
    <div className={containerClassName}>
      <Button
        variant={variant}
        className={cn(className)}
        onClick={handleSignOut}
        disabled={pending}
        aria-disabled={pending}
      >
        {pending ? "Keluar…" : "Keluar"}
      </Button>
      {error && <p className="mt-xs text-caption-sm text-danger">{error}</p>}
    </div>
  );
}
