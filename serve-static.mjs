import { createServer } from "node:http";
import { readFile, readdir, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const port = Number(process.env.PORT || process.argv[2] || 8000);
const root = path.dirname(fileURLToPath(import.meta.url));

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".htm", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".svg", "image/svg+xml"],
  [".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
]);

async function defaultHtmlFile() {
  const entries = await readdir(root, { withFileTypes: true });
  const html = entries.find((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".html"));
  return html?.name;
}

function sendText(response, statusCode, message) {
  response.writeHead(statusCode, { "content-type": "text/plain; charset=utf-8" });
  response.end(message);
}

createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    let requestPath = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, "");

    if (!requestPath) {
      requestPath = await defaultHtmlFile();
    }

    if (!requestPath) {
      sendText(response, 404, "No HTML file found.");
      return;
    }

    const filePath = path.resolve(root, requestPath);
    if (!filePath.startsWith(root + path.sep) && filePath !== root) {
      sendText(response, 403, "Forbidden");
      return;
    }

    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      sendText(response, 404, "Not found");
      return;
    }

    response.writeHead(200, {
      "content-type": contentTypes.get(path.extname(filePath).toLowerCase()) || "application/octet-stream",
      "content-length": fileStat.size,
    });
    createReadStream(filePath).pipe(response);
  } catch (error) {
    if (error?.code === "ENOENT") {
      sendText(response, 404, "Not found");
      return;
    }
    sendText(response, 500, "Server error");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Serving ${root}`);
  console.log(`Open http://localhost:${port}/`);
});
