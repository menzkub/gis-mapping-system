import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @deno-types="npm:@types/web-push"
import webpush from "npm:web-push";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

const VAPID_PUBLIC  = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;

webpush.setVapidDetails("mailto:admin@pea.co.th", VAPID_PUBLIC, VAPID_PRIVATE);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return new Response("Unauthorized", { status: 401, headers: CORS });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Verify caller is admin
  const { data: { user }, error: authErr } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", ""),
  );
  if (authErr || !user) return new Response("Unauthorized", { status: 401, headers: CORS });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return new Response("Forbidden", { status: 403, headers: CORS });

  const { title, body, url, recipient_ids } = await req.json();
  if (!title || !body) return new Response("title and body required", { status: 400, headers: CORS });

  // Fetch subscriptions — optionally filtered to specific user IDs
  let query = supabase.from("push_subscriptions").select("user_id, subscription");
  if (Array.isArray(recipient_ids) && recipient_ids.length > 0) {
    query = query.in("user_id", recipient_ids);
  }
  const { data: rows } = await query;

  const results = await Promise.allSettled(
    (rows ?? []).map((r) =>
      webpush.sendNotification(r.subscription, JSON.stringify({ title, body, url: url ?? "/" }))
    ),
  );

  // Remove expired subscriptions (410 Gone)
  const expiredUserIds: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      const err = r.reason as { statusCode?: number };
      if (err?.statusCode === 410 && rows?.[i]) {
        expiredUserIds.push((rows[i].subscription as { endpoint: string }).endpoint);
      }
    }
  });
  if (expiredUserIds.length > 0) {
    await supabase.from("push_subscriptions")
      .delete()
      .in("subscription->endpoint", expiredUserIds);
  }

  const sent   = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return new Response(JSON.stringify({ sent, failed, total: rows?.length ?? 0 }), {
    headers: { "Content-Type": "application/json", ...CORS },
  });
});
