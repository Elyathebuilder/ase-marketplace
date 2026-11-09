/** The marketplace's product categories. Fixed platform data (not demo data); Georgian names are in i18n/data-ka.ts. */
import type { Category } from "./types";

export const CATEGORIES: Category[] = [
  { slug: "food-beverages", name: "Food & Beverages", icon: "wine", description: "Wine, preserves, cheese, honey, spices and drinks made in Georgia." },
  { slug: "furniture-home", name: "Furniture & Home", icon: "sofa", description: "Tables, chairs, beds, storage and home goods from Georgian workshops." },
  { slug: "clothing-textiles", name: "Clothing & Textiles", icon: "shirt", description: "Apparel, wool, carpets, uniforms and fabrics." },
  { slug: "construction-materials", name: "Construction Materials", icon: "brick-wall", description: "Blocks, tiles, stone, cement products and finishing materials." },
  { slug: "plastics-packaging", name: "Plastics & Packaging", icon: "package", description: "Boxes, films, bottles, containers and custom packaging." },
  { slug: "metal-products", name: "Metal Products", icon: "wrench", description: "Steel structures, fittings, gates, tools and metalwork." },
  { slug: "wood-products", name: "Wood Products", icon: "trees", description: "Boards, doors, windows, crates and carved wood." },
  { slug: "glass-ceramics", name: "Glass & Ceramics", icon: "amphora", description: "Pottery, qvevri, tableware, tiles and glass." },
  { slug: "chemicals-industrial", name: "Chemicals & Industrial Materials", icon: "flask-conical", description: "Paints, coatings, cleaning agents and industrial inputs." },
  { slug: "electrical-electronics", name: "Electrical & Electronics", icon: "cpu", description: "Cables, panels, lighting and electronic assemblies." },
  { slug: "cosmetics-personal-care", name: "Cosmetics & Personal Care", icon: "sparkles", description: "Natural soaps, creams, oils and care products." },
  { slug: "agricultural-products", name: "Agricultural Products", icon: "wheat", description: "Nuts, grains, dried fruit, seedlings and farm produce." },
  { slug: "other-manufactured", name: "Other Manufactured Products", icon: "boxes", description: "Everything else made in Georgia." },
];
