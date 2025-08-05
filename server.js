// server.js (Railway)
app.get("/proxy", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send("URL não informada");

  try {
    const headers = {
      "User-Agent": "...",
      Referer: targetUrl,
      Origin: new URL(targetUrl).origin,
      Accept: "*/*",
    };

    const response = await fetch(targetUrl, { headers });
    if (!response.ok) return res.status(response.status).send("Erro ao buscar");

    // Repasse direto, sem reescrita
    response.headers.forEach((v, k) => res.setHeader(k, v));
    response.body.pipe(res);
  } catch {
    res.status(500).send("Erro interno");
  }
});
