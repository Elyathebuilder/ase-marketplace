/** Small form building blocks with labels and hints wired up for screen readers. */
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

interface Common {
  label: string;
  hint?: ReactNode;
  className?: string;
}

export function Field({ label, hint, className, id, ...input }: Common & InputHTMLAttributes<HTMLInputElement> & { id: string }) {
  return (
    <div className={className}>
      <label className="label" htmlFor={id}>
        {label}
        {input.required === false || !input.required ? null : <span className="sr-only"> (required)</span>}
      </label>
      <input id={id} className="input" aria-describedby={hint ? `${id}-hint` : undefined} {...input} />
      {hint && <p id={`${id}-hint`} className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function TextArea({ label, hint, className, id, ...input }: Common & TextareaHTMLAttributes<HTMLTextAreaElement> & { id: string }) {
  return (
    <div className={className}>
      <label className="label" htmlFor={id}>{label}</label>
      <textarea id={id} className="input" rows={4} aria-describedby={hint ? `${id}-hint` : undefined} {...input} />
      {hint && <p id={`${id}-hint`} className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Select({ label, hint, className, id, children, ...input }: Common & SelectHTMLAttributes<HTMLSelectElement> & { id: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label className="label" htmlFor={id}>{label}</label>
      <select id={id} className="input" aria-describedby={hint ? `${id}-hint` : undefined} {...input}>
        {children}
      </select>
      {hint && <p id={`${id}-hint`} className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Hidden({ values }: { values: Record<string, string | number | null | undefined> }) {
  return (
    <>
      {Object.entries(values).map(([k, v]) => (v == null ? null : <input key={k} type="hidden" name={k} value={String(v)} />))}
    </>
  );
}
