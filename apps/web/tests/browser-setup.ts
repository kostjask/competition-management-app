import { createServer } from "vite";
import { fileURLToPath } from "node:url";

// Own/close Vite in-process: Windows sandboxing can prevent process-tree teardown.
export default async function setup() {
  const server = await createServer({
    root: fileURLToPath(new URL("..", import.meta.url)),
    configFile: fileURLToPath(new URL("../vite.config.ts", import.meta.url)),
    mode: "development",
    server: { host: "127.0.0.1", port: 4177, strictPort: true },
  });
  try { await server.listen(); }
  catch (error) { await server.close(); throw error; }
  return async () => { await server.close(); };
}
