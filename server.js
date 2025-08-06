import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// 🔁 Trata requisições pré-flight (CORS OPTIONS)
app.options("/proxy", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.sendStatus(200);
});

// 🎯 Proxy principal
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

    // Libera CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

    // Repassa headers da resposta original (evita sobrescrever CORS)
    response.headers.forEach((value, key) => {
      if (!["access-control-allow-origin", "access-control-allow-headers", "access-control-allow-methods"].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    response.body.pipe(res);
  } catch (err) {
    console.error("Erro interno:", err);
    res.status(500).send("Erro interno");
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
