export async function POST(request: Request) {
  const host = new URL(request.url).host;
  if (process.env.NODE_ENV === "production" || !/^localhost(?::\d+)?$/.test(host)) {
    return Response.json({ error: "Development sign-in is only available on localhost." }, { status: 403 });
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "set-cookie": "nova-dev-session=active; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800",
      "cache-control": "no-store",
    },
  });
}

export async function DELETE(request: Request) {
  const host = new URL(request.url).host;
  if (process.env.NODE_ENV === "production" || !/^localhost(?::\d+)?$/.test(host)) return Response.json({ error: "Unavailable." }, { status: 403 });
  return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json", "set-cookie": "nova-dev-session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0" } });
}
