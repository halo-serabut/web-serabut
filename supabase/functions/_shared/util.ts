// Shared helpers untuk Edge Functions auth (otp-request / otp-verify).
// WA via Fonnte LANGSUNG (tanpa GAS); email via GAS-bridge (GmailApp) di balik satu fungsi.

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const OTP_EXPIRY_MIN = 10;

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// OTP 6 digit, 100000–999999 (selalu 6 digit, tak pernah leading-zero pendek)
export function genOTP(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function sha256hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(s),
  );
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Mirror _normalizeWA() di GAS: 08xx→628xx, 8xx→628xx, 62xx→62xx
export function normalizeWA(wa: string): string {
  const d = String(wa || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("62")) return d;
  if (d.startsWith("0")) return "62" + d.slice(1);
  return "62" + d;
}

export async function sendWA(noHp: string, message: string): Promise<void> {
  const token = Deno.env.get("FONNTE_TOKEN") || "";
  const target = normalizeWA(noHp);
  if (!token || !target) return; // silent skip mirror GAS (WA opsional)
  await fetch("https://api.fonnte.com/send", {
    method: "POST",
    headers: { Authorization: token },
    body: new URLSearchParams({ target, message }),
  });
}

// Email lewat GAS-bridge (reuse GmailApp). kind: 'otp' | 'welcome'
export async function sendEmailViaGAS(
  email: string,
  nama: string,
  otp: string,
  kind: "otp" | "welcome",
): Promise<void> {
  const url = Deno.env.get("GAS_URL") || "";
  const secret = Deno.env.get("AUTH_BRIDGE_SECRET") || "";
  if (!url || !secret) throw new Error("email bridge belum dikonfigurasi");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "sendAuthEmail",
      bridgeSecret: secret,
      email,
      nama,
      otp,
      kind,
    }),
    redirect: "follow", // Apps Script /exec selalu 302 ke googleusercontent
  });
  if (!res.ok) throw new Error("gagal kirim email (bridge " + res.status + ")");
}
