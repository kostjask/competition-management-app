/// <reference types="vite/client" />
import { createServer } from "vite";
import { fileURLToPath } from "node:url";

// Own/close Vite in-process: Windows sandboxing can prevent process-tree teardown.
export default async function setup() {
  const server = await createServer({
    root: fileURLToPath(new URL("..", import.meta.url)),
    configFile: fileURLToPath(new URL("../vite.config.ts", import.meta.url)),
    mode: "development",
    // Keep synthetic browser tests independent of ignored local API settings.
    define: { "import.meta.env.VITE_API_URL": JSON.stringify("/api/v1") },
    plugins: [{ name: "synthetic-api-fallback", configureServer(vite) {
      // Page-level mocks own API behavior; never fall through to an ambient dev API.
      vite.middlewares.use("/api/v1", (_req, res) => {
        res.statusCode = 401; res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ code: "UNAUTHORIZED", reason: "authenticationRequired", params: {}, issues: [] }));
      });
    } }],
    server: { host: "127.0.0.1", port: 4177, strictPort: true },
  });
  try { await server.listen(); }
  catch (error) { await server.close(); throw error; }
  return async () => { await server.close(); };
}
