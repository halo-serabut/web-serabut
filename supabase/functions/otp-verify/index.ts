// POST { email, otp, purpose, nama?, no_hp?, password?, newPassword? }
// signup: buat auth user + profile + mint sesi (token_hash) + welcome.
// reset : set password baru (client login normal setelahnya).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  CORS,
  json,
  sendEmailViaGAS,
  sendWA,
  sha256hex,
} from "../_shared/util.ts";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const MAX_ATTEMPTS = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const body = await req.json();
    const emailNorm = String(body.email || "").toLowerCase().trim();
    const otp = String(body.otp || "").trim();
    const purpose = body.purpose === "reset" ? "reset" : "signup";
    if (!emailNorm || !otp) {
      return json({ success: false, error: "Data tidak lengkap" }, 400);
    }

    const { data: row } = await admin
      .from("auth_otp")
      .select("otp_hash, expiry, attempts, purpose")
      .eq("email", emailNorm)
      .maybeSingle();
    if (!row) {
      return json({ success: false, error: "OTP tidak ditemukan, minta ulang" }, 404);
    }
    if ((row.attempts ?? 0) >= MAX_ATTEMPTS) {
      return json({ success: false, error: "Terlalu banyak percobaan. Minta OTP baru." }, 429);
    }
    if (new Date() > new Date(row.expiry)) {
      return json({ success: false, error: "OTP kadaluarsa. Minta ulang." }, 410);
    }
    if ((await sha256hex(otp)) !== row.otp_hash) {
      const remaining = MAX_ATTEMPTS - (row.attempts ?? 0) - 1;
      await admin.from("auth_otp")
        .update({ attempts: (row.attempts ?? 0) + 1 }).eq("email", emailNorm);
      return json({
        success: false,
        error: remaining > 0 ? `Kode OTP salah. Sisa ${remaining} percobaan.`
          : "Terlalu banyak percobaan. Minta OTP baru.",
      }, 400);
    }

    // ── OTP benar ──
    if (purpose === "reset") {
      const newPassword = String(body.newPassword || "");
      if (newPassword.length < 6) {
        return json({ success: false, error: "Password minimal 6 karakter" }, 400);
      }
      const { data: prof } = await admin
        .from("profiles").select("id").ilike("email", emailNorm).maybeSingle();
      if (!prof) return json({ success: false, error: "User tidak ditemukan" }, 404);
      const { error: upErr } = await admin.auth.admin
        .updateUserById(prof.id as string, { password: newPassword });
      if (upErr) throw upErr;
      await admin.from("auth_otp").delete().eq("email", emailNorm);
      return json({ success: true, action: "reset_done", email: emailNorm });
    }

    // signup
    const nama = String(body.nama || "").trim();
    const noHp = String(body.no_hp || "").trim();
    const password = String(body.password || "");
    if (!nama || !password) {
      return json({ success: false, error: "Nama & password wajib" }, 400);
    }

    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email: emailNorm,
      password,
      email_confirm: true,
      user_metadata: { nama, no_hp: noHp },
    });
    if (cErr || !created?.user) {
      // kemungkinan sudah terdaftar di antara request & verify
      return json({ success: false, error: "Email sudah terdaftar, silakan login" }, 409);
    }

    const { error: pErr } = await admin.from("profiles").insert({
      id: created.user.id,
      email: emailNorm,
      nama,
      no_hp: noHp,
      role: "buyer",
      status: "Aktif",
    });
    if (pErr) throw pErr;

    await admin.from("auth_otp").delete().eq("email", emailNorm);

    // mint sesi: magiclink → hashed_token, client verifyOtp({token_hash,type:'email'})
    const { data: link, error: lErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: emailNorm,
    });
    if (lErr) throw lErr;
    const tokenHash = link?.properties?.hashed_token || "";

    // welcome (jangan gagalkan signup kalau notif error)
    sendEmailViaGAS(emailNorm, nama, "", "welcome").catch(() => {});
    if (noHp) {
      sendWA(noHp, `Halo ${nama}! Akun Serabut Store kamu sudah aktif. Terima kasih sudah bergabung 🙌`).catch(() => {});
    }

    return json({
      success: true,
      action: "signup_done",
      email: emailNorm,
      token_hash: tokenHash, // client: supabase.auth.verifyOtp({token_hash,type:'email'})
      user: { id: created.user.id, nama, email: emailNorm, no_hp: noHp, role: "buyer" },
    });
  } catch (e) {
    return json({ success: false, error: String((e as Error).message || e) }, 500);
  }
});
