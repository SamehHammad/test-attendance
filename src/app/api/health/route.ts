export async function GET() {
  return Response.json({
    ok: true,
    service: "Trivvo Hr ZKTeco Gateway",
    storage: "external",
    timestamp: new Date().toISOString(),
  });
}
