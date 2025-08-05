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
      Referer: "http://webtv-new.iptvsmarters.com/",
      Origin: "http://webtv-new.iptvsmarters.com",
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
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

    if (targetUrl.endsWith(".m3u8")) {
      let body = await response.text();

      // Reescreve URLs absolutas
      body = body.replace(
        /https?:\/\/[^\s"']+\.(ts|m3u8)(\?[^\s"']*)?/gi,
        (match) => `/proxy?url=${encodeURIComponent(match)}`
      );

      // Reescreve URLs relativas
      body = body.replace(
        /^(?!#)([^:\s][^\s"']+\.(ts|m3u8)(\?[^\s"']*)?)$/gmi,
        (match) => {
          const absoluteUrl = new URL(match, targetUrl).toString();
          return `/proxy?url=${encodeURIComponent(absoluteUrl)}`;
        }
      );

      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      return res.status(200).send(body);
    }

    // TS puro
    if (contentType.includes("video/MP2T") || targetUrl.endsWith(".ts")) {
      res.setHeader("Content-Type", "video/MP2T");
      return res.status(200).send(Buffer.from(await response.arrayBuffer()));
    }

    // fallback
    res.setHeader("Content-Type", contentType);
    return res.status(200).send(await response.buffer());
  } catch (err) {
    console.error(err);
    return res.status(500).send("Erro interno no proxy");
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
