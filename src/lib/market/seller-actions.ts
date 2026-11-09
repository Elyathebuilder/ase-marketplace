"use server";

/**
 * Form actions for sellers (the application, the store, products, the Verified badge request and
 * their own orders) and for the administrators who review them. These only read the form and call
 * the services; every permission check happens in the services on the server, never in the page.
 */
import { run, str } from "./action-kit";
import * as badge from "./badge";
import * as products from "./products";
import * as sellers from "./sellers";
import { market } from "./server";
import { addOrderMessage, manufacturerStep, type MakerStep } from "./service";
import { DOCUMENTS, IMAGES, saveUpload } from "./uploads";
import { MarketError } from "./types";

const files = (f: FormData, k: string) => f.getAll(k).filter((v): v is File => typeof v !== "string" && v.size > 0);

async function saveAll(f: FormData, k: string, accept: typeof DOCUMENTS, max = 10) {
  const list = files(f, k);
  if (list.length > max) throw new MarketError("invalid_input", "too many files");
  const out: { file: string; name: string }[] = [];
  for (const file of list) {
    const saved = await saveUpload(file, accept);
    if (saved) out.push(saved);
  }
  return out;
}

const application = (f: FormData): sellers.ApplicationInput => ({
  name: str(f, "name"),
  legalName: str(f, "legalName"),
  registrationNumber: str(f, "registrationNumber"),
  yearEstablished: str(f, "yearEstablished"),
  description: str(f, "description"),
  categories: f.getAll("categories").map(String),
  website: str(f, "website"),
  facebook: str(f, "facebook"),
  instagram: str(f, "instagram"),
  extraInfo: str(f, "extraInfo"),
  city: str(f, "city"),
  region: str(f, "region"),
  address: str(f, "address"),
  contactFirstName: str(f, "contactFirstName"),
  contactLastName: str(f, "contactLastName"),
  contactEmail: str(f, "contactEmail"),
  contactPhone: str(f, "contactPhone"),
});

function productInput(f: FormData): products.ProductInput {
  const mins = f.getAll("tierMin").map(String);
  const prices = f.getAll("tierPrice").map(String);
  return {
    name: str(f, "name"),
    nameKa: str(f, "nameKa"),
    category: str(f, "category"),
    description: str(f, "description"),
    descriptionKa: str(f, "descriptionKa"),
    highlights: str(f, "highlights"),
    specs: str(f, "specs"),
    materials: str(f, "materials"),
    colors: str(f, "colors"),
    variants: str(f, "variants"),
    retailPrice: str(f, "retailPrice"),
    unit: str(f, "unit"),
    lengthCm: str(f, "lengthCm"),
    widthCm: str(f, "widthCm"),
    heightCm: str(f, "heightCm"),
    weightKg: str(f, "weightKg"),
    fragile: str(f, "fragile"),
    stock: str(f, "stock"),
    available: str(f, "available"),
    moq: str(f, "moq"),
    productionDays: str(f, "productionDays"),
    customizable: str(f, "customizable"),
    customizationOptions: str(f, "customizationOptions"),
    buyNow: str(f, "buyNow"),
    requestQuote: str(f, "requestQuote"),
    wholesaleMinQty: str(f, "wholesaleMinQty"),
    wholesaleQuoteOnly: str(f, "wholesaleQuoteOnly"),
    tiers: mins.map((minQty, i) => ({ minQty, price: prices[i] ?? "" })).filter((t) => t.minQty.trim() || t.price.trim()),
  };
}

const SELLER_FILE_KINDS = ["registration_document", "logo", "workshop_photo", "product_photo", "supporting_document"] as const;

