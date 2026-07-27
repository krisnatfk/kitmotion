"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { logoutAction } from "./actions";

export function SignOutButton() {
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
        router.push(result.redirectTo);
        router.refresh();
      }
    });
  }

  return (
    <div>
      <Button
        variant="secondary"
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
