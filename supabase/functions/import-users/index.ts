// One-time: impor user lama dari sheet Users-web (dikirim GAS) ke Supabase Auth.
// Hash lama SHA256(clientHash:salt) tak kompatibel bcrypt → set password ACAK +
// must_reset=true; user login via "Lupa Password". Idempotent: skip email yang sudah ada.
// Auth: header x-bridge-secret == AUTH_BRIDGE_SECRET (secret sama dgn GAS-bridge email).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CORS, json, normalizeWA } from "../_shared/util.ts";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

type U = { nama?: string; email?: string; wa?: string; role?: string; status?: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const secret = Deno.env.get("AUTH_BRIDGE_SECRET") || "";
    if (!secret || req.headers.get("x-bridge-secret") !== secret) {
      return json({ success: false, error: "unauthorized" }, 401);
    }
    const { users } = await req.json();
    if (!Array.isArray(users)) return json({ success: false, error: "users[] wajib" }, 400);

    const out = { created: 0, skipped: 0, failed: 0, errors: [] as string[] };
    for (const u of users as U[]) {
      const email = String(u.email || "").toLowerCase().trim();
      if (!email || !/^\S+@\S+\.\S+$/.test(email)) { out.skipped++; continue; }
      try {
        // idempotent: sudah ada di profiles?
        const { data: existing } = await admin
          .from("profiles").select("id").ilike("email", email).maybeSingle();
        if (existing) { out.skipped++; continue; }

        const randomPw = crypto.randomUUID() + crypto.randomUUID();
        const { data: created, error: cErr } = await admin.auth.admin.createUser({
          email,
          password: randomPw,
          email_confirm: true,
          user_metadata: { nama: u.nama || "", migrated: true },
        });
        if (cErr || !created?.user) {
          out.failed++; out.errors.push(email + ": " + (cErr?.message || "createUser gagal"));
          continue;
        }
        const role = u.role === "admin" ? "admin" : "buyer";
        const status = String(u.status || "Aktif").trim() || "Aktif";
        const { error: pErr } = await admin.from("profiles").insert({
          id: created.user.id,
          email,
          nama: u.nama || "",
          no_hp: normalizeWA(u.wa || ""),
          role,
          status: status === "Pending" ? "Aktif" : status,
          must_reset: true,
        });
        if (pErr) { out.failed++; out.errors.push(email + ": " + pErr.message); continue; }
        out.created++;
      } catch (e) {
        out.failed++; out.errors.push(email + ": " + String((e as Error).message || e));
      }
    }
    return json({ success: true, ...out });
  } catch (e) {
    return json({ success: false, error: String((e as Error).message || e) }, 500);
  }
});
