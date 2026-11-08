import { getDict, type Lang } from "@/i18n";

export function DemoNotice({ lang }: { lang: Lang }) {
  const t = getDict(lang);
  return (
    <div className="bg-ink text-center text-xs text-white/85">
      <p className="container-page py-1.5">
        <span className="font-semibold text-white">{t.demo.banner}</span> · {t.demo.text}
      </p>
    </div>
  );
}
