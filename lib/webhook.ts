const WEBHOOK_URL = process.env.WEBHOOK_URL || "https://apihier.com/api/webhook";

export interface EmailPayload {
  type: "email";
  source: "routenu";
  email_to: string;
  email_subject: string;
  email_body: string;
}

export interface MessagePayload {
  type: "message";
  phone: string;
  message: string;
  profile: string;
  browser: string;
}

export type WebhookPayload = EmailPayload | MessagePayload;

export async function sendWebhook(payload: WebhookPayload): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Normaliseer NL telefoonnummer naar internationaal formaat zonder + (31612345678) */
export function normalizePhone(phone: string): string {
  let p = phone.replace(/[\s\-()]/g, "");
  if (p.startsWith("+")) p = p.slice(1);
  if (p.startsWith("00")) p = p.slice(2);
  if (p.startsWith("06")) p = "31" + p.slice(1);
  else if (p.startsWith("0")) p = "31" + p.slice(1);
  return p;
}
