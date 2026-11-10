/**
 * Catalog text that belongs to the platform, not to sellers: category names, place names and the
 * characteristic tags used as filters. Product and manufacturer text written by sellers is NOT
 * translated here; it is shown as the seller wrote it (see `translations` in lib/types.ts for how
 * sellers can add their own text in more languages later).
 *
 * English is the base text in lib/demo-data.ts and lib/places.ts. Georgian also has the demo
 * catalog's own text (data-ka.ts).
 */
import type { Lang } from "./config";
import { CATEGORIES_KA, MANUFACTURERS_KA, PLACES_KA, PRODUCTS_KA, TAGS_KA, type MakerKa, type ProductKa } from "./data-ka";

export interface CatalogText {
  categories: Record<string, { name: string; description: string }>;
  /** Cities and regions, keyed by their English name. */
  places: Record<string, string>;
  /** Characteristic tags shown as filters, keyed by their English name. */
  tags: Record<string, string>;
  /** Demo catalog only: text for the fictional manufacturers and products. */
  manufacturers?: Record<string, MakerKa>;
  products?: Record<string, ProductKa>;
}

const RU: CatalogText = {
  categories: {
    "food-beverages": { name: "Продукты питания и напитки", description: "Вино, варенье, сыр, мёд, специи и напитки, произведённые в Грузии." },
    "furniture-home": { name: "Мебель и товары для дома", description: "Столы, стулья, кровати, шкафы и товары для дома из грузинских мастерских." },
    "clothing-textiles": { name: "Одежда и текстиль", description: "Одежда, шерсть, ковры, униформа и ткани." },
    "construction-materials": { name: "Строительные материалы", description: "Блоки, плитка, камень, изделия из бетона и отделочные материалы." },
    "plastics-packaging": { name: "Пластик и упаковка", description: "Коробки, плёнки, бутылки, контейнеры и упаковка на заказ." },
    "metal-products": { name: "Металлоизделия", description: "Стальные конструкции, детали, ворота, инструменты и изделия из металла." },
    "wood-products": { name: "Изделия из дерева", description: "Доски, двери, окна, ящики и резьба по дереву." },
    "glass-ceramics": { name: "Стекло и керамика", description: "Глиняная посуда, квеври, столовая посуда, плитка и стекло." },
    "chemicals-industrial": { name: "Химия и промышленные материалы", description: "Краски, покрытия, моющие средства и промышленное сырьё." },
    "electrical-electronics": { name: "Электротехника и электроника", description: "Кабели, электрощиты, освещение и сборка электроники." },
    "cosmetics-personal-care": { name: "Косметика и личная гигиена", description: "Натуральное мыло, кремы, масла и средства ухода." },
    "agricultural-products": { name: "Сельскохозяйственная продукция", description: "Фундук, зерно, сухофрукты, саженцы и фермерская продукция." },
    "other-manufactured": { name: "Другая продукция", description: "Всё остальное, что производится в Грузии." },
  },
  places: {
    Tbilisi: "Тбилиси", Rustavi: "Рустави", Kutaisi: "Кутаиси", Batumi: "Батуми", Zugdidi: "Зугдиди", Gori: "Гори",
    Telavi: "Телави", Sighnaghi: "Сигнахи", Zestaponi: "Зестафони", Mestia: "Местиа", Bakuriani: "Бакуриани",
    Poti: "Поти", Akhaltsikhe: "Ахалцихе", Mtskheta: "Мцхета",
    Kakheti: "Кахетия", Imereti: "Имеретия", "Kvemo Kartli": "Квемо-Картли", "Samegrelo-Zemo Svaneti": "Самегрело-Земо-Сванети",
    "Samtskhe-Javakheti": "Самцхе-Джавахети", Samegrelo: "Самегрело",
  },
  tags: {
    "Organic ingredients": "Органические ингредиенты", Gift: "Подарок", "Solid wood": "Массив дерева", "Custom size": "Размер на заказ",
    HoReCa: "HoReCa", "Hand-made": "Ручная работа", Heritage: "Традиционное", "Flat-pack": "В разобранном виде", "Food-safe": "Для пищевых продуктов",
    "Custom print": "Печать на заказ", Pallet: "На паллетах", Natural: "Натуральное", "Energy efficient": "Энергоэффективное",
    "Custom build": "Сборка на заказ", "Export-ready": "Готово к экспорту", "Low odour": "Слабый запах",
  },
};

