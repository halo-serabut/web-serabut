// Reviews → Supabase, dipanggil GAS sbg bridge (frontend tetap lewat GAS). Gated x-bridge-secret.
// service_role → bypass RLS (tabel reviews tanpa policy publik).
// action: insert {rows|row} | patch {reviewId,fields} | like {reviewId} | delete {reviewId}
//       | list {produk?, email?, publishedOnly?}
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
      const rows = Array.isArray(body.rows) ? body.rows : body.row ? [body.row] : [];
      if (!rows.length) return json({ success: false, error: "rows kosong" }, 400);
      // upsert on review_id → idempotent backfill (aman di-rerun)
      const { error } = await admin.from("reviews").upsert(rows, { onConflict: "review_id" });
      if (error) throw error;
      return json({ success: true, inserted: rows.length });
    }

    if (body.action === "patch") {
      const reviewId = String(body.reviewId || "").trim();
      const fields = body.fields && typeof body.fields === "object" ? body.fields : {};
      if (!reviewId || !Object.keys(fields).length) return json({ success: false, error: "reviewId & fields wajib" }, 400);
      const { data, error } = await admin.from("reviews").update(fields).eq("review_id", reviewId).select("id");
      if (error) throw error;
      return json({ success: true, updated: (data || []).length });
    }

    if (body.action === "like") {
      const reviewId = String(body.reviewId || "").trim();
      if (!reviewId) return json({ success: false, error: "reviewId wajib" }, 400);
      // ponytail: read-modify-write (likes kosmetik, race tak fatal)
      const cur = await admin.from("reviews").select("likes").eq("review_id", reviewId).single();
      if (cur.error) throw cur.error;
      const likes = (Number(cur.data?.likes) || 0) + 1;
      const { error } = await admin.from("reviews").update({ likes }).eq("review_id", reviewId);
      if (error) throw error;
      return json({ success: true, likes });
    }

    if (body.action === "delete") {
      const reviewId = String(body.reviewId || "").trim();
      if (!reviewId) return json({ success: false, error: "reviewId wajib" }, 400);
      const { error } = await admin.from("reviews").delete().eq("review_id", reviewId);
      if (error) throw error;
      return json({ success: true });
    }

    if (body.action === "list") {
      let q = admin.from("reviews").select("*");
      if (body.publishedOnly) q = q.eq("published", true);
      if (body.produk) q = q.ilike("produk", String(body.produk));
      if (body.email) q = q.ilike("email", String(body.email));
      const { data, error } = await q;
      if (error) throw error;
      return json({ success: true, rows: data || [] });
    }

    return json({ success: false, error: "action tidak dikenal" }, 400);
  } catch (e) {
    return json({ success: false, error: String((e as Error).message || e) }, 500);
  }
});
