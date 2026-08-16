// Sinkron inventaris akun (List Account 365/Family/Adobe CC) → Supabase, dipanggil GAS sbg bridge.
// Sheet = input (owner), Supabase = baca (smartSearch). Gated x-bridge-secret == AUTH_BRIDGE_SECRET.
// service_role → bypass RLS (tabel akun_inventory sensitif, tak ada akses anon/publik).
// action:'replace' { source, rows:[...] } → ganti total baris source itu (idempotent, aman di-rerun)
// action:'list' {} → semua baris (GAS smartSearch reshape + filter query)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CORS, json } from "../_shared/util.ts";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const secret = Deno.env.get("AUTH_BRIDGE_SECRET") || "";
    if (!secret || req.headers.get("x-bridge-secret") !== secret) {
      return json({ success: false, error: "unauthorized" }, 401);
    }
    const body = await req.json();

    // Ganti semua baris satu source (satu sheet) lalu insert ulang. Aman di-rerun tiap onEdit/backfill.
    if (body.action === "replace") {
      const source = String(body.source || "").trim();
      const rows = Array.isArray(body.rows) ? body.rows : [];
      if (!source) return json({ success: false, error: "source wajib" }, 400);
      const del = await admin.from("akun_inventory").delete().eq("source", source);
      if (del.error) throw del.error;
      if (rows.length) {
        const { error } = await admin.from("akun_inventory").insert(rows);
        if (error) throw error;
      }
      return json({ success: true, replaced: rows.length });
    }

    if (body.action === "list") {
      // Filter di Postgres (bukan tarik semua): ilike ke-4 kolom searchable. Hindari transfer ribuan baris/search.
      let query = admin.from("akun_inventory").select("*");
      const q = String(body.q || "").replace(/[,()*%\\]/g, "").trim();
      if (q) {
        const like = `%${q}%`;
        query = query.or(
          `nama.ilike.${like},email_pembeli.ilike.${like},akun.ilike.${like},wa.ilike.${like}`,
        );
      }
      const { data, error } = await query;
      if (error) throw error;
      return json({ success: true, rows: data || [] });
    }

    return json({ success: false, error: "action tidak dikenal" }, 400);
  } catch (e) {
    return json({ success: false, error: String((e as Error).message || e) }, 500);
  }
});
