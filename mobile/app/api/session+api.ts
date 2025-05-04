export async function GET(request: Request) {
  // Parse the URL to extract the voice parameter
  const url = new URL(request.url);
  const voice = url.searchParams.get("voice") || "alloy"; // Default to 'alloy' if not specified

  // Validate that we have a voice parameter
  if (!voice) {
    return new Response(
      JSON.stringify({ error: "Voice parameter is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const r = await fetch("http://192.168.0.120:8000/api/realtime/sessions", {
    method: "POST",
    headers: {
      // Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini-realtime-preview-2024-12-17",
      voice: voice,
      instructions: `
        Keep your responses very short and to the point feel free to ask follow up questions.
      `,
    }),
  });
  const data = await r.json();
  console.log("session", data);
  return new Response(JSON.stringify(data));
}
