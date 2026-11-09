/**
 * Receipts and transfer confirmations (server only).
 * Stored outside the public folder in data/uploads with random names, and only served
 * through /api/files after a permission check. PDF, PNG and JPG up to 5 MB.
 */
import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { MarketError } from "./types";

export const MAX_UPLOAD = 5 * 1024 * 1024;
const dir = () => process.env.ASE_UPLOAD_DIR || path.join(/* turbopackIgnore: true */ process.cwd(), "data", "uploads");

const KINDS = [
  { ext: "pdf", type: "application/pdf", magic: [0x25, 0x50, 0x44, 0x46] },
  { ext: "png", type: "image/png", magic: [0x89, 0x50, 0x4e, 0x47] },
  { ext: "jpg", type: "image/jpeg", magic: [0xff, 0xd8, 0xff] },
];

/** Checks the real file content (not just the name) and saves it. Returns null when no file was chosen. */
export async function saveUpload(file: FormDataEntryValue | null): Promise<{ file: string; name: string } | null> {
  if (!file || typeof file === "string" || file.size === 0) return null;
  if (file.size > MAX_UPLOAD) throw new MarketError("invalid_input", "file too large");
  const bytes = Buffer.from(await file.arrayBuffer());
  const kind = KINDS.find((k) => k.magic.every((b, i) => bytes[i] === b));
  if (!kind) throw new MarketError("invalid_input", "file must be PDF, PNG or JPG");
  const name = `${randomBytes(16).toString("hex")}.${kind.ext}`;
  mkdirSync(dir(), { recursive: true });
  writeFileSync(path.join(/* turbopackIgnore: true */ dir(), name), bytes);
  const original = (file.name || `file.${kind.ext}`).replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(0, 100);
  return { file: name, name: original };
}

export function readUpload(name: string): { body: Buffer; type: string } | null {
  if (!/^[a-f0-9]{32}\.(pdf|png|jpg)$/.test(name)) return null;
  try {
    const body = readFileSync(path.join(/* turbopackIgnore: true */ dir(), name));
    return { body, type: KINDS.find((k) => name.endsWith(`.${k.ext}`))!.type };
  } catch {
    return null;
  }
}
