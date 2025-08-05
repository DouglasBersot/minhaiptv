import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// Proxy básico para requisições .m3u8 e .ts
app.get("/proxy", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send("URL não informada");

  try {
    // Cabeçalhos para simular navegador e origem válida
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0",
      Referer: "http://webtv-new.iptvsmarters.com/",
      Origin: "http://webtv-new.iptvsmarters.com",
      Accept: "*/*",
    };

    const response = await fetch(targetUrl, { headers });

    if (!response.ok)
      return res
        .status(response.status)
        .send(`Erro ao buscar URL: ${response.status}`);

    // Para .m3u8, podemos ajustar URLs das ts para passar pelo proxy
    if (targetUrl.endsWith(".m3u8")) {
      let body = await response.text();

      // Substitui links .ts e .m3u8 dentro do playlist para passar pelo proxy
      // Corrige URLs absolutas (http/https)
      body = body.replace(
        /((?:https?):\/\/[^\s'"()]+?\.(?:ts|m3u8)(\?[^\s'"()]*)?)/g,
        (match) => `/proxy?url=${encodeURIComponent(match)}`
      );
      
      // Corrige URLs relativas ou root-based
      body = body.replace(
        /^(?!#)(.*?\.(ts|m3u8)(\?[^\s'"()]*)?)$/gm,
        (match) => {
          const newUrl = new URL(match, targetUrl).toString();
          return `/proxy?url=${encodeURIComponent(newUrl)}`;
        }
      );

      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      return res.status(200).send(body);
    }

    // Para .ts retorna o buffer puro com headers
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
