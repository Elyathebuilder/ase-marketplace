/**
 * Emails (server only).
 *
 * Every email is first written to the email_outbox table, in the same transaction as the event that
 * caused it. deliverOutbox() then sends queued emails through Resend when RESEND_API_KEY and
 * MAIL_FROM are set. Without them nothing is sent: the email is marked 'not_sent' and, in TEST mode,
 * admins can open it on the Email outbox page. The app never says an email was sent when it wasn't.
 * Demo accounts (@demo.ase.ge) never receive real email.
 */
import type { Ctx } from "./service";

export interface OutboxRow {
  id: number;
  user_id: string | null;
  to_email: string;
  kind: string;
  subject: string;
  body_text: string;
  link: string | null;
  created_at: string;
  status: "queued" | "sent" | "failed" | "not_sent";
  sent_at: string | null;
  provider_id: string | null;
  error: string | null;
}

/** Queue one email. `link` is a site path such as /verify-email?token=…; the site address is added when sending. */
export function queueEmail(ctx: Ctx, e: { userId?: string | null; to: string; kind: string; subject: string; text: string; link?: string | null }) {
  ctx.db
    .prepare("INSERT INTO email_outbox (user_id, to_email, kind, subject, body_text, link, created_at) VALUES (?,?,?,?,?,?,?)")
    .run(e.userId ?? null, e.to, e.kind, e.subject.slice(0, 200), e.text.slice(0, 5000), e.link ?? null, ctx.now().toISOString());
}

export const emailProviderConfigured = () => !!(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
export const siteUrl = () => (process.env.ASE_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

/** Send everything queued. Safe to call after every action; it returns quickly when nothing is queued. */
export async function deliverOutbox(ctx: Ctx, limit = 20) {
  const rows = ctx.db.prepare("SELECT * FROM email_outbox WHERE status = 'queued' ORDER BY id LIMIT ?").all(limit) as unknown as OutboxRow[];
  if (!rows.length) return;
  const mark = ctx.db.prepare("UPDATE email_outbox SET status = ?, sent_at = ?, provider_id = ?, error = ? WHERE id = ? AND status = 'queued'");
  for (const r of rows) {
    if (r.to_email.endsWith("@demo.ase.ge")) {
      mark.run("not_sent", null, null, "Demo account: no real email", r.id);
      continue;
    }
    if (!emailProviderConfigured()) {
      mark.run("not_sent", null, null, "No email provider configured (RESEND_API_KEY, MAIL_FROM)", r.id);
      continue;
    }
    const link = r.link ? `${siteUrl()}${r.link}` : null;
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: process.env.MAIL_FROM, to: [r.to_email], subject: r.subject, text: link ? `${r.body_text}\n\n${link}` : r.body_text }),
        signal: AbortSignal.timeout(10_000),
      });
      const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
      if (res.ok) mark.run("sent", ctx.now().toISOString(), body.id ?? null, null, r.id);
      else mark.run("failed", null, null, `HTTP ${res.status}: ${body.message ?? ""}`.slice(0, 300), r.id);
    } catch (err) {
      mark.run("failed", null, null, String(err).slice(0, 300), r.id);
    }
  }
}
