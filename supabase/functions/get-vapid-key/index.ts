const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const vapidKey = Deno.env.get("FCM_VAPID_KEY");
  if (!vapidKey) {
    return new Response(
      JSON.stringify({ error: "VAPID key not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ vapidKey }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
