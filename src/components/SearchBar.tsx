import { Search } from "lucide-react";
import { getCategories } from "@/lib/catalog";

/** Plain GET form: works without JavaScript and keeps results shareable. */
export function SearchBar({ defaultQuery = "", defaultCategory = "" }: { defaultQuery?: string; defaultCategory?: string }) {
  return (
    <form action="/products" role="search" className="flex w-full items-stretch rounded-full border-2 border-ink bg-surface focus-within:border-red-600">
      <label htmlFor="site-search" className="sr-only">Search products, materials or manufacturers</label>
      <input
        id="site-search"
        name="q"
        defaultValue={defaultQuery}
        placeholder="Search products, materials or manufacturers"
        className="min-w-0 flex-1 rounded-l-full bg-transparent px-4 py-2.5 text-[0.95rem] text-ink placeholder:text-subtle focus:outline-none"
      />
      <label htmlFor="site-search-category" className="sr-only">Category</label>
      <select
        id="site-search-category"
        name="category"
        defaultValue={defaultCategory}
        className="hidden max-w-44 border-l border-line bg-transparent px-3 text-sm text-ink-2 focus:outline-none md:block"
      >
        <option value="">All categories</option>
        {getCategories().map((c) => (
          <option key={c.slug} value={c.slug}>{c.name}</option>
        ))}
      </select>
      <button type="submit" className="m-1 inline-flex items-center gap-2 rounded-full bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 md:px-6">
        <Search className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Search</span>
      </button>
    </form>
  );
}
