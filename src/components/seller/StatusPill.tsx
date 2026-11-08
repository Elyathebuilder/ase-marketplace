const TONES = {
  red: "bg-red-50 text-red-700 ring-red-200",
  amber: "bg-warn-50 text-warn ring-[#ecd9ad]",
  blue: "bg-[#eaf0f7] text-[#24476b] ring-[#cbd9e8]",
  green: "bg-ok-50 text-ok ring-[#c4e0cf]",
  grey: "bg-paper-2 text-muted ring-line",
} as const;

export function StatusPill({ label, tone }: { label: string; tone: keyof typeof TONES }) {
  return <span className={`chip whitespace-nowrap ring-1 ring-inset ${TONES[tone]}`}>{label}</span>;
}
