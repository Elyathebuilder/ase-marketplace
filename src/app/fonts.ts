import { Inter, Manrope, Noto_Sans_Georgian } from "next/font/google";

export const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter", display: "swap" });
export const manrope = Manrope({ subsets: ["latin", "cyrillic"], weight: ["600", "700", "800"], variable: "--font-manrope", display: "swap" });
// Ready for the Georgian version of the site.
export const notoGeorgian = Noto_Sans_Georgian({ subsets: ["georgian"], variable: "--font-noto-georgian", display: "swap" });

export const fontVariables = [inter, manrope, notoGeorgian].map((f) => f.variable).join(" ");
