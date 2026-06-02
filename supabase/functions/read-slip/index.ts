import Anthropic from "npm:@anthropic-ai/sdk@0.29.2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  // Verify caller is authenticated team_leader or admin
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: { user }, error: authErr } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", ""),
  );
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["team_leader", "admin"].includes(profile.role)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const { image_base64, mime_type } = await req.json();
  if (!image_base64) {
    return new Response(JSON.stringify({ error: "No image provided" }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not set" }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const anthropic = new Anthropic({ apiKey });

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    messages: [{
      role: "user",
      content: [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: (mime_type || "image/jpeg") as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
            data: image_base64,
          },
        },
        {
          type: "text",
          text: `อ่านข้อมูลจากสลิปการโอนเงินในภาพนี้และตอบกลับเป็น JSON เท่านั้น ไม่ต้องมีข้อความอื่นนอกจาก JSON:
{
  "amount": <จำนวนเงิน เป็น number ไม่มีหน่วย เช่น 1500.00>,
  "reference": <เลขอ้างอิงหรือ Transaction ID เป็น string>,
  "date": <วันที่โอน รูปแบบ YYYY-MM-DD>,
  "time": <เวลาโอน รูปแบบ HH:MM>,
  "from_bank": <ชื่อธนาคารต้นทาง>,
  "to_bank": <ชื่อธนาคารปลายทาง>,
  "to_account": <ชื่อหรือเลขบัญชีปลายทาง>
}
หากไม่สามารถอ่านค่าใดได้ให้ใส่ null`,
        },
      ],
    }],
  });

  const text = message.content[0]?.type === "text" ? message.content[0].text : "";
  try {
    const match = text.match(/\{[\s\S]*\}/);
    const data = match ? JSON.parse(match[0]) : {};
    return new Response(JSON.stringify({ data }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ data: {}, raw: text }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