/** Everything a signed-in seller does. The op names the step; the services decide whether it is allowed. */
export async function sellerAction(f: FormData) {
  const op = str(f, "op");
  const lang = str(f, "lang") === "en" ? "/en" : "";
  await run(f, async (actor) => {
    const ctx = market();
    switch (op) {
      case "application": {
        const step = str(f, "step") === "contact" ? "contact" : "business";
        sellers.saveApplication(ctx, actor, step, application(f));
        const next = str(f, "goto");
        return next && /^[0-9]$/.test(next) ? `${lang}/seller/application?step=${next}` : undefined;
      }
      case "upload": {
        const kind = str(f, "kind") as (typeof SELLER_FILE_KINDS)[number];
        if (!SELLER_FILE_KINDS.includes(kind)) throw new MarketError("invalid_input");
        const accept = kind === "registration_document" || kind === "supporting_document" ? DOCUMENTS : IMAGES;
        const saved = await saveAll(f, "file", accept, kind === "logo" ? 1 : 10);
        if (saved.length === 0) throw new MarketError("invalid_input", "no file chosen");
        for (const s of saved) sellers.addSellerFile(ctx, actor, kind, s);
        return;
      }
      case "removeFile":
        return sellers.removeSellerFile(ctx, actor, str(f, "id"));
      case "submit":
        return sellers.submitApplication(ctx, actor);
      case "reply":
        return sellers.sellerReply(ctx, actor, str(f, "track") === "badge" ? "badge" : "account", str(f, "body"));

      case "badgeRequest": {
        const docs = await saveAll(f, "documents", DOCUMENTS);
        const photos = await saveAll(f, "photos", IMAGES);
        badge.requestBadge(
          ctx,
          actor,
          {
            name: str(f, "name"),
            location: str(f, "location"),
            activities: str(f, "activities"),
            categories: f.getAll("categories").map(String),
            capacity: str(f, "capacity"),
            contact: str(f, "contact"),
            extra: str(f, "extra"),
          },
          [...docs.map((saved) => ({ kind: "badge_document" as const, saved })), ...photos.map((saved) => ({ kind: "workshop_photo" as const, saved }))],
        );
        return;
      }
      case "badgeWithdraw":
        return badge.withdrawBadgeRequest(ctx, actor);

      case "productSave": {
        const existing = str(f, "slug") || null;
        const slug = products.saveProduct(ctx, actor, existing, productInput(f));
        // New photos chosen in the same form are added straight away.
        for (const s of await saveAll(f, "images", IMAGES, products.MAX_IMAGES)) products.addProductImage(ctx, actor, slug, s);
        if (str(f, "publish") === "1") products.publishProduct(ctx, actor, slug);
        return existing ? undefined : `${lang}/seller/products/${slug}?ok=1`;
      }
      case "productImage": {
        const slug = str(f, "slug");
        const saved = await saveAll(f, "images", IMAGES, products.MAX_IMAGES);
        if (saved.length === 0) throw new MarketError("invalid_input", "no file chosen");
        for (const s of saved) products.addProductImage(ctx, actor, slug, s);
        return;
      }
      case "productImageRemove":
        return products.removeProductImage(ctx, actor, str(f, "slug"), str(f, "id"));
      case "productImageMain":
        return products.makeMainImage(ctx, actor, str(f, "slug"), str(f, "id"));
      case "productPublish":
        return products.publishProduct(ctx, actor, str(f, "slug"));
      case "productStatus": {
        const a = str(f, "action");
        if (a !== "unpublish" && a !== "archive" && a !== "restore" && a !== "delete") throw new MarketError("invalid_input");
        products.productStatusAction(ctx, actor, str(f, "slug"), a);
        return a === "delete" ? `${lang}/seller/products?ok=1` : undefined;
      }

      case "orderStep":
        return manufacturerStep(ctx, actor, str(f, "id"), str(f, "step") as MakerStep, str(f, "comment"));
      case "orderMessage":
        return addOrderMessage(ctx, actor, str(f, "id"), str(f, "kind"), str(f, "body"));
      default:
        throw new MarketError("invalid_input");
    }
  });
}

/** Everything an administrator does with sellers, the Verified badge and product checks. */
export async function adminSellerAction(f: FormData) {
  const op = str(f, "op");
  const slug = str(f, "slug");
  await run(f, async (actor) => {
    const ctx = market();
    switch (op) {
      case "decision":
        return sellers.adminSellerDecision(ctx, actor, slug, str(f, "move"), str(f, "reason"));
      case "message":
        return sellers.adminSellerMessage(ctx, actor, slug, str(f, "track") === "badge" ? "badge" : "account", str(f, "body"), str(f, "internal") === "1");
      case "clearReassessment":
        return sellers.adminClearReassessment(ctx, actor, slug);

      case "badgeReview":
        return badge.badgeStartReview(ctx, actor, slug);
      case "badgeSchedule":
        return badge.badgeScheduleInspection(ctx, actor, slug, { date: str(f, "date"), scale: str(f, "scale"), note: str(f, "note") });
      case "badgeInspection": {
        const checklist: badge.Checklist = { concerns: str(f, "concerns") };
        for (const k of badge.CHECKLIST) checklist[k] = { result: str(f, `${k}.result`) as badge.ChecklistResult, note: str(f, `${k}.note`) };
        const photos = await saveAll(f, "photos", IMAGES);
        badge.badgeRecordInspection(
          ctx,
          actor,
          slug,
          { checklist, summary: str(f, "summary"), recommendation: str(f, "recommendation"), visitedAt: str(f, "visitedAt"), scale: str(f, "scale"), complete: str(f, "complete") === "1" },
          photos,
        );
        return;
      }
      case "badgeInfo":
        return badge.badgeRequestInfo(ctx, actor, slug, str(f, "reason"));
      case "badgeApprove":
        return badge.badgeApprove(ctx, actor, slug, str(f, "reason"));
      case "badgeReject":
        return badge.badgeReject(ctx, actor, slug, str(f, "reason"));
      case "badgeRevoke":
        return badge.badgeRevoke(ctx, actor, slug, str(f, "reason"));
      case "badgeReassess":
        return badge.badgeRequestReassessment(ctx, actor, slug, str(f, "reason"));

      case "productModerate": {
        const d = str(f, "decision");
        if (d !== "approve" && d !== "reject") throw new MarketError("invalid_input");
        return products.adminModerateProduct(ctx, actor, str(f, "product"), d, str(f, "reason"));
      }
      default:
        throw new MarketError("invalid_input");
    }
  });
}