const TR: CatalogText = {
  categories: {
    "food-beverages": { name: "Gıda ve içecek", description: "Gürcistan'da üretilen şarap, reçel, peynir, bal, baharat ve içecekler." },
    "furniture-home": { name: "Mobilya ve ev", description: "Gürcü atölyelerinden masa, sandalye, yatak, dolap ve ev eşyaları." },
    "clothing-textiles": { name: "Giyim ve tekstil", description: "Giyim, yün, halı, iş kıyafetleri ve kumaşlar." },
    "construction-materials": { name: "Yapı malzemeleri", description: "Blok, karo, taş, beton ürünleri ve kaplama malzemeleri." },
    "plastics-packaging": { name: "Plastik ve ambalaj", description: "Kutu, film, şişe, kap ve özel ambalaj." },
    "metal-products": { name: "Metal ürünler", description: "Çelik konstrüksiyon, parça, kapı, alet ve metal işleri." },
    "wood-products": { name: "Ahşap ürünler", description: "Kereste, kapı, pencere, kasa ve ahşap oymacılığı." },
    "glass-ceramics": { name: "Cam ve seramik", description: "Toprak kaplar, kvevri, sofra takımları, karo ve cam." },
    "chemicals-industrial": { name: "Kimya ve endüstriyel malzemeler", description: "Boya, kaplama, temizlik ürünleri ve endüstriyel hammaddeler." },
    "electrical-electronics": { name: "Elektrik ve elektronik", description: "Kablo, pano, aydınlatma ve elektronik montaj." },
    "cosmetics-personal-care": { name: "Kozmetik ve kişisel bakım", description: "Doğal sabun, krem, yağ ve bakım ürünleri." },
    "agricultural-products": { name: "Tarım ürünleri", description: "Fındık, tahıl, kuru meyve, fide ve çiftlik ürünleri." },
    "other-manufactured": { name: "Diğer ürünler", description: "Gürcistan'da üretilen diğer her şey." },
  },
  places: {
    Tbilisi: "Tiflis", Rustavi: "Rustavi", Kutaisi: "Kutaisi", Batumi: "Batum", Zugdidi: "Zugdidi", Gori: "Gori",
    Telavi: "Telavi", Sighnaghi: "Sığnaği", Zestaponi: "Zestaponi", Mestia: "Mestia", Bakuriani: "Bakuriani",
    Poti: "Poti", Akhaltsikhe: "Ahıska", Mtskheta: "Mtsheta",
    Kakheti: "Kaheti", Imereti: "İmereti", "Kvemo Kartli": "Kvemo Kartli", "Samegrelo-Zemo Svaneti": "Samegrelo-Zemo Svaneti",
    "Samtskhe-Javakheti": "Samtshe-Cavaheti", Samegrelo: "Samegrelo",
  },
  tags: {
    "Organic ingredients": "Organik içerik", Gift: "Hediye", "Solid wood": "Masif ahşap", "Custom size": "Özel ölçü",
    HoReCa: "HoReCa", "Hand-made": "El yapımı", Heritage: "Geleneksel", "Flat-pack": "Demonte", "Food-safe": "Gıdaya uygun",
    "Custom print": "Özel baskı", Pallet: "Paletli", Natural: "Doğal", "Energy efficient": "Enerji verimli",
    "Custom build": "Özel üretim", "Export-ready": "İhracata hazır", "Low odour": "Düşük koku",
  },
};

