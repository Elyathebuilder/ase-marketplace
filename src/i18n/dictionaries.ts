import type { Lang } from "./config";
import { en, type Dict } from "./en";
import { hy } from "./hy";
import { ka } from "./ka";
import { ru } from "./ru";
import { tr } from "./tr";

/** Every language's UI text. Each one is typed as Dict, so a missing text is a compile error. */
export const DICTS: Record<Lang, Dict> = { ka, en, ru, tr, hy };
