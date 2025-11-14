// worker-web-search.js
export default {
  async fetch(request, env) {
    // CORS for your static site
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json"
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    try {
      const { messages, routineJSON } = await request.json();

      // 1) Build a strong system prompt that keeps brand guardrails,
      //    and asks the model to include links/citations when it uses web results.
      const system = [
        "You are L’Oréal Beauty Advisor.",
        "Scope: L’Oréal Group brands and beauty topics only.",
        "When you use web results, include current info AND show citations as bullet links at the end.",
        "Prefer official brand pages and reputable sources."
      ].join(" ");

      // 2) Responses API + tools.web_search enabled
      const body = {
        model: "gpt-4.1",                 // Models that support Web Search via Responses API
        // You can also try: "gpt-4o-mini-search-preview"
        // or check the Models page for other web-search-capable models.
        input: messages ?? [],
        // Put the brand guardrails at the top of the conversation
        // (Responses API lets you prepend an instruction string)
        instructions: system + (routineJSON ? `\nSelected products (JSON):\n${routineJSON}` : ""),
        tools: [{ type: "web_search" }],  // <-- key line: enable web search tool
        tool_choice: "auto",              // let the model decide when to search
        temperature: 0.4,
        max_output_tokens: 600
      };

      const resp = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      const text = await resp.text();
      return new Response(text, { status: resp.status, headers: cors });
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
    }
  }
}
