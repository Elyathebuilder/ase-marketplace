import Link from "next/link";
import { href, type Lang } from "@/i18n";
import { B_PATH, LETTERS_PATH, ROSETTES, VIEWBOX } from "./brand/paths";

type Detail = keyof typeof ROSETTES;

/**
 * The Bazari wordmark: black serif letters, with the brand red rosettes set into the two bowls of the B.
 * Vector shapes from tools/brand/build_logo.py, so it is sharp at every size and needs no font.
 * `detail` picks how much of the rosette to draw: "small" for header sizes, "mid" or "full" when larger.
 */
export function BazariWordmark({ inverted = false, detail = "small", className = "" }: { inverted?: boolean; detail?: Detail; className?: string }) {
  return (
    <svg viewBox={VIEWBOX} className={`block w-auto ${className}`} aria-hidden="true" focusable="false">
      <path d={B_PATH} fillRule="evenodd" className={inverted ? "fill-white" : "fill-ink"} />
      {/* On near-black the red goes one step lighter (red-500) so the ornament still reads. */}
      <path d={ROSETTES[detail]} fillRule="evenodd" className={inverted ? "fill-red-500" : "fill-red-600"} />
      <path d={LETTERS_PATH} className={inverted ? "fill-white" : "fill-ink"} />
    </svg>
  );
}

export function Logo({ inverted = false, lang, to = "/" }: { inverted?: boolean; lang: Lang; to?: string }) {
  return (
    <Link href={href(lang, to)} className="flex shrink-0 items-center py-0.5" aria-label="Bazari">
      <BazariWordmark inverted={inverted} className="h-[1.25rem] min-[400px]:h-[1.4rem] sm:h-[1.6rem] lg:h-[1.8rem]" />
    </Link>
  );
}
