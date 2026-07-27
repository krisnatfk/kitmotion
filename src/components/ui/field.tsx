"use client";

import { forwardRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icons";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn("input-pill", className)} {...props} />;
});

export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputProps, "type">>(function PasswordInput(
  { className, ...props },
  ref,
) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input ref={ref} type={visible ? "text" : "password"} className={cn("input-pill pr-12", className)} {...props} />
      <button type="button" onClick={() => setVisible((value) => !value)} className="absolute inset-y-0 right-sm grid w-10 place-items-center text-mute hover:text-ink" aria-label={visible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}>
        <Icon name="eye" className="h-5 w-5" />
      </button>
    </div>
  );
});

export function Label({
  htmlFor,
  children,
  className,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("block text-caption-md text-charcoal mb-xs", className)}
    >
      {children}
    </label>
  );
}

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p className="mt-xs text-caption-sm text-danger" role="alert">
      {children}
    </p>
  );
}

export function FormError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <div
      className="rounded-md border border-hairline bg-soft-cloud px-lg py-md text-caption-md text-danger"
      role="alert"
    >
      {children}
    </div>
  );
}

export function FormSuccess({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <div
      className="rounded-md border border-hairline bg-soft-cloud px-lg py-md text-caption-md text-success"
      role="status"
    >
      {children}
    </div>
  );
}
