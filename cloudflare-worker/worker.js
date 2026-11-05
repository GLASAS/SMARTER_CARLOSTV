// Proxy CORS opcional recomendado para conectar GitHub Pages con Apps Script.
// En Cloudflare Workers, configura la variable de entorno APPS_SCRIPT_URL
// con la URL /exec de tu implementación de Apps Script.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};
export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });
    if (!env.APPS_SCRIPT_URL) return Response.json({ok:false,message:"Falta configurar APPS_SCRIPT_URL."},{status:500,headers:cors});
    try {
      const payload = await request.text();
      const upstream = await fetch(env.APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        redirect: "follow"
      });
      const body = await upstream.text();
      return new Response(body, {
        status: upstream.ok ? 200 : upstream.status,
        headers: { ...cors, "Content-Type": "application/json; charset=utf-8" }
      });
    } catch {
      return Response.json({ok:false,message:"No fue posible conectar con Apps Script."},{status:502,headers:cors});
    }
  }
};
