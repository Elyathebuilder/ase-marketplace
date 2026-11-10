import { Inter, Manrope, Noto_Sans_Armenian, Noto_Sans_Georgian } from "next/font/google";

// Latin (with Turkish letters via latin-ext) and Cyrillic come from Inter and Manrope.
export const inter = Inter({ subsets: ["latin", "latin-ext", "cyrillic"], variable: "--font-inter", display: "swap" });
export const manrope = Manrope({ subsets: ["latin", "latin-ext", "cyrillic"], weight: ["600", "700", "800"], variable: "--font-manrope", display: "swap" });
// Georgian and Armenian scripts are not in Inter or Manrope, so these fill in.
export const notoGeorgian = Noto_Sans_Georgian({ subsets: ["georgian"], variable: "--font-noto-georgian", display: "swap" });
export const notoArmenian = Noto_Sans_Armenian({ subsets: ["armenian"], variable: "--font-noto-armenian", display: "swap" });

export const fontVariables = [inter, manrope, notoGeorgian, notoArmenian].map((f) => f.variable).join(" ");
