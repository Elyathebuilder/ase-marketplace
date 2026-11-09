/**
 * Uploaded files (server only): receipts, transfer confirmations, seller documents and photos,
 * product images. Stored outside the public folder in data/uploads with random names, and only
 * served through /api/files after a permission check. The real content is checked (not the file
 * name). PDF, PNG, JPG and WebP up to 5 MB.
 */
import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { MarketError } from "./types";

export const MAX_UPLOAD = 5 * 1024 * 1024;
const dir = () => process.env.ASE_UPLOAD_DIR || path.join(/* turbopackIgnore: true */ process.cwd(), "data", "uploads");

type Ext = "pdf" | "png" | "jpg" | "webp";
const KINDS: { ext: Ext; type: string; test: (b: Buffer) => boolean }[] = [
  { ext: "pdf", type: "application/pdf", test: (b) => b.subarray(0, 4).toString("latin1") === "%PDF" },
  { ext: "png", type: "image/png", test: (b) => b[0] === 0x89 && b.subarray(1, 4).toString("latin1") === "PNG" },
  { ext: "jpg", type: "image/jpeg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: "webp", type: "image/webp", test: (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP" },
];
export const DOCUMENTS: Ext[] = ["pdf", "png", "jpg"];
export const IMAGES: Ext[] = ["png", "jpg", "webp"];

/** Checks the real file content (not just the name) and saves it. Returns null when no file was chosen. */
export async function saveUpload(file: FormDataEntryValue | null, accept: Ext[] = DOCUMENTS): Promise<{ file: string; name: string } | null> {
  if (!file || typeof file === "string" || file.size === 0) return null;
  if (file.size > MAX_UPLOAD) throw new MarketError("invalid_input", "file too large");
  const bytes = Buffer.from(await file.arrayBuffer());
  const kind = KINDS.find((k) => accept.includes(k.ext) && k.test(bytes));
  if (!kind) throw new MarketError("invalid_input", `file type not allowed (${accept.join(", ")})`);
  const name = `${randomBytes(16).toString("hex")}.${kind.ext}`;
  mkdirSync(dir(), { recursive: true });
  writeFileSync(path.join(/* turbopackIgnore: true */ dir(), name), bytes);
  const original = (file.name || `file.${kind.ext}`).replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(0, 100);
  return { file: name, name: original };
}

export function readUpload(name: string): { body: Buffer; type: string } | null {
  if (!/^[a-f0-9]{32}\.(pdf|png|jpg|webp)$/.test(name)) return null;
  try {
    const body = readFileSync(path.join(/* turbopackIgnore: true */ dir(), name));
    return { body, type: KINDS.find((k) => name.endsWith(`.${k.ext}`))!.type };
  } catch {
    return null;
  }
}
