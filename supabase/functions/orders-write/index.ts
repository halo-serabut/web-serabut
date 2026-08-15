// Tulis Orders ke Supabase (dipanggil GAS sbg bridge — webhook eksternal tetap masuk GAS).
// Gated x-bridge-secret == AUTH_BRIDGE_SECRET. service_role → bypass RLS utk insert/update sistem.
// action:'insert' { rows:[...] }  |  action:'status' { orderId, status?, paymentMethod?, paymentStatus? }
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

    if (body.action === "insert") {
      const rows = Array.isArray(body.rows) ? body.rows : [];
      if (!rows.length) return json({ success: false, error: "rows kosong" }, 400);
      const { error } = await admin.from("orders").insert(rows);
      if (error) throw error;
      return json({ success: true, inserted: rows.length });
    }

    if (body.action === "status") {
      const orderId = String(body.orderId || "").trim();
      if (!orderId) return json({ success: false, error: "orderId wajib" }, 400);
      const patch: Record<string, string> = {};
      if (body.status != null) patch.status = String(body.status);
      if (body.paymentMethod != null) patch.payment_method = String(body.paymentMethod);
      if (body.paymentStatus != null) patch.payment_status = String(body.paymentStatus);
      if (!Object.keys(patch).length) return json({ success: false, error: "tak ada perubahan" }, 400);
      const { data, error } = await admin.from("orders")
        .update(patch).eq("order_id", orderId).select("id");
      if (error) throw error;
      return json({ success: true, updated: (data || []).length });
    }

    return json({ success: false, error: "action tidak dikenal" }, 400);
  } catch (e) {
    return json({ success: false, error: String((e as Error).message || e) }, 500);
  }
});
