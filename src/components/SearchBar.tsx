import { Search } from "lucide-react";
import { getCategories } from "@/lib/catalog";
import { getDict, href, locCategory, type Lang } from "@/i18n";

/** Plain GET form: works without JavaScript and keeps results shareable. */
export function SearchBar({ lang, id = "site-search", defaultQuery = "", defaultCategory = "" }: { lang: Lang; id?: string; defaultQuery?: string; defaultCategory?: string }) {
  const t = getDict(lang);
  return (
    <form action={href(lang, "/products")} role="search" className="flex w-full items-stretch rounded-full border-2 border-ink bg-surface focus-within:border-red-600">
      <label htmlFor={id} className="sr-only">{t.search.label}</label>
      <input
        id={id}
        name="q"
        defaultValue={defaultQuery}
        placeholder={t.search.placeholder}
        className="min-w-0 flex-1 rounded-l-full bg-transparent px-4 py-2.5 text-[0.95rem] text-ink placeholder:text-subtle focus:outline-none"
      />
      <label htmlFor={`${id}-category`} className="sr-only">{t.search.category}</label>
      <select
        id={`${id}-category`}
        name="category"
        defaultValue={defaultCategory}
        className="hidden max-w-44 border-l border-line bg-transparent px-3 text-sm text-ink-2 focus:outline-none md:block"
      >
        <option value="">{t.search.allCategories}</option>
        {getCategories().map((c) => (
          <option key={c.slug} value={c.slug}>{locCategory(c, lang).name}</option>
        ))}
      </select>
      <button type="submit" className="m-1 inline-flex items-center gap-2 rounded-full bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 md:px-6">
        <Search className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">{t.search.button}</span>
      </button>
    </form>
  );
}