const HY: CatalogText = {
  categories: {
    "food-beverages": { name: "Սնունդ և ըմպելիքներ", description: "Վրաստանում արտադրված գինի, մուրաբա, պանիր, մեղր, համեմունքներ և ըմպելիքներ։" },
    "furniture-home": { name: "Կահույք և տուն", description: "Սեղաններ, աթոռներ, մահճակալներ, պահարաններ և տնային իրեր վրացական արհեստանոցներից։" },
    "clothing-textiles": { name: "Հագուստ և տեքստիլ", description: "Հագուստ, բուրդ, գորգեր, համազգեստ և գործվածքներ։" },
    "construction-materials": { name: "Շինանյութեր", description: "Բլոկներ, սալիկներ, քար, բետոնե արտադրանք և երեսապատման նյութեր։" },
    "plastics-packaging": { name: "Պլաստիկ և փաթեթավորում", description: "Տուփեր, թաղանթներ, շշեր, տարաներ և անհատական փաթեթավորում։" },
    "metal-products": { name: "Մետաղե արտադրանք", description: "Պողպատե կոնստրուկցիաներ, դետալներ, դարպասներ, գործիքներ և մետաղե իրեր։" },
    "wood-products": { name: "Փայտե արտադրանք", description: "Տախտակներ, դռներ, պատուհաններ, արկղեր և փայտի փորագրություն։" },
    "glass-ceramics": { name: "Ապակի և կերամիկա", description: "Կավե ամաններ, քվևրի, սպասք, սալիկներ և ապակի։" },
    "chemicals-industrial": { name: "Քիմիա և արդյունաբերական նյութեր", description: "Ներկեր, ծածկույթներ, մաքրող միջոցներ և արդյունաբերական հումք։" },
    "electrical-electronics": { name: "Էլեկտրատեխնիկա և էլեկտրոնիկա", description: "Մալուխներ, վահանակներ, լուսավորություն և էլեկտրոնային հավաքում։" },
    "cosmetics-personal-care": { name: "Կոսմետիկա և անձնական խնամք", description: "Բնական օճառ, քսուքներ, յուղեր և խնամքի միջոցներ։" },
    "agricultural-products": { name: "Գյուղատնտեսական արտադրանք", description: "Պնդուկ, հացահատիկ, չիր, տնկիներ և ֆերմերային արտադրանք։" },
    "other-manufactured": { name: "Այլ արտադրանք", description: "Այն ամենը, ինչ արտադրվում է Վրաստանում։" },
  },
  places: {
    Tbilisi: "Թբիլիսի", Rustavi: "Ռուսթավի", Kutaisi: "Քութայիսի", Batumi: "Բաթումի", Zugdidi: "Զուգդիդի", Gori: "Գորի",
    Telavi: "Թելավի", Sighnaghi: "Սիղնաղի", Zestaponi: "Զեստաֆոնի", Mestia: "Մեստիա", Bakuriani: "Բակուրիանի",
    Poti: "Փոթի", Akhaltsikhe: "Ախալցխա", Mtskheta: "Մցխեթա",
    Kakheti: "Կախեթի", Imereti: "Իմերեթի", "Kvemo Kartli": "Քվեմո Քարթլի", "Samegrelo-Zemo Svaneti": "Սամեգրելո-Զեմո Սվանեթի",
    "Samtskhe-Javakheti": "Սամցխե-Ջավախեթի", Samegrelo: "Սամեգրելո",
  },
  tags: {
    "Organic ingredients": "Օրգանական բաղադրիչներ", Gift: "Նվեր", "Solid wood": "Զանգվածային փայտ", "Custom size": "Անհատական չափս",
    HoReCa: "HoReCa", "Hand-made": "Ձեռագործ", Heritage: "Ավանդական", "Flat-pack": "Ապամոնտաժված", "Food-safe": "Սննդի համար անվտանգ",
    "Custom print": "Անհատական տպագրություն", Pallet: "Պալետներով", Natural: "Բնական", "Energy efficient": "Էներգաարդյունավետ",
    "Custom build": "Անհատական պատրաստում", "Export-ready": "Պատրաստ արտահանման", "Low odour": "Թույլ հոտով",
  },
};

export const CATALOG_TEXT: Partial<Record<Lang, CatalogText>> = {
  ka: { categories: CATEGORIES_KA, places: PLACES_KA, tags: TAGS_KA, manufacturers: MANUFACTURERS_KA, products: PRODUCTS_KA },
  ru: RU,
  tr: TR,
  hy: HY,
};
