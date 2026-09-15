import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const payload = await req.json();
    const {
      eventName, guestCount, eventDate, eventTime, eventAddress,
      contactName, phone, email, deliveryRequired, deliveryFee,
      specialRequests, items, subtotalMeats, subtotalSides,
      subtotalDesserts, total,
    } = payload ?? {};

    if (
      !contactName || !email || !eventName || !eventDate || !eventAddress ||
      !Number.isFinite(Number(guestCount)) || Number(guestCount) <= 0 ||
      !Array.isArray(items) || items.length === 0
    ) {
      return json({ error: "Missing required order information." }, 400);
    }

    const validItems = items.every((item: any) =>
      item &&
      typeof item.item_name === "string" &&
      item.item_name.trim().length > 0 &&
      Number.isFinite(Number(item.quantity)) &&
      Number(item.quantity) > 0 &&
      Number.isFinite(Number(item.unit_price)) &&
      Number.isFinite(Number(item.line_total))
    );

    if (!validItems) return json({ error: "One or more order items are invalid." }, 400);

    const db = createClient(supabaseUrl, serviceKey);
    const eventDateTime = eventTime
      ? eventDate + "T" + eventTime + ":00"
      : eventDate + "T00:00:00";

    const { data: order, error: orderError } = await db
      .from("orders")
      .insert({
        source: "website",
        event_name: eventName,
        guest_count: Number(guestCount),
        event_date: eventDateTime,
        contact_name: contactName,
        email,
        phone: phone || null,
        venue_address: eventAddress,
        delivery_required: !!deliveryRequired,
        delivery_fee: Number(deliveryFee || 0),
        special_requests: specialRequests || null,
        subtotal_meats: Number(subtotalMeats || 0),
        subtotal_sides: Number(subtotalSides || 0),
        subtotal_desserts: Number(subtotalDesserts || 0),
        total: Number(total || 0),
        original_submission_date: new Date().toISOString(),
      })
      .select("id, order_number")
      .single();

    if (orderError || !order) {
      return json({ error: orderError?.message || "Could not create order." }, 500);
    }

    const rows = items.map((item: any) => ({
      order_id: order.id,
      menu_item_id: item.menu_item_id || null,
      item_name: item.item_name.trim(),
      category: item.category || null,
      quantity: Number(item.quantity),
      unit: item.unit || null,
      unit_price: Number(item.unit_price || 0),
      line_total: Number(item.line_total || 0),
      option: item.option || null,
      source: "website",
    }));

    const { error: itemsError } = await db.from("order_items").insert(rows);

    if (itemsError) {
      await db.from("orders").delete().eq("id", order.id);
      return json({ error: itemsError.message }, 500);
    }

    return json({
      success: true,
      order_number: order.order_number,
    });
  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : "Unable to submit order.",
    }, 500);
  }
});
