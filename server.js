import express from "express";
import fetch from "node-fetch";
import http from "http";
import https from "https";

const app = express();
const PORT = process.env.PORT || 3000;

// Agente com keep-alive
const agent = (url) =>
  url.startsWith("https")
    ? new https.Agent({ keepAlive: true })
    : new http.Agent({ keepAlive: true });

app.get("/proxy", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send("URL não informada");

  try {
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0",
      Referer: "http://webtv-new.iptvsmarters.com/",
      Origin: "http://webtv-new.iptvsmarters.com",
      Accept: "*/*",
    };

    const isM3U8 = targetUrl.endsWith(".m3u8");

    const response = await fetch(targetUrl, {
      headers,
      agent: agent(targetUrl),
    });

    if (!response.ok) {
      return res
        .status(response.status)
        .send(`Erro ao buscar URL: ${response.status}`);
    }

    if (isM3U8) {
      let body = await response.text();

      // Substitui URLs absolutas por proxy
      body = body.replace(
        /https?:\/\/[^\s"']+\.(ts|m3u8)(\?[^\s"']*)?/gi,
        (match) => `/proxy?url=${encodeURIComponent(match)}`
      );

      // Substitui URLs relativas sem quebrar a playlist
      body = body.replace(
        /^(?!#)([^:\s][^\s"']+\.(ts|m3u8)(\?[^\s"']*)?)$/gmi,
        (match) => {
          const absoluteUrl = new URL(match, targetUrl).toString();
          return `/proxy?url=${encodeURIComponent(absoluteUrl)}`;
        }
      );

      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      return res.status(200).send(body);
    }

    // Resposta para arquivos .ts
    const buffer = await response.arrayBuffer();

    res.setHeader("Content-Type", "video/MP2T");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    return res.status(200).send(Buffer.from(buffer));
  } catch (err) {
    console.error(err);
    return res.status(500).send("Erro interno no proxy");
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
