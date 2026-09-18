const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT) || 3000;
const DERIV_APP_ID =
  process.env.DERIV_APP_ID || "34qpgcq22ebRi5fTv1UsH";

const PUBLIC_DIR = path.join(__dirname, "public");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function send(res, status, contentType, body) {
  res.writeHead(status, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
  });

  res.end(body);
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      send(
        res,
        404,
        "text/plain; charset=utf-8",
        "File not found: " + path.basename(filePath)
      );
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType =
      MIME_TYPES[ext] || "application/octet-stream";

    send(res, 200, contentType, data);
  });
}

const server = http.createServer((req, res) => {
  try {
    const requestUrl = new URL(
      req.url,
      `http://${req.headers.host || "localhost"}`
    );

    const pathname = decodeURIComponent(requestUrl.pathname);

    // Server health check
    if (pathname === "/api/health") {
      send(
        res,
        200,
        "application/json; charset=utf-8",
        JSON.stringify({
          ok: true,
          app: "deriv-ai-trading-platform",
          derivAppIdConfigured: Boolean(DERIV_APP_ID),
          time: new Date().toISOString(),
        })
      );
      return;
    }

    // Public configuration for the browser
    if (pathname === "/config.js") {
      const config = `window.DERIV_CONFIG = ${JSON.stringify({
        APP_ID: DERIV_APP_ID,
        APP_NAME: "deriv-ai-trading-platform",
        ENVIRONMENT: "production",
      })};`;

      send(
        res,
        200,
        "application/javascript; charset=utf-8",
        config
      );
      return;
    }

    // Main page
    if (pathname === "/") {
      const analysisPage = path.join(
        PUBLIC_DIR,
        "analysis.html"
      );

      if (fs.existsSync(analysisPage)) {
        serveFile(res, analysisPage);
      } else {
        send(
          res,
          200,
          "text/html; charset=utf-8",
          `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Deriv AI Trading Platform</title>
</head>
<body>
  <h1>Deriv AI Trading Platform</h1>
  <p>Server is running successfully.</p>
  <p>Next: add the analysis page.</p>
</body>
</html>`
        );
      }

      return;
    }

    // Serve files from public/
    const relativePath = pathname.replace(/^\/+/, "");
    const filePath = path.normalize(
      path.join(PUBLIC_DIR, relativePath)
    );

    // Prevent access outside public/
    const relativeToPublic = path.relative(
      PUBLIC_DIR,
      filePath
    );

    if (
      relativeToPublic.startsWith("..") ||
      path.isAbsolute(relativeToPublic)
    ) {
      send(
        res,
        403,
        "text/plain; charset=utf-8",
        "Forbidden"
      );
      return;
    }

    if (
      fs.existsSync(filePath) &&
      fs.statSync(filePath).isFile()
    ) {
      serveFile(res, filePath);
      return;
    }

    send(
      res,
      404,
      "text/plain; charset=utf-8",
      "Page not found"
    );
  } catch (error) {
    console.error(error);

    send(
      res,
      500,
      "text/plain; charset=utf-8",
      "Internal server error"
    );
  }
});

server.listen(PORT, () => {
  console.log("========================================");
  console.log("Deriv AI Trading Platform");
  console.log("========================================");
  console.log(`Server running on port ${PORT}`);
  console.log(`Deriv App ID: ${DERIV_APP_ID}`);
  console.log(`Open: http://localhost:${PORT}`);
  console.log("========================================");
});
