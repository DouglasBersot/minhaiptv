import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/proxy", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send("URL não informada");

  try {
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
      Referer: targetUrl,
      Origin: new URL(targetUrl).origin,
      Accept: "*/*",
    };

    const response = await fetch(targetUrl, { headers });

    if (!response.ok) return res.status(response.status).send("Erro ao buscar");

    // Repasse direto, sem reescrita
    response.headers.forEach((value, key) => res.setHeader(key, value));
    response.body.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro interno");
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
