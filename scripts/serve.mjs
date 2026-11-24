#!/usr/bin/env node
// Servidor estático mínimo para ver dist/ en local (sin dependencias).
//   node scripts/serve.mjs [carpeta]      PORT=3001 para cambiar el puerto
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";

const root = resolve(process.argv[2] ?? "dist");
const port = Number(process.env.PORT ?? 3000);
const types = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".png": "image/png",
  ".svg": "image/svg+xml", ".ico": "image/x-icon",
};

createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    let file = normalize(join(root, pathname));
    if (file !== root && !file.startsWith(root + sep)) return void res.writeHead(403).end("Forbidden");
    if ((await stat(file).catch(() => null))?.isDirectory()) file = join(file, "index.html");
    const body = await readFile(file);
    // no-store: en local siempre se ve la última versión, sin caché del navegador
    res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" }).end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("Not found");
  }
})
  .on("error", (error) => {
    console.error(error.code === "EADDRINUSE" ? `El puerto ${port} está ocupado. Prueba: PORT=3001 npm start` : error.message);
    process.exit(1);
  })
  .listen(port, () => console.log(`\nWeb lista en http://localhost:${port}  (Ctrl+C para parar)\n`));
