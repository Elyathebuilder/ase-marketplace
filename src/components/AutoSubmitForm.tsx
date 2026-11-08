"use client";

/** A GET form that re-submits when a select or checkbox changes. Still works without JavaScript via its button. */
export function AutoSubmitForm({ children, action, className }: { children: React.ReactNode; action: string; className?: string }) {
  return (
    <form
      action={action}
      className={className}
      onChange={(e) => {
        const t = e.target as unknown as HTMLInputElement;
        if (t.type === "number" || t.type === "text" || t.type === "search") return;
        e.currentTarget.requestSubmit();
      }}
    >
      {children}
    </form>
  );
}
