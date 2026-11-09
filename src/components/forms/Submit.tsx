"use client";

import { useFormStatus } from "react-dom";

/** Submit button that shows it's working and can't be pressed twice. */
export function Submit({ children, busy, className = "btn btn-primary", name, value }: { children: React.ReactNode; busy?: string; className?: string; name?: string; value?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending} name={name} value={value}>
      {pending && busy ? busy : children}
    </button>
  );
}
