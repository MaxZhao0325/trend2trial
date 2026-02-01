import { createServer } from "node:http";
import { writeFile } from "node:fs/promises";

const PORT = 9876;

const server = createServer((_req, res) => {
  const delay = Math.floor(Math.random() * 450) + 50; // 50-500ms
  setTimeout(() => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, delay }));
  }, delay);
});

server.listen(PORT, async () => {
  await writeFile("server.pid", String(process.pid));
  console.log(`Mock server listening on http://localhost:${PORT} (pid: ${process.pid})`);
});
