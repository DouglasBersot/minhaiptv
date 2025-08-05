import express from "express";
import fetch from "node-fetch";
import http from "http";
import https from "https";

const app = express();
const PORT = process.env.PORT || 3000;

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
      Referer: targetUrl,
      Origin: new URL(targetUrl).origin,
      Accept: "*/*",
    };

    const response = await fetch(targetUrl, {
      headers,
      agent: agent(targetUrl),
    });

    if (!response.ok) {
      return res
        .status(response.status)
        .send(`Erro ao buscar URL: ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";

    // 🔒 CORS + No Cache
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    // 🎯 Reescreve playlist M3U8
    if (targetUrl.endsWith(".m3u8")) {
      let body = await response.text();
      const base = new URL(targetUrl);

      // 1. URLs relativas (ex: /hls/xxxx.ts?token=...)
      body = body.replace(
        /^(\/[^\s"']+\.(ts|m3u8)(\?[^\s"']*)?)$/gmi,
        (match) => {
          const absoluteUrl = `${base.origin}${match}`;
          return `/proxy?url=${encodeURIComponent(absoluteUrl)}`;
        }
      );

      // 2. URLs absolutas (só por precaução)
      body = body.replace(
        /https?:\/\/[^\s"']+\.(ts|m3u8)(\?[^\s"']*)?/gi,
        (match) => `/proxy?url=${encodeURIComponent(match)}`
      );

      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      return res.status(200).send(body);
    }

    // 🎞️ Segmentos .ts puros
    if (contentType.includes("video/MP2T") || targetUrl.endsWith(".ts")) {
      res.setHeader("Content-Type", "video/MP2T");
      return res.status(200).send(Buffer.from(await response.arrayBuffer()));
    }

    // 📦 Fallback genérico
    res.setHeader("Content-Type", contentType);
    return res.status(200).send(await response.buffer());
  } catch (err) {
    console.error("Erro interno no proxy:", err);
    return res.status(500).send("Erro interno no proxy");
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
