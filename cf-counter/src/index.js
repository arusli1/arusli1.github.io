const ALLOWED_ORIGIN = "https://arusli1.github.io";
const KEY = "count";

function corsHeaders(origin) {
  var allow = origin === ALLOWED_ORIGIN || origin === "http://127.0.0.1:8080" ? origin : ALLOWED_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export default {
  async fetch(request, env) {
    var origin = request.headers.get("Origin") || "";
    var headers = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: headers });
    }

    if (request.method === "GET") {
      var raw = await env.COUNTER_KV.get(KEY);
      var count = raw ? parseInt(raw, 10) : 0;
      return new Response(JSON.stringify({ count: count }), {
        headers: Object.assign({ "Content-Type": "application/json" }, headers),
      });
    }

    if (request.method === "POST") {
      // only accept increments from the site itself — not foolproof (headers
      // are spoofable outside a browser), but blocks casual cross-origin abuse
      // for what's meant to be a fun stat, not a security-sensitive counter
      if (origin !== ALLOWED_ORIGIN && origin !== "http://127.0.0.1:8080") {
        return new Response("forbidden", { status: 403, headers: headers });
      }
      var current = await env.COUNTER_KV.get(KEY);
      var next = (current ? parseInt(current, 10) : 0) + 1;
      await env.COUNTER_KV.put(KEY, String(next));
      return new Response(JSON.stringify({ count: next }), {
        headers: Object.assign({ "Content-Type": "application/json" }, headers),
      });
    }

    return new Response("method not allowed", { status: 405, headers: headers });
  },
};
