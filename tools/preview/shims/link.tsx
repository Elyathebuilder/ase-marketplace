import type { AnchorHTMLAttributes } from "react";

declare const __ASE_FILES__: string[];
const FILES = new Set(__ASE_FILES__);

/** Same file naming as the crawler: /products/x?mode=retail → products--x__mode-retail.html */
export function toFile(href: string): string {
  if (!href.startsWith("/")) return href;
  const [beforeHash, hash] = href.split("#");
  const [path, query] = beforeHash.split("?");
  const base = path.replace(/^\/+|\/+$/g, "").replace(/\//g, "--") || "home";
  const clean = (s: string) => s.replace(/[^A-Za-z0-9_.-]/g, "-");
  let name = clean(base) + ".html";
  if (query) {
    const withQuery = clean(base + "__" + [...new URLSearchParams(query)].map(([k, v]) => `${k}-${v}`).join("_")) + ".html";
    // A pre-built filtered page if there is one; otherwise keep the query for the page's own script.
    name = FILES.has(withQuery) ? withQuery : `${name}?${query}`;
  }
  return name + (hash ? `#${hash}` : "");
}

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; prefetch?: unknown; replace?: unknown; scroll?: unknown };

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Next-only props are dropped on purpose
export default function Link({ href, prefetch: _p, replace: _r, scroll: _s, ...rest }: Props) {
  return <a href={toFile(String(href))} {...rest} />;
}
