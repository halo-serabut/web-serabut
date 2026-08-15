// POST { email, purpose:'signup'|'reset', no_hp? }
// Generate OTP → simpan hash di auth_otp → kirim email (GAS-bridge) + WA (Fonnte).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  CORS,
  genOTP,
  json,
  OTP_EXPIRY_MIN,
  sendEmailViaGAS,
  sendWA,
  sha256hex,
} from "../_shared/util.ts";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const { email, purpose = "signup", no_hp } = await req.json();
    const emailNorm = String(email || "").toLowerCase().trim();
    if (!emailNorm || !/^\S+@\S+\.\S+$/.test(emailNorm)) {
      return json({ success: false, error: "Email tidak valid" }, 400);
    }
    if (purpose !== "signup" && purpose !== "reset") {
      return json({ success: false, error: "Purpose tidak valid" }, 400);
    }

    // cek user existing via profiles (denormalized email)
    const { data: prof } = await admin
      .from("profiles")
      .select("id, no_hp, nama")
      .ilike("email", emailNorm)
      .maybeSingle();

    if (purpose === "signup" && prof) {
      return json({ success: false, error: "Email sudah terdaftar" }, 409);
    }
    if (purpose === "reset" && !prof) {
      return json({ success: false, error: "Email tidak terdaftar" }, 404);
    }

    // throttle naif: 1 OTP / 45 detik / email (ponytail: cukup utk cegah spam;
    // upgrade ke rate-limit proper kalau disalahgunakan)
    const { data: prev } = await admin
      .from("auth_otp")
      .select("created_at")
      .eq("email", emailNorm)
      .maybeSingle();
    if (prev && Date.now() - new Date(prev.created_at).getTime() < 45_000) {
      return json(
        { success: false, error: "Tunggu sebentar sebelum minta OTP lagi" },
        429,
      );
    }

    const otp = genOTP();
    const otpHash = await sha256hex(otp);
    const expiry = new Date(Date.now() + OTP_EXPIRY_MIN * 60_000).toISOString();

    const { error: upErr } = await admin.from("auth_otp").upsert({
      email: emailNorm,
      otp_hash: otpHash,
      expiry,
      attempts: 0,
      purpose,
      created_at: new Date().toISOString(),
    });
    if (upErr) throw upErr;

    const nama = (prof?.nama as string) || "";
    // WA: signup pakai no_hp dari input, reset pakai nomor tersimpan
    const waTarget = purpose === "reset" ? (prof?.no_hp as string) : no_hp;

    // Email wajib sampai → await + lempar kalau gagal. WA opsional → jangan gagalkan.
    await sendEmailViaGAS(emailNorm, nama, otp, "otp");
    if (waTarget) {
      await sendWA(
        waTarget,
        `Kode OTP Serabut Store kamu: *${otp}* (berlaku ${OTP_EXPIRY_MIN} menit). Jangan bagikan ke siapa pun.`,
      ).catch(() => {});
    }

    return json({ success: true, action: "verify_otp", email: emailNorm });
  } catch (e) {
    return json({ success: false, error: String((e as Error).message || e) }, 500);
  }
});
