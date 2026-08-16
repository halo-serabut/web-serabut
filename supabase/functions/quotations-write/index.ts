// Quotations → Supabase, dipanggil GAS sbg bridge (frontend tetap lewat GAS). Gated x-bridge-secret.
// service_role → bypass RLS (tabel quotations tanpa policy publik).
// action: upsert {row} | insert {rows} (backfill) | list {} | get {quoId}
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

    if (body.action === "upsert" || body.action === "insert") {
      const rows = Array.isArray(body.rows) ? body.rows : body.row ? [body.row] : [];
      if (!rows.length) return json({ success: false, error: "rows kosong" }, 400);
      const { error } = await admin.from("quotations").upsert(rows, { onConflict: "quo_id" });
      if (error) throw error;
      return json({ success: true, upserted: rows.length });
    }

    if (body.action === "list") {
      const { data, error } = await admin.from("quotations").select("*");
      if (error) throw error;
      return json({ success: true, rows: data || [] });
    }

    if (body.action === "get") {
      const quoId = String(body.quoId || "").trim();
      if (!quoId) return json({ success: false, error: "quoId wajib" }, 400);
      const { data, error } = await admin.from("quotations").select("*").eq("quo_id", quoId).maybeSingle();
      if (error) throw error;
      return json({ success: true, row: data || null });
    }

    return json({ success: false, error: "action tidak dikenal" }, 400);
  } catch (e) {
    return json({ success: false, error: String((e as Error).message || e) }, 500);
  }
});
